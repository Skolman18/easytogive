# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive admin dashboard (only for sethmitzel@gmail.com) with Overview, Users, Organizations, Transactions, and Logs tabs — replacing the current single AdminPanel component with a structured multi-tab system, plus a Stripe refund API and suspended/banned user enforcement.

**Architecture:** A new `AdminDashboard` wrapper component holds 5 top-level tabs. The existing `AdminPanel.tsx` (org management) is embedded as-is inside the Organizations tab — preserving all existing functionality with zero changes to that file. New API routes under `/api/admin/` serve all dashboard data using the Supabase admin client (`supabaseAdmin`). Suspended/banned enforcement happens at the auth callback and in the proxy middleware.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (supabase-admin for server routes, supabase-browser for client components), Stripe SDK (refunds), Tailwind CSS, Lucide icons, `lib/admin.ts` ADMIN_EMAIL constant.

---

## Critical Context

- **No test suite exists** — verification is TypeScript compilation + `npm run build` passing
- **`database.types.ts` is stale** — use `(row as any).field` for new columns until regenerated; update the types file manually in Task 1
- **Existing AdminPanel.tsx** (32KB) must NOT be modified — embed it as-is in OrgsTab
- **Admin client**: import from `@/lib/supabase-admin` (service role, bypasses RLS)
- **Auth**: All admin API routes must verify `user.email === ADMIN_EMAIL` using `supabase-server` client
- **Amounts**: `donations.amount` is stored in **cents** — divide by 100 for display
- **Donations table** has more columns than `database.types.ts` shows (webhook already inserts `stripe_payment_intent_id`, `fee_amount`, `fee_covered`, `org_name`) — cast to `any` for new columns

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `components/admin/AdminDashboard.tsx` | Root 5-tab wrapper; swaps in for AdminPanel in profile |
| `components/admin/OverviewTab.tsx` | Stats cards + recent activity feed |
| `components/admin/UsersTab.tsx` | User table with search, suspend/ban actions |
| `components/admin/OrgsTab.tsx` | Thin wrapper embedding existing AdminPanel |
| `components/admin/TransactionsTab.tsx` | Full donations table with filters + refund modal |
| `components/admin/LogsTab.tsx` | Admin action timeline |
| `components/admin/RefundModal.tsx` | 2-step refund confirmation |
| `components/admin/ConfirmModal.tsx` | Reusable confirm dialog (suspend/ban) |
| `app/api/admin/overview/route.ts` | GET: stats + recent activity |
| `app/api/admin/users/route.ts` | GET: user list; POST: suspend/ban/unsuspend |
| `app/api/admin/transactions/route.ts` | GET: donations with filters |
| `app/api/admin/refund/route.ts` | POST: issue Stripe refund |
| `app/api/admin/logs/route.ts` | GET: admin_logs table |
| `app/api/admin/orgs/route.ts` | POST: suspend/unsuspend org |
| `app/suspended/page.tsx` | Suspended user landing page |
| `app/banned/page.tsx` | Banned user landing page |

### Modified Files
| File | Change |
|------|--------|
| `lib/database.types.ts` | Add new columns to Row/Insert types; add admin_logs table |
| `app/profile/page.tsx` | Swap `<AdminPanel>` → `<AdminDashboard>` (1 line change) |
| `app/auth/callback/route.ts` | Check suspended/banned after session exchange |

---

## Task 1: Database Types + SQL Migration

**Files:**
- Modify: `lib/database.types.ts`
- Create: `docs/migrations/2026-03-18-admin-schema.sql` (SQL to paste into Supabase SQL Editor)

> **⚠️ Run the SQL in Supabase SQL Editor BEFORE writing any code that depends on new columns.**

- [ ] **Step 1: Write the migration SQL file**

Create `docs/migrations/2026-03-18-admin-schema.sql`:

```sql
-- Add suspended/banned to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text DEFAULT '';

-- Add suspended to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false;

-- Add status/refund fields to donations (stripe_payment_intent_id may already exist)
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS refund_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fee_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_covered boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS org_name text DEFAULT '';

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- RLS: admin_logs only readable by service role (no public policy)
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Run the SQL in Supabase SQL Editor**

Go to: https://supabase.com/dashboard/project/dfktfiruzulhpwcafaey/sql/new

Paste and run the SQL above. Confirm no errors.

- [ ] **Step 3: Update `lib/database.types.ts`**

Add new columns to the existing type definitions:

```typescript
// In users.Row, add:
suspended: boolean;
banned: boolean;
ban_reason: string;

// In organizations.Row, add:
suspended: boolean;

// In donations.Row, add:
status: string;
refund_amount: number;
refund_reason: string;
stripe_payment_intent_id: string;
fee_amount: number;
fee_covered: boolean;
org_name: string;

// Add new table after watchlist:
admin_logs: {
  Row: {
    id: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    details: Json;
    created_at: string;
  };
  Insert: Omit<Database["public"]["Tables"]["admin_logs"]["Row"], "id" | "created_at">;
  Update: Partial<Database["public"]["Tables"]["admin_logs"]["Insert"]>;
};

