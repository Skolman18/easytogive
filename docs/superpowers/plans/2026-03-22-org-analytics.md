# Org Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track card clicks and profile views per org, then surface them alongside donation counts in the org dashboard with a 24h/7d/30d/90d/All time selector and period-over-period deltas.

**Architecture:** A new `org_events` table stores anonymous events. A single POST API endpoint inserts events (skipping org owners and admins). Two client-side integrations fire the API — OrgCard on click and a small ProfileViewTracker component on mount. The org dashboard gains an Analytics section that queries `org_events` and `donations` filtered by time range.

**Tech Stack:** Supabase (Postgres + RLS), Next.js 16 App Router, TypeScript, Tailwind CSS, `lib/rateLimit.ts`, `lib/supabase-admin.ts` (service role), `lib/supabase-server.ts` (cookie auth).

**Spec:** `docs/superpowers/specs/2026-03-22-org-analytics-design.md`

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/20260322000001_org_events.sql` | Create `org_events` table, index, RLS |
| `lib/database.types.ts` | Add `org_events` table type |
| `app/api/org/[orgId]/track/route.ts` | New POST handler |
| `components/OrgCard.tsx` | Add optional `onCardClick?` prop |
| `app/discover/DiscoverClient.tsx` | Wire `handleCardClick` into each OrgCard |
| `components/ProfileViewTracker.tsx` | New fire-and-forget client component |
| `app/org/[id]/page.tsx` | Render `<ProfileViewTracker>` |
| `app/org/dashboard/page.tsx` | Add Analytics section with range selector + stat cards |

---

### Task 1: Database migration — `org_events` table

**Files:**
- Create: `supabase/migrations/20260322000001_org_events.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260322000001_org_events.sql

create table org_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  event_type text not null check (event_type in ('card_click', 'profile_view')),
  created_at timestamptz not null default now()
);

create index org_events_org_id_created_at_idx
  on org_events (org_id, created_at desc);

alter table org_events enable row level security;

-- Anyone can insert (anonymous tracking)
create policy "Public insert on org_events"
  on org_events for insert
  with check (true);

