# Org Analytics — Design Spec

## Problem

Org reps have no visibility into how their profile is performing. They can see total raised and donor count, but they can't tell how many people are discovering them, clicking through to their profile, or whether activity is growing or declining.

## Goal

Track card clicks and profile views per org. Surface these alongside donation counts in the org dashboard with a time-range selector so reps can see performance over any period.

---

## Changes

### 1. Database — `org_events` table

```sql
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
create policy "Public insert"
  on org_events for insert
  with check (true);

-- Orgs can only read their own events (via owner_user_id match)
create policy "Org owners can read their own events"
  on org_events for select
  using (
    org_id in (
      select id from organizations where owner_user_id = auth.uid()
    )
  );
```

No user ID is stored — events are anonymous. The index on `(org_id, created_at desc)` makes time-range queries fast.

---

### 2. Track API — `POST /api/org/[orgId]/track`

**File:** `app/api/org/[orgId]/track/route.ts` (new file)

**Request body:**
```typescript
{ event_type: "card_click" | "profile_view" }
```

**Logic:**
1. Validate `event_type` is one of the two allowed values; return 400 otherwise
2. If the requester is authenticated, check whether they are the org owner or an admin — if so, return 200 without inserting (don't inflate own stats)
3. Insert a row into `org_events` with `org_id` from the URL param and the provided `event_type`
4. Return `{ ok: true }` — response is ignored by the client

Uses the Supabase server client (cookie-based). The insert uses the service role client to bypass RLS on write (the public insert policy handles this, but service role avoids any edge cases).

**Rate limiting:** Use `checkRateLimit` from `lib/rateLimit.ts` (same pattern as `app/api/org/autofill-profile/route.ts`): `checkRateLimit(ip, "org-track", 60, 60 * 1000)` — 60 events per IP per minute.

---

### 3. Card Click Tracking — `app/discover/DiscoverClient.tsx`

Wrap OrgCard's navigation in a click handler that fires the track call before following the link.

Add a `handleCardClick` function:
```typescript
async function handleCardClick(orgId: string) {
  fetch(`/api/org/${orgId}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: "card_click" }),
  }).catch(() => {}); // fire-and-forget, never block navigation
}
```

Pass `onCardClick={() => handleCardClick(org.id)}` to OrgCard as an optional new prop. OrgCard calls it from the Link's `onClick` — navigation still proceeds immediately.

**New prop on OrgCard:**
```typescript
onCardClick?: () => void;
```

Called in the Link's `onClick`: `onClick={() => onCardClick?.()}`. Does not `preventDefault` — navigation is not blocked.

---

### 4. Profile View Tracking — `app/org/[id]/page.tsx`

The org profile page is a server component. Tracking needs to happen client-side (to access the session and determine whether to skip). Extract a small `ProfileViewTracker` client component:

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

Render `<ProfileViewTracker orgId={org.id} />` near the top of the org profile page output. The server-side owner/admin check in the API handles deduplication — this component always fires, the API decides whether to record it.

---

### 5. Org Dashboard — Analytics Section

**File:** `app/org/dashboard/page.tsx`

Add a new "Analytics" section above the recent donations list.

**Time range options:** `24h | 7d | 30d | 90d | All time`

Client-side state: `const [range, setRange] = useState<"24h" | "7d" | "30d" | "90d" | "all">("7d")`

**Data fetching:** On mount and on range change, query:
1. `org_events` filtered by `org_id` and `created_at >= startDate` — count `card_click` and `profile_view` rows separately
2. `donations` filtered by `org_id` and `created_at >= startDate` — count rows for donation count
3. Repeat both queries for the equivalent prior period (same duration, ending at `startDate`) to compute period-over-period delta

**Display:** Three stat cards in a row (or 2-col on mobile):

| Stat | Icon | Value | Delta |
|---|---|---|---|
| Card Clicks | `MousePointerClick` | N | +X vs prior period |
| Profile Views | `Eye` | N | +X vs prior period |
| Donations | `Heart` | N | +X vs prior period |

Delta display: green `+N` if positive, gray `0` if flat, red `-N` if negative. "All time" range shows no delta (no prior period to compare).

**Loading state:** Show skeleton placeholders while fetching.

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/YYYYMMDD_org_events.sql` | New `org_events` table with RLS and index |
| `lib/database.types.ts` | Add `org_events` table type definition |
| `app/api/org/[orgId]/track/route.ts` | New POST handler |
| `components/OrgCard.tsx` | Add optional `onCardClick?` prop |
| `app/discover/DiscoverClient.tsx` | Wire `handleCardClick` → `onCardClick` on each OrgCard |
| `components/ProfileViewTracker.tsx` | New client component, fire-and-forget on mount |
| `app/org/[id]/page.tsx` | Render `<ProfileViewTracker>` |
| `app/org/dashboard/page.tsx` | Add Analytics section with time range selector and 3 stat cards |

---

## Error Cases

| Scenario | Handling |
|---|---|
| Track API called with invalid event_type | 400, no insert |
| Org owner views own profile | API detects owner, returns 200 without inserting |
| Admin views profile | API detects admin, returns 200 without inserting |
| Track call fails (network error) | Fire-and-forget — silently ignored, never blocks UI |
| Analytics query fails | Dashboard shows `—` in place of numbers, no error state shown |

---

## Preserved Behaviors

- OrgCard navigation is unchanged — `onCardClick` is optional and does not block the link
- Org dashboard existing stats (raised, donors, recent donations) unchanged
- No personally identifiable data stored in `org_events`

---

## Out of Scope

- Charts / graphs (numbers + delta only for now)
- Referrer tracking (where clicks came from)
- Unique visitor deduplication (counts are raw event counts, not uniques)
- Admin-level cross-org analytics dashboard