// Add convenience type at bottom:
export type AdminLogRow = Database["public"]["Tables"]["admin_logs"]["Row"];
```

- [ ] **Step 4: Verify TypeScript still compiles**

```bash
cd /Users/sethmitzel/easytogive && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 5: Commit**

```bash
git add lib/database.types.ts docs/migrations/
git commit -m "feat: add admin schema migrations and updated DB types"
```

---

## Task 2: Admin Auth Helper

**Files:**
- Create: `lib/admin-auth.ts`

A shared server-side helper that all admin API routes use to verify admin access.

- [ ] **Step 1: Create `lib/admin-auth.ts`**

```typescript
import { createClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL } from "@/lib/admin";
import { NextResponse } from "next/server";

/**
 * Verifies the request is from the admin user.
 * Returns { user } on success, or a NextResponse 401/403 to return immediately.
 */
export async function requireAdmin(): Promise<
  { user: { id: string; email: string } } | NextResponse
> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { user: { id: user.id, email: user.email! } };
}

/** Write an entry to admin_logs using the service role client. */
export async function logAdminAction(
  action: string,
  entityType: string | null,
  entityId: string | null,
  details: Record<string, unknown> = {}
) {
  const { supabaseAdmin } = await import("@/lib/supabase-admin");
  await supabaseAdmin.from("admin_logs").insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add lib/admin-auth.ts
git commit -m "feat: add admin auth helper and logAdminAction utility"
```

---

## Task 3: Overview API Route

**Files:**
- Create: `app/api/admin/overview/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  // Total users
  const { count: totalUsers } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });

  // Total organizations
  const { count: totalOrgs } = await supabaseAdmin
    .from("organizations")
    .select("*", { count: "exact", head: true });

  // Donations aggregate
  const { data: donationStats } = await supabaseAdmin
    .from("donations")
    .select("amount, donated_at, status");

  const totalDonations = donationStats?.length ?? 0;
  const totalVolumeCents = donationStats?.reduce((sum, d) => sum + (d.amount ?? 0), 0) ?? 0;
  const pendingRefunds = donationStats?.filter((d: any) => d.status === "pending_refund").length ?? 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const donationsToday = donationStats?.filter((d) => d.donated_at >= todayStart).length ?? 0;
  const donationsWeek = donationStats?.filter((d) => d.donated_at >= weekStart).length ?? 0;
  const donationsMonth = donationStats?.filter((d) => d.donated_at >= monthStart).length ?? 0;

  // Recent activity: last 10 donations with user email + org name
  const { data: recentRaw } = await supabaseAdmin
    .from("donations")
    .select("id, amount, donated_at, org_name, user_id, status")
    .order("donated_at", { ascending: false })
    .limit(10);

  // Enrich with user emails
  const recent = await Promise.all(
    (recentRaw ?? []).map(async (d: any) => {
      let email = "Guest";
      if (d.user_id) {
        const { data: u } = await supabaseAdmin
          .from("users")
          .select("email")
          .eq("id", d.user_id)
          .maybeSingle();
        email = u?.email ?? "Unknown";
      }
      return { ...d, userEmail: email };
    })
  );

  return NextResponse.json({
    stats: {
      totalUsers: totalUsers ?? 0,
      totalOrgs: totalOrgs ?? 0,
      totalDonations,
      totalVolumeCents,
      pendingRefunds,
      donationsToday,
      donationsWeek,
      donationsMonth,
    },
    recentActivity: recent,
  });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/overview/
git commit -m "feat: add admin overview API route"
```

---

## Task 4: Users API Route

**Files:**
- Create: `app/api/admin/users/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";

  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, avatar_url, created_at, suspended, banned, ban_reason")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with total donated per user
  const { data: donations } = await supabaseAdmin
    .from("donations")
    .select("user_id, amount");

  const donationsByUser: Record<string, number> = {};
  for (const d of donations ?? []) {
    if (d.user_id) {
      donationsByUser[d.user_id] = (donationsByUser[d.user_id] ?? 0) + (d.amount ?? 0);
    }
  }

  const enriched = (users ?? []).map((u: any) => ({
    ...u,
    totalDonatedCents: donationsByUser[u.id] ?? 0,
    status: u.banned ? "banned" : u.suspended ? "suspended" : "active",
  }));

  const filtered = search
    ? enriched.filter(
        (u: any) =>
          u.email?.toLowerCase().includes(search) ||
          u.full_name?.toLowerCase().includes(search)
      )
    : enriched;

  return NextResponse.json({ users: filtered });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { userId, action, banReason } = await req.json();

  if (!userId || !action) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  const validActions = ["suspend", "unsuspend", "ban", "unban"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  let update: Record<string, unknown> = {};
  if (action === "suspend") update = { suspended: true };
  if (action === "unsuspend") update = { suspended: false };
  if (action === "ban") {
    if (!banReason?.trim()) {
      return NextResponse.json({ error: "banReason is required for ban" }, { status: 400 });
    }
    update = { banned: true, ban_reason: banReason.trim(), suspended: false };
  }
  if (action === "unban") update = { banned: false, ban_reason: "" };

  const { error } = await supabaseAdmin
    .from("users")
    .update(update)
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(`user_${action}`, "user", userId, {
    action,
    banReason: banReason ?? null,
    performedBy: auth.user.email,
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/users/
git commit -m "feat: add admin users API (list, suspend, ban)"
```