-- Org owners can only read their own org's events
create policy "Org owners can read their own events"
  on org_events for select
  using (
    org_id in (
      select id from organizations where owner_user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply the migration**

```bash
cd /Users/sethmitzel/easytogive && npx supabase db push
```

Expected: migration applied with no errors. If Supabase CLI is not linked, apply the SQL directly in the Supabase dashboard SQL editor.

- [ ] **Step 3: Verify table exists**

In Supabase dashboard → Table Editor, confirm `org_events` table is present with columns: `id`, `org_id`, `event_type`, `created_at`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260322000001_org_events.sql
git commit -m "feat: add org_events table for analytics tracking"
```

---

### Task 2: Add `org_events` type to `lib/database.types.ts`

**Files:**
- Modify: `lib/database.types.ts`

The file has a `Database` type with a `public.Tables` section. Add `org_events` alongside the other tables.

- [ ] **Step 1: Read the existing types file structure**

Read `lib/database.types.ts` to find where the tables are defined (look for the `Tables:` key inside `public:`).

- [ ] **Step 2: Add the `org_events` table type**

Inside the `Tables:` object, add:

```typescript
org_events: {
  Row: {
    id: string;
    org_id: string;
    event_type: "card_click" | "profile_view";
    created_at: string;
  };
  Insert: {
    id?: string;
    org_id: string;
    event_type: "card_click" | "profile_view";
    created_at?: string;
  };
  Update: {
    id?: string;
    org_id?: string;
    event_type?: "card_click" | "profile_view";
    created_at?: string;
  };
};
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/sethmitzel/easytogive && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add lib/database.types.ts
git commit -m "feat: add org_events type to database.types.ts"
```

---

### Task 3: Track API endpoint

**Files:**
- Create: `app/api/org/[orgId]/track/route.ts`

This endpoint accepts `POST` with `{ event_type }` in the body. It skips insertion if the requester is the org owner or an admin, then inserts into `org_events`.

Pattern reference:
- Rate limiting: `app/api/org/autofill-profile/route.ts` — `checkRateLimit(identifier, action, maxRequests, windowMs)`
- Service role client: `lib/supabase-admin.ts` — `import { createClient } from "@/lib/supabase-admin"`
- Cookie auth client: `lib/supabase-server.ts` — `import { createClient as createServerClient } from "@/lib/supabase-server"`
- Admin check: `import { ADMIN_EMAIL } from "@/lib/admin"` then `user.email === ADMIN_EMAIL`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p /Users/sethmitzel/easytogive/app/api/org/\[orgId\]/track
```

- [ ] **Step 2: Write the route**

```typescript
// app/api/org/[orgId]/track/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL } from "@/lib/admin";

const VALID_EVENTS = ["card_click", "profile_view"] as const;
type EventType = (typeof VALID_EVENTS)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = checkRateLimit(ip, "org-track", 60, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Validate event_type
  let event_type: EventType;
  try {
    const body = await req.json();
    if (!VALID_EVENTS.includes(body.event_type)) {
      return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
    }
    event_type = body.event_type;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { orgId } = params;

  // Skip if org owner or admin
  try {
    const supabaseAuth = await createServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (user) {
      if (user.email === ADMIN_EMAIL) return NextResponse.json({ ok: true });
      // Check if viewer owns this org
      const { data: org } = await (supabaseAuth as any)
        .from("organizations")
        .select("owner_user_id")
        .eq("id", orgId)
        .single();
      if (org?.owner_user_id === user.id) return NextResponse.json({ ok: true });
    }
  } catch {
    // If auth check fails, proceed with insert
  }

  // Insert event using service role client (bypasses RLS)
  const supabase = getSupabaseAdmin();
  await (supabase as any)
    .from("org_events")
    .insert({ org_id: orgId, event_type });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/sethmitzel/easytogive && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/org/\[orgId\]/track/route.ts
git commit -m "feat: add org event tracking API endpoint"
```

---

### Task 4: OrgCard — add `onCardClick` prop

**Files:**
- Modify: `components/OrgCard.tsx`

The current props interface (lines 18-22) is:
```typescript
interface OrgCardProps {
  org: Organization;
  compact?: boolean;
  displaySettings?: OrgDisplaySettings;
}
```

The Link is at line 110: `<Link href={`/org/${org.id}`} className="flex-1 flex flex-col">`

- [ ] **Step 1: Add the prop to the interface**

Find:
```typescript
interface OrgCardProps {
  org: Organization;
  compact?: boolean;
  displaySettings?: OrgDisplaySettings;
}
```

Replace with:
```typescript
interface OrgCardProps {
  org: Organization;
  compact?: boolean;
  displaySettings?: OrgDisplaySettings;
  onCardClick?: () => void;
}
```

- [ ] **Step 2: Destructure the new prop**

Find:
```typescript
export default function OrgCard({
  org,
  compact = false,
  displaySettings,
}: OrgCardProps) {
```

Replace with:
```typescript
export default function OrgCard({
  org,
  compact = false,
  displaySettings,
  onCardClick,
}: OrgCardProps) {
```

- [ ] **Step 3: Wire prop into the Link's onClick**

Find:
```typescript
      <Link href={`/org/${org.id}`} className="flex-1 flex flex-col">
```

Replace with:
```typescript
      <Link href={`/org/${org.id}`} className="flex-1 flex flex-col" onClick={() => onCardClick?.()}>
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/sethmitzel/easytogive && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add components/OrgCard.tsx
git commit -m "feat: add onCardClick prop to OrgCard"
```

---

### Task 5: Wire card click tracking in DiscoverClient

**Files:**
- Modify: `app/discover/DiscoverClient.tsx`

The OrgCard is rendered at lines 384-390:
```typescript
<OrgCard
  key={org.id}
  org={org}
  displaySettings={displaySettingsMap?.[org.id]}
/>
```

- [ ] **Step 1: Add the handleCardClick function**

Find the component function body (look for `export default function DiscoverClient`). Add this function inside the component, before the return statement:

```typescript
function handleCardClick(orgId: string) {
  fetch(`/api/org/${orgId}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: "card_click" }),
  }).catch(() => {});
}
```

- [ ] **Step 2: Pass onCardClick to each OrgCard**

Find:
```typescript
              <OrgCard
                key={org.id}
                org={org}
                displaySettings={displaySettingsMap?.[org.id]}
              />
```

Replace with:
```typescript
              <OrgCard
                key={org.id}
                org={org}
                displaySettings={displaySettingsMap?.[org.id]}
                onCardClick={() => handleCardClick(org.id)}
              />
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/sethmitzel/easytogive && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/discover/DiscoverClient.tsx
git commit -m "feat: fire card_click event on OrgCard navigation"
```

---

### Task 6: ProfileViewTracker component

**Files:**
- Create: `components/ProfileViewTracker.tsx`
- Modify: `app/org/[id]/page.tsx`

- [ ] **Step 1: Create ProfileViewTracker**

```typescript
// components/ProfileViewTracker.tsx
"use client";

import { useEffect } from "react";

