import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const db = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";

  const { data: users, error } = await db
    .from("users")
    .select("id, email, full_name, avatar_url, created_at, suspended, banned, ban_reason")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with total donated per user
  const { data: donations } = await db
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

  const db = getSupabaseAdmin();
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

  const { error } = await db
    .from("users")
    .update(update as any)
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(`user_${action}`, "user", userId, {
    action,
    banReason: banReason ?? null,
    performedBy: (auth as { user: { email: string } }).user.email,
  });

  return NextResponse.json({ success: true });
}