---

## Task 5: Transactions API Route

**Files:**
- Create: `app/api/admin/transactions/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = 50;

  let query = supabaseAdmin
    .from("donations")
    .select(
      "id, user_id, org_id, org_name, amount, donated_at, status, refund_amount, refund_reason, stripe_payment_intent_id, receipt_id",
      { count: "exact" }
    )
    .order("donated_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq("status", status);
  if (dateFrom) query = query.gte("donated_at", dateFrom);
  if (dateTo) query = query.lte("donated_at", dateTo + "T23:59:59Z");

  const { data: donations, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with user emails
  const userIds = [...new Set((donations ?? []).map((d: any) => d.user_id).filter(Boolean))];
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .in("id", userIds.length > 0 ? userIds : ["_none_"]);

  const emailById: Record<string, string> = {};
  for (const u of users ?? []) emailById[u.id] = u.email;

  const enriched = (donations ?? []).map((d: any) => ({
    ...d,
    userEmail: d.user_id ? (emailById[d.user_id] ?? "Unknown") : "Guest",
  }));

  // Client-side search filter on email/org
  const filtered = search
    ? enriched.filter(
        (d) =>
          d.userEmail.toLowerCase().includes(search.toLowerCase()) ||
          (d.org_name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : enriched;

  return NextResponse.json({ donations: filtered, total: count ?? 0, page, pageSize });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/transactions/
git commit -m "feat: add admin transactions API with filters and pagination"
```

---

## Task 6: Refund API Route

**Files:**
- Create: `app/api/admin/refund/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { donationId, amount, reason } = await req.json();

  if (!donationId || !amount || !reason?.trim()) {
    return NextResponse.json(
      { error: "donationId, amount (cents), and reason are required" },
      { status: 400 }
    );
  }

  // Fetch the donation
  const { data: donation, error: fetchErr } = await supabaseAdmin
    .from("donations")
    .select("id, amount, stripe_payment_intent_id, status, user_id, org_name")
    .eq("id", donationId)
    .maybeSingle();

  if (fetchErr || !donation) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  const d = donation as any;

  if (d.status === "refunded") {
    return NextResponse.json({ error: "Donation already refunded" }, { status: 400 });
  }
  if (!d.stripe_payment_intent_id) {
    return NextResponse.json(
      { error: "No Stripe payment intent ID on this donation" },
      { status: 400 }
    );
  }
  if (amount > d.amount) {
    return NextResponse.json(
      { error: "Refund amount exceeds original donation" },
      { status: 400 }
    );
  }

  // Issue Stripe refund
  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: d.stripe_payment_intent_id,
      amount: amount, // cents
    });
  } catch (stripeErr: any) {
    return NextResponse.json(
      { error: `Stripe refund failed: ${stripeErr.message}` },
      { status: 500 }
    );
  }

  // Update donation in Supabase
  const newStatus = amount >= d.amount ? "refunded" : "partial_refund";
  const { error: updateErr } = await supabaseAdmin
    .from("donations")
    .update({
      status: newStatus,
      refund_amount: amount,
      refund_reason: reason.trim(),
    } as any)
    .eq("id", donationId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Log the action
  await logAdminAction("refund_issued", "donation", donationId, {
    amountCents: amount,
    reason: reason.trim(),
    stripeRefundId: refund.id,
    orgName: d.org_name,
    performedBy: auth.user.email,
  });

  console.log(`[admin/refund] Refund issued — donationId: ${donationId}, amount: ${amount}¢, stripeRefundId: ${refund.id}`);

  return NextResponse.json({ success: true, refundId: refund.id, status: newStatus });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/refund/
git commit -m "feat: add admin refund API route with Stripe integration"
```

---

## Task 7: Org Suspend API + Logs API

**Files:**
- Create: `app/api/admin/orgs/route.ts`
- Create: `app/api/admin/logs/route.ts`

- [ ] **Step 1: Create org suspend route**