export default function ProfileViewTracker({ orgId }: { orgId: string }) {
  useEffect(() => {
    fetch(`/api/org/${orgId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "profile_view" }),
    }).catch(() => {});
  }, [orgId]);
  return null;
}
```

- [ ] **Step 2: Import and render in org profile page**

In `app/org/[id]/page.tsx`, add the import after the existing imports:

```typescript
import ProfileViewTracker from "@/components/ProfileViewTracker";
```

Find the opening of the page return (line 221-222):
```typescript
  return (
    <div style={{ backgroundColor: "#faf9f6" }}>
```

Add `<ProfileViewTracker>` as the first child:
```typescript
  return (
    <div style={{ backgroundColor: "#faf9f6" }}>
      <ProfileViewTracker orgId={org.id} />
```

(The `org` variable is the fetched org object already available in scope at this point in the file.)

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/sethmitzel/easytogive && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/ProfileViewTracker.tsx app/org/\[id\]/page.tsx
git commit -m "feat: track profile views via ProfileViewTracker component"
```

---

### Task 7: Analytics section in org dashboard

**Files:**
- Modify: `app/org/dashboard/page.tsx`

The existing donation stats grid is at line 586. The analytics section goes above it (before "Donation Stats"). The dashboard already uses `createClient()` (Supabase browser client) and the `useEffect` + `useState` pattern. The `selectedOrg` variable holds the current org with `.id`.

- [ ] **Step 1: Add analytics state and types**

Near the top of the `DashboardInner` component (after existing `useState` declarations), add:

```typescript
type AnalyticsRange = "24h" | "7d" | "30d" | "90d" | "all";

interface AnalyticsData {
  cardClicks: number;
  profileViews: number;
  donations: number;
  prevCardClicks: number;
  prevProfileViews: number;
  prevDonations: number;
}

const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("7d");
const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
const [analyticsLoading, setAnalyticsLoading] = useState(false);
```

- [ ] **Step 2: Add the loadAnalytics function**

Add this function alongside `loadOrgStats` and `loadImpactUpdates`:

```typescript
async function loadAnalytics(orgId: string, range: AnalyticsRange) {
  setAnalyticsLoading(true);
  try {
    const supabase = createClient() as any;
    const now = new Date();

    const msMap: Record<AnalyticsRange, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
      "all": 0,
    };

    const periodMs = msMap[range];
    const currentStart = range === "all" ? null : new Date(now.getTime() - periodMs).toISOString();
    const prevStart = range === "all" ? null : new Date(now.getTime() - periodMs * 2).toISOString();
    const prevEnd = currentStart;

    // Current period events
    let eventsQuery = supabase
      .from("org_events")
      .select("event_type")
      .eq("org_id", orgId);
    if (currentStart) eventsQuery = eventsQuery.gte("created_at", currentStart);
    const { data: events } = await eventsQuery;

    // Previous period events (skip for "all")
    let prevEvents: { event_type: string }[] = [];
    if (range !== "all" && prevStart && prevEnd) {
      const { data } = await supabase
        .from("org_events")
        .select("event_type")
        .eq("org_id", orgId)
        .gte("created_at", prevStart)
        .lt("created_at", prevEnd);
      prevEvents = data ?? [];
    }

    // Current period donations
    let donationsQuery = supabase
      .from("donations")
      .select("id")
      .eq("org_id", orgId);
    if (currentStart) donationsQuery = donationsQuery.gte("donated_at", currentStart);
    const { data: donations } = await donationsQuery;

    // Previous period donations
    let prevDonationCount = 0;
    if (range !== "all" && prevStart && prevEnd) {
      const { data } = await supabase
        .from("donations")
        .select("id")
        .eq("org_id", orgId)
        .gte("donated_at", prevStart)
        .lt("donated_at", prevEnd);
      prevDonationCount = data?.length ?? 0;
    }

    const cardClicks = (events ?? []).filter((e: any) => e.event_type === "card_click").length;
    const profileViews = (events ?? []).filter((e: any) => e.event_type === "profile_view").length;
    const prevCardClicks = prevEvents.filter((e) => e.event_type === "card_click").length;
    const prevProfileViews = prevEvents.filter((e) => e.event_type === "profile_view").length;

    setAnalytics({
      cardClicks,
      profileViews,
      donations: donations?.length ?? 0,
      prevCardClicks,
      prevProfileViews,
      prevDonations: prevDonationCount,
    });
  } catch (err) {
    console.error("loadAnalytics failed:", err);
  }
  setAnalyticsLoading(false);
}
```

- [ ] **Step 3: Trigger loadAnalytics on org change and range change**

In the existing `useEffect` that watches `selectedOrg?.id` (around line 163-169), add a call to `loadAnalytics`:

```typescript
useEffect(() => {
  if (selectedOrg) {
    setOrgStats(null);
    setAnalytics(null);
    loadOrgStats(createClient() as any, selectedOrg.id);
    loadImpactUpdates(selectedOrg.id);
    loadAnalytics(selectedOrg.id, analyticsRange);
  }
}, [selectedOrg?.id]); // eslint-disable-line
```

Add a separate `useEffect` for range changes:

```typescript
useEffect(() => {
  if (selectedOrg) {
    loadAnalytics(selectedOrg.id, analyticsRange);
  }
}, [analyticsRange]); // eslint-disable-line
```

- [ ] **Step 4: Add the Analytics section JSX**

Add the new icons to the existing lucide import in the file:
```typescript
import { MousePointerClick, Eye, BarChart2 } from "lucide-react";
```

Note: `DollarSign` is already imported. `MousePointerClick`, `Eye`, and `BarChart2` are new — add them to the existing lucide import line.

Find the "Donation Stats" comment (around line 585):
```typescript
        {/* Donation Stats */}
```

Insert the Analytics section immediately before it:

```typescript
        {/* Analytics */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-gray-500" />
              <h2 className="font-display text-gray-900">Analytics</h2>
            </div>
            <div className="flex items-center gap-1">
              {(["24h", "7d", "30d", "90d", "all"] as AnalyticsRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setAnalyticsRange(r)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors min-h-[32px]"
                  style={{
                    backgroundColor: analyticsRange === r ? "#1a7a4a" : "transparent",
                    color: analyticsRange === r ? "white" : "#5c5b56",
                  }}
                >
                  {r === "all" ? "All time" : r}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6">
            {analyticsLoading || !analytics ? (
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl border p-4 animate-pulse" style={{ borderColor: "#e5e1d8" }}>
                    <div className="h-6 w-16 rounded bg-gray-100 mb-1.5" />
                    <div className="h-3 w-20 rounded bg-gray-100 mb-1" />
                    <div className="h-3 w-12 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: "Card Clicks",
                    icon: <MousePointerClick className="w-4 h-4 text-gray-400" />,
                    value: analytics.cardClicks,
                    prev: analytics.prevCardClicks,
                  },
                  {
                    label: "Profile Views",
                    icon: <Eye className="w-4 h-4 text-gray-400" />,
                    value: analytics.profileViews,
                    prev: analytics.prevProfileViews,
                  },
                  {
                    label: "Donations",
                    icon: <DollarSign className="w-4 h-4 text-gray-400" />,
                    value: analytics.donations,
                    prev: analytics.prevDonations,
                  },
                ].map((stat) => {
                  const delta = stat.value - stat.prev;
                  const showDelta = analyticsRange !== "all";
                  return (
                    <div key={stat.label} className="rounded-xl border p-4" style={{ borderColor: "#e5e1d8" }}>
                      <div className="flex items-center gap-1.5 mb-1">{stat.icon}</div>
                      <div className="font-display text-2xl text-gray-900">{stat.value.toLocaleString()}</div>
                      <div className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</div>
                      {showDelta && (
                        <div
                          className="text-xs font-medium mt-1"
                          style={{
                            color: delta > 0 ? "#1a7a4a" : delta < 0 ? "#dc2626" : "#9b9990",
                          }}
                        >
                          {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "0"} vs prior period
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

```

Note: `DollarSign` is already imported in this file. `MousePointerClick`, `Eye`, and `BarChart2` must be added to the existing lucide import (done in Step 4 above).

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/sethmitzel/easytogive && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add app/org/dashboard/page.tsx
git commit -m "feat: add analytics section to org dashboard"
```

---

### Task 8: Build verification

**Files:** None.

- [ ] **Step 1: Full build**

```bash
cd /Users/sethmitzel/easytogive && npm run build 2>&1 | tail -20
```

Expected: clean output ending in the route table, no errors.

- [ ] **Step 2: Manual smoke test**

1. Go to `/discover` — click an org card. In Supabase dashboard → Table Editor → `org_events`, confirm a `card_click` row was inserted.
2. Visit an org's profile page `/org/[id]`. Confirm a `profile_view` row was inserted.
3. Log in as the org owner, visit your own profile — confirm **no** new row is inserted.
4. Log in to the org dashboard. Confirm the Analytics section appears with the range selector. Change ranges — confirm counts update.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: org analytics — card clicks, profile views, dashboard section"
```
