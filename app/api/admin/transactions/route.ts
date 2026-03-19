import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const db = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = 50;

  let query = db
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
  const { data: users } = await db
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