Create `app/api/admin/orgs/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { orgId, action } = await req.json();

  if (!orgId || !["suspend", "unsuspend", "verify", "unverify"].includes(action)) {
    return NextResponse.json({ error: "orgId and valid action required" }, { status: 400 });
  }

  let update: Record<string, unknown> = {};
  if (action === "suspend") update = { suspended: true };
  if (action === "unsuspend") update = { suspended: false };
  if (action === "verify") update = { verified: true };
  if (action === "unverify") update = { verified: false };

  const { error } = await supabaseAdmin
    .from("organizations")
    .update(update as any)
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(`org_${action}`, "organization", orgId, {
    performedBy: auth.user.email,
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create logs route**

Create `app/api/admin/logs/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  const { data: logs, error } = await supabaseAdmin
    .from("admin_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: logs ?? [] });
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/orgs/ app/api/admin/logs/
git commit -m "feat: add admin org suspend/verify and logs API routes"
```

---

## Task 8: Shared UI Components (ConfirmModal + RefundModal)

**Files:**
- Create: `components/admin/ConfirmModal.tsx`
- Create: `components/admin/RefundModal.tsx`

- [ ] **Step 1: Create ConfirmModal**

Create `components/admin/ConfirmModal.tsx`:

```tsx
"use client";
import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  requireReason?: boolean;
  reasonLabel?: string;
  onConfirm: (reason?: string) => Promise<void>;
  onClose: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  requireReason = false,
  reasonLabel = "Reason",
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setError(`${reasonLabel} is required`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-[#111827] text-lg" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>{title}</h3>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-[#6b7280] mb-4">{message}</p>
        {requireReason && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#111827] mb-1">{reasonLabel}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border border-[#e5e1d8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
              placeholder="Enter reason..."
            />
          </div>
        )}
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#e5e1d8] text-sm text-[#6b7280] hover:bg-[#faf9f6]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create RefundModal**

Create `components/admin/RefundModal.tsx`:

```tsx
"use client";
import { useState } from "react";
import { X, CreditCard } from "lucide-react";

interface Props {
  donation: {
    id: string;
    amount: number;
    userEmail: string;
    org_name: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefundModal({ donation, onClose, onSuccess }: Props) {
  const [amountCents, setAmountCents] = useState(donation.amount);
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleProceed = () => {
    if (!reason.trim()) { setError("Reason is required"); return; }
    if (amountCents <= 0 || amountCents > donation.amount) {
      setError("Invalid refund amount"); return;
    }
    setError("");
    setStep("confirm");
  };

  const handleRefund = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationId: donation.id, amount: amountCents, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refund failed");
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const formatCents = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e8f5ee] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#1a7a4a]" />
            </div>
            <h3 className="font-semibold text-[#111827] text-lg">Issue Refund</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6b7280]" /></button>
        </div>

        {step === "form" ? (
          <>
            <div className="mb-4 p-3 bg-[#faf9f6] rounded-lg text-sm text-[#6b7280]">
              <div>Donor: <span className="text-[#111827] font-medium">{donation.userEmail}</span></div>
              <div>Organization: <span className="text-[#111827] font-medium">{donation.org_name || "Unknown"}</span></div>
              <div>Original amount: <span className="text-[#111827] font-medium">{formatCents(donation.amount)}</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111827] mb-1">Refund amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(donation.amount / 100).toFixed(2)}
                  value={(amountCents / 100).toFixed(2)}
                  onChange={(e) => setAmountCents(Math.round(parseFloat(e.target.value) * 100))}
                  className="w-full border border-[#e5e1d8] rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111827] mb-1">Reason (required)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full border border-[#e5e1d8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
                placeholder="Reason for refund..."
              />
            </div>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#e5e1d8] text-sm text-[#6b7280]">Cancel</button>
              <button onClick={handleProceed} className="px-4 py-2 rounded-lg bg-[#1a7a4a] text-white text-sm font-medium hover:bg-[#155f3a]">
                Review Refund
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <p className="font-medium mb-1">Confirm refund</p>
              <p>Refund <strong>{formatCents(amountCents)}</strong> to <strong>{donation.userEmail}</strong> for <strong>{donation.org_name}</strong>?</p>
              <p className="mt-1 text-amber-600">Reason: {reason}</p>
              <p className="mt-1 text-amber-600 text-xs">This action will immediately issue a refund through Stripe and cannot be undone.</p>
            </div>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setStep("form")} className="px-4 py-2 rounded-lg border border-[#e5e1d8] text-sm text-[#6b7280]">Back</button>
              <button onClick={handleRefund} disabled={loading} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {loading ? "Processing..." : `Refund ${formatCents(amountCents)}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/
git commit -m "feat: add ConfirmModal and RefundModal admin components"
```

---

## Task 9: OverviewTab Component

**Files:**
- Create: `components/admin/OverviewTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Users, Building2, DollarSign, TrendingUp, RefreshCw, Activity } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalOrgs: number;
  totalDonations: number;
  totalVolumeCents: number;
  pendingRefunds: number;
  donationsToday: number;
  donationsWeek: number;
  donationsMonth: number;
}

interface ActivityItem {
  id: string;
  userEmail: string;
  org_name: string;
  amount: number;
  donated_at: string;
  status: string;
}

export default function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/overview");
      const data = await res.json();
      setStats(data.stats);
      setActivity(data.recentActivity ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const statCards = stats ? [
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Organizations", value: stats.totalOrgs.toLocaleString(), icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Donations", value: stats.totalDonations.toLocaleString(), icon: Activity, color: "text-[#1a7a4a]", bg: "bg-[#e8f5ee]" },
    { label: "Total Volume", value: fmt(stats.totalVolumeCents), icon: DollarSign, color: "text-[#1a7a4a]", bg: "bg-[#e8f5ee]" },
    { label: "Pending Refunds", value: stats.pendingRefunds.toLocaleString(), icon: RefreshCw, color: "text-amber-600", bg: "bg-amber-50" },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#111827]" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>Overview</h2>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#111827]">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[#6b7280]">Loading...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white border border-[#e5e1d8] rounded-xl p-4">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="text-2xl font-bold text-[#111827] font-mono">{s.value}</div>
                <div className="text-xs text-[#6b7280] mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Donations today", value: stats.donationsToday },
                { label: "This week", value: stats.donationsWeek },
                { label: "This month", value: stats.donationsMonth },
              ].map((s) => (
                <div key={s.label} className="bg-[#faf9f6] border border-[#e5e1d8] rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-[#1a7a4a] font-mono">{s.value}</div>
                  <div className="text-xs text-[#6b7280] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recent activity */}
          <div>
            <h3 className="text-base font-semibold text-[#111827] mb-3">Recent Activity</h3>
            <div className="border border-[#e5e1d8] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#faf9f6] border-b border-[#e5e1d8]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Organization</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[#6b7280] text-sm">No recent activity</td></tr>
                  )}
                  {activity.map((a) => (
                    <tr key={a.id} className="border-b border-[#e5e1d8] last:border-0 hover:bg-[#faf9f6]">
                      <td className="px-4 py-3 text-[#111827]">{a.userEmail}</td>
                      <td className="px-4 py-3 text-[#6b7280]">{a.org_name || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#1a7a4a]">{fmt(a.amount)}</td>
                      <td className="px-4 py-3 text-right text-[#9b9990] text-xs">
                        {new Date(a.donated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/OverviewTab.tsx
git commit -m "feat: add admin OverviewTab with stats cards and activity feed"
```

---

## Task 10: UsersTab Component

**Files:**
- Create: `components/admin/UsersTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, ChevronDown, ChevronUp, Shield, Ban, RefreshCw } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  totalDonatedCents: number;
  status: "active" | "suspended" | "banned";
  ban_reason: string;
}

interface DonationRecord {
  id: string;
  org_name: string;
  amount: number;
  donated_at: string;
  status: string;
}

export default function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [userDonations, setUserDonations] = useState<Record<string, DonationRecord[]>>({});
  const [modal, setModal] = useState<{ type: string; user: AdminUser } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const loadUserDonations = async (userId: string) => {
    if (userDonations[userId]) return;
    const res = await fetch(`/api/admin/transactions?search=${userId}`);
    const data = await res.json();
    setUserDonations((prev) => ({ ...prev, [userId]: data.donations ?? [] }));
  };

  const handleAction = async (userId: string, action: string, banReason?: string) => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, banReason }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error ?? "Action failed");
    }
    await load();
  };

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-[#e8f5ee] text-[#1a7a4a]",
      suspended: "bg-amber-50 text-amber-700",
      banned: "bg-red-50 text-red-700",
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? map.active}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#111827]" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>Users</h2>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#111827]">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b9990]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="w-full pl-9 pr-4 py-2.5 border border-[#e5e1d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
        />
      </div>

      {loading ? (
        <div className="text-sm text-[#6b7280]">Loading...</div>
      ) : (
        <div className="border border-[#e5e1d8] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-[#e5e1d8]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Total Given</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#6b7280]">No users found</td></tr>
              )}
              {users.map((user) => (
                <>
                  <tr key={user.id} className="border-b border-[#e5e1d8] last:border-0 hover:bg-[#faf9f6]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#111827]">{user.full_name || "—"}</div>
                      <div className="text-xs text-[#6b7280]">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs">
                      {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#1a7a4a]">{fmt(user.totalDonatedCents)}</td>
                    <td className="px-4 py-3">{statusBadge(user.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            if (expanded === user.id) { setExpanded(null); return; }
                            setExpanded(user.id);
                            loadUserDonations(user.id);
                          }}
                          className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#111827] border border-[#e5e1d8] rounded-lg px-2 py-1.5"
                        >
                          View {expanded === user.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {user.status === "active" && (
                          <button
                            onClick={() => setModal({ type: "suspend", user })}
                            className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 hover:bg-amber-100"
                          >
                            <Shield className="w-3 h-3" /> Suspend
                          </button>
                        )}
                        {user.status === "suspended" && (
                          <button
                            onClick={() => handleAction(user.id, "unsuspend")}
                            className="text-xs text-[#1a7a4a] bg-[#e8f5ee] border border-[#bbf7d0] rounded-lg px-2 py-1.5 hover:bg-[#d1fae5]"
                          >
                            Unsuspend
                          </button>
                        )}
                        {user.status !== "banned" && (
                          <button
                            onClick={() => setModal({ type: "ban", user })}
                            className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-100"
                          >
                            <Ban className="w-3 h-3" /> Ban
                          </button>
                        )}
                        {user.status === "banned" && (
                          <button
                            onClick={() => handleAction(user.id, "unban")}
                            className="text-xs text-[#6b7280] border border-[#e5e1d8] rounded-lg px-2 py-1.5 hover:bg-[#faf9f6]"
                          >
                            Unban
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === user.id && (
                    <tr key={`${user.id}-expanded`} className="bg-[#faf9f6] border-b border-[#e5e1d8]">
                      <td colSpan={5} className="px-6 py-4">
                        {user.ban_reason && (
                          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            <span className="font-medium">Ban reason:</span> {user.ban_reason}
                          </div>
                        )}
                        <div className="text-xs font-medium text-[#6b7280] uppercase tracking-wide mb-2">Giving History</div>
                        {(userDonations[user.id] ?? []).length === 0 ? (
                          <div className="text-sm text-[#9b9990]">No donations found</div>
                        ) : (
                          <div className="space-y-1">
                            {(userDonations[user.id] ?? []).slice(0, 10).map((d) => (
                              <div key={d.id} className="flex justify-between text-sm">
                                <span className="text-[#6b7280]">{d.org_name || "Unknown org"}</span>
                                <span className="font-mono text-[#1a7a4a]">{fmt(d.amount)}</span>
                                <span className="text-xs text-[#9b9990]">{new Date(d.donated_at).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.type === "suspend" && (
        <ConfirmModal
          title={`Suspend ${modal.user.email}?`}
          message="This user will be redirected to a suspended page when they try to log in. You can unsuspend at any time."
          confirmLabel="Suspend User"
          onConfirm={() => handleAction(modal.user.id, "suspend")}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "ban" && (
        <ConfirmModal
          title={`Ban ${modal.user.email}?`}
          message="This is a permanent ban. The user will not be able to access their account."
          confirmLabel="Ban User"
          requireReason
          reasonLabel="Ban reason"
          onConfirm={(reason) => handleAction(modal.user.id, "ban", reason)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/UsersTab.tsx
git commit -m "feat: add admin UsersTab with search, expand, suspend, and ban"
```

---

## Task 11: TransactionsTab Component

**Files:**
- Create: `components/admin/TransactionsTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import RefundModal from "./RefundModal";

interface Donation {
  id: string;
  userEmail: string;
  org_name: string;
  amount: number;
  donated_at: string;
  status: string;
  stripe_payment_intent_id: string;
  receipt_id: string | null;
  refund_amount: number;
  refund_reason: string;
}

export default function TransactionsTab() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<Donation | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, status: statusFilter, dateFrom, dateTo });
    const res = await fetch(`/api/admin/transactions?${params}`);
    const data = await res.json();
    setDonations(data.donations ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: "bg-[#e8f5ee] text-[#1a7a4a]",
      refunded: "bg-blue-50 text-blue-700",
      partial_refund: "bg-purple-50 text-purple-700",
      pending: "bg-amber-50 text-amber-700",
      pending_refund: "bg-amber-50 text-amber-700",
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-[#faf9f6] text-[#6b7280]"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#111827]" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>Transactions</h2>
          <p className="text-sm text-[#6b7280] mt-0.5">{total} total donations</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#111827]">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b9990]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email or org..."
            className="w-full pl-9 pr-3 py-2.5 border border-[#e5e1d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-[#e5e1d8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] text-[#6b7280]"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="partial_refund">Partial refund</option>
          <option value="pending">Pending</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="border border-[#e5e1d8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] text-[#6b7280]" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="border border-[#e5e1d8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] text-[#6b7280]" />
      </div>

      {loading ? (
        <div className="text-sm text-[#6b7280]">Loading...</div>
      ) : (
        <div className="border border-[#e5e1d8] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-[#e5e1d8]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Organization</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {donations.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6b7280]">No transactions found</td></tr>
              )}
              {donations.map((d) => (
                <>
                  <tr key={d.id} className="border-b border-[#e5e1d8] last:border-0 hover:bg-[#faf9f6]">
                    <td className="px-4 py-3 font-mono text-xs text-[#9b9990]">{d.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-[#6b7280]">{d.userEmail}</td>
                    <td className="px-4 py-3 text-[#111827]">{d.org_name || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-[#1a7a4a]">{fmt(d.amount)}</td>
                    <td className="px-4 py-3">{statusBadge(d.status ?? "completed")}</td>
                    <td className="px-4 py-3 text-right text-xs text-[#9b9990]">
                      {new Date(d.donated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                          className="flex items-center gap-1 text-xs text-[#6b7280] border border-[#e5e1d8] rounded-lg px-2 py-1.5 hover:bg-[#faf9f6]"
                        >
                          Details {expanded === d.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {d.status !== "refunded" && (
                          <button
                            onClick={() => setRefundTarget(d)}
                            className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-100"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === d.id && (
                    <tr key={`${d.id}-expanded`} className="bg-[#faf9f6] border-b border-[#e5e1d8]">
                      <td colSpan={7} className="px-6 py-4 text-sm space-y-1">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                          <div><span className="text-[#6b7280]">Full ID:</span> <span className="font-mono text-xs">{d.id}</span></div>
                          <div><span className="text-[#6b7280]">Stripe PI:</span> <span className="font-mono text-xs">{d.stripe_payment_intent_id || "—"}</span></div>
                          <div><span className="text-[#6b7280]">Receipt ID:</span> <span className="font-mono text-xs">{d.receipt_id || "—"}</span></div>
                          {d.refund_amount > 0 && (
                            <div><span className="text-[#6b7280]">Refunded:</span> <span className="text-red-600">{fmt(d.refund_amount)}</span></div>
                          )}
                          {d.refund_reason && (
                            <div className="col-span-2"><span className="text-[#6b7280]">Refund reason:</span> {d.refund_reason}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {refundTarget && (
        <RefundModal
          donation={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/TransactionsTab.tsx
git commit -m "feat: add admin TransactionsTab with filters and refund modal"
```

---

## Task 12: LogsTab + OrgsTab Components

**Files:**
- Create: `components/admin/LogsTab.tsx`
- Create: `components/admin/OrgsTab.tsx`

- [ ] **Step 1: Create LogsTab**

```tsx
"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface AdminLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  refund_issued:    { label: "Refund",     bg: "bg-red-50",    text: "text-red-700" },
  user_ban:         { label: "Ban",        bg: "bg-red-50",    text: "text-red-700" },
  user_unban:       { label: "Unban",      bg: "bg-[#e8f5ee]", text: "text-[#1a7a4a]" },
  user_suspend:     { label: "Suspend",    bg: "bg-amber-50",  text: "text-amber-700" },
  user_unsuspend:   { label: "Unsuspend",  bg: "bg-[#e8f5ee]", text: "text-[#1a7a4a]" },
  org_suspend:      { label: "Org Suspend",bg: "bg-amber-50",  text: "text-amber-700" },
  org_unsuspend:    { label: "Org Unsuspend",bg:"bg-[#e8f5ee]",text: "text-[#1a7a4a]" },
  org_verify:       { label: "Verify",     bg: "bg-[#e8f5ee]", text: "text-[#1a7a4a]" },
  org_unverify:     { label: "Unverify",   bg: "bg-amber-50",  text: "text-amber-700" },
};

export default function LogsTab() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/logs?limit=200");
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#111827]" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>Admin Logs</h2>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#111827]">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[#6b7280]">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-[#9b9990] text-center py-16">No admin actions logged yet</div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[#e5e1d8]" />
          <div className="space-y-4">
            {logs.map((log) => {
              const style = ACTION_STYLES[log.action] ?? { label: log.action, bg: "bg-[#faf9f6]", text: "text-[#6b7280]" };
              return (
                <div key={log.id} className="flex gap-4 relative">
                  <div className={`w-10 h-10 rounded-full ${style.bg} border-2 border-white flex items-center justify-center flex-shrink-0 z-10`}>
                    <div className={`w-2 h-2 rounded-full ${style.text.replace("text-", "bg-")}`} />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      {log.entity_type && (
                        <span className="text-xs text-[#9b9990]">on {log.entity_type}</span>
                      )}
                      <span className="text-xs text-[#9b9990] ml-auto">
                        {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="text-xs text-[#6b7280] mt-1 space-y-0.5">
                        {Object.entries(log.details).map(([k, v]) => (
                          <div key={k}><span className="text-[#9b9990]">{k}:</span> {String(v)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create OrgsTab**

The OrgsTab wraps the existing AdminPanel with additional suspend/verify controls per org.

```tsx
"use client";
import dynamic from "next/dynamic";

// Embed the existing full org management panel as-is
const AdminPanel = dynamic(() => import("@/components/AdminPanel"), { ssr: false });

export default function OrgsTab() {
  return (
    <div>
      <AdminPanel />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/LogsTab.tsx components/admin/OrgsTab.tsx
git commit -m "feat: add admin LogsTab timeline and OrgsTab wrapper"
```

---

## Task 13: AdminDashboard Root Component

**Files:**
- Create: `components/admin/AdminDashboard.tsx`

This is the top-level component that replaces `<AdminPanel>` in the profile page.

- [ ] **Step 1: Create AdminDashboard**

```tsx
"use client";
import { useState } from "react";
import { LayoutDashboard, Users, Building2, CreditCard, ScrollText } from "lucide-react";
import dynamic from "next/dynamic";

const OverviewTab = dynamic(() => import("./OverviewTab"), { ssr: false });
const UsersTab = dynamic(() => import("./UsersTab"), { ssr: false });
const OrgsTab = dynamic(() => import("./OrgsTab"), { ssr: false });
const TransactionsTab = dynamic(() => import("./TransactionsTab"), { ssr: false });
const LogsTab = dynamic(() => import("./LogsTab"), { ssr: false });

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "organizations", label: "Organizations", icon: Building2 },
  { id: "transactions", label: "Transactions", icon: CreditCard },
  { id: "logs", label: "Logs", icon: ScrollText },
] as const;

type TabId = typeof TABS[number]["id"];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#1a7a4a]" />
          <span className="text-xs font-medium text-[#1a7a4a] uppercase tracking-wider font-mono">Admin</span>
        </div>
        <h1 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>
          Admin Dashboard
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-8 border-b border-[#e5e1d8] overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-[#1a7a4a] text-[#1a7a4a]"
                  : "border-transparent text-[#6b7280] hover:text-[#111827] hover:border-[#e5e1d8]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "organizations" && <OrgsTab />}
        {activeTab === "transactions" && <TransactionsTab />}
        {activeTab === "logs" && <LogsTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminDashboard.tsx
git commit -m "feat: add AdminDashboard root component with 5-tab navigation"
```

---

## Task 14: Wire AdminDashboard into Profile Page

**Files:**
- Modify: `app/profile/page.tsx` (two small changes)

- [ ] **Step 1: Update the dynamic import in profile/page.tsx**

Find this line (around line 32):
```typescript
const AdminPanel = dynamic(() => import("@/components/AdminPanel"), { ssr: false });
```

Replace with:
```typescript
const AdminDashboard = dynamic(() => import("@/components/admin/AdminDashboard"), { ssr: false });
```

- [ ] **Step 2: Update the JSX render in profile/page.tsx**

Find this line (around line 1282):
```tsx
{activeTab === "admin" && isAdmin && <AdminPanel editOrgId={editOrgParam ?? undefined} />}
```

Replace with:
```tsx
{activeTab === "admin" && isAdmin && <AdminDashboard />}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Run build to confirm**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add app/profile/page.tsx
git commit -m "feat: wire AdminDashboard into profile page, replacing AdminPanel"
```

---

## Task 15: Suspended and Banned Pages

**Files:**
- Create: `app/suspended/page.tsx`
- Create: `app/banned/page.tsx`

- [ ] **Step 1: Create suspended page**

```tsx
import Link from "next/link";
import { Shield } from "lucide-react";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-semibold text-[#111827] mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>
          Account Suspended
        </h1>
        <p className="text-[#6b7280] mb-6 leading-relaxed">
          Your account has been temporarily suspended. If you believe this is a mistake, please contact us.
        </p>
        <a
          href="mailto:support@easytogive.online"
          className="inline-block bg-[#1a7a4a] text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-[#155f3a] transition-colors"
        >
          Contact support@easytogive.online
        </a>
        <div className="mt-4">
          <Link href="/auth/signin" className="text-sm text-[#6b7280] hover:text-[#111827]">
            Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create banned page**

```tsx
import Link from "next/link";
import { Ban } from "lucide-react";

export default function BannedPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-6">
          <Ban className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold text-[#111827] mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>
          Account Banned
        </h1>
        <p className="text-[#6b7280] mb-6 leading-relaxed">
          Your account has been permanently banned from EasyToGive.
        </p>
        <a
          href="mailto:support@easytogive.online"
          className="inline-block text-sm text-[#6b7280] hover:text-[#111827]"
        >
          Contact support@easytogive.online if you believe this is an error.
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/suspended/ app/banned/
git commit -m "feat: add /suspended and /banned pages"
```

---

## Task 16: Auth Callback — Suspended/Banned Enforcement

**Files:**
- Modify: `app/auth/callback/route.ts`

Add a check after the existing onboarding check. Suspended users → `/suspended`. Banned users → `/banned`.

- [ ] **Step 1: Update auth/callback/route.ts**

After the existing `onboarding_complete` check, add suspended/banned check:

```typescript
// In the existing if (user) block, after the onboarding redirect:

// Check suspended/banned status
const { data: userRecord } = await supabase
  .from("users")
  .select("suspended, banned")
  .eq("id", user.id)
  .maybeSingle();

const u = userRecord as any;
if (u?.banned) {
  // Sign them out immediately so they can't stay logged in
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/banned", requestUrl.origin));
}
if (u?.suspended) {
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/suspended", requestUrl.origin));
}
```

Place this BEFORE the final `return NextResponse.redirect(new URL("/discover", requestUrl.origin))`.

Full updated `if (user)` block should look like:

```typescript
if (user) {
  const { data: profile } = await supabase
    .from("users")
    .select("onboarding_complete, suspended, banned")
    .eq("id", user.id)
    .maybeSingle();

  const p = profile as any;

  if (p?.banned) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/banned", requestUrl.origin));
  }
  if (p?.suspended) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/suspended", requestUrl.origin));
  }

  if (!p?.onboarding_complete) {
    return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat: enforce suspended/banned redirect in auth callback"
```

---

## Task 17: Final Build Verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/sethmitzel/easytogive && npx tsc --noEmit 2>&1
```

Expected: no errors. Fix any that appear before proceeding.

- [ ] **Step 2: Production build**

```bash
npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` or similar. No type errors, no missing module errors.

- [ ] **Step 3: Manual smoke test checklist (in browser)**

Navigate to http://localhost:3000 (or staging):
- [ ] Sign in as sethmitzel@gmail.com → Profile → Admin tab should show 5-tab dashboard
- [ ] Overview tab loads stats (may show zeros if DB is empty)
- [ ] Users tab loads user list, search works
- [ ] Transactions tab loads donations, filter by status works
- [ ] Logs tab shows empty state or existing logs
- [ ] Organizations tab shows existing AdminPanel (all org CRUD still works)
- [ ] Sign in as a non-admin → no Admin tab visible

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "feat: complete admin dashboard — overview, users, orgs, transactions, logs, refund API"
```

- [ ] **Step 5: Push to staging**

```bash
git push origin staging
```

---

## SQL Migration Reminder

**⚠️ Before starting Task 2 (or any code that reads the new columns), run this SQL in the Supabase SQL Editor:**

https://supabase.com/dashboard/project/dfktfiruzulhpwcafaey/sql/new

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text DEFAULT '';

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS refund_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fee_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_covered boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS org_name text DEFAULT '';

CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb default '{}',
  created_at timestamp with time zone default now()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
```
