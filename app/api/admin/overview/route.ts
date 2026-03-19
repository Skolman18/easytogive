import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const db = getSupabaseAdmin();

  // Total users
  const { count: totalUsers } = await db
    .from("users")
    .select("*", { count: "exact", head: true });

  // Total organizations
  const { count: totalOrgs } = await db
    .from("organizations")
    .select("*", { count: "exact", head: true });

  // Donations aggregate
  const { data: donationStats } = await db
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
  const { data: recentRaw } = await db
    .from("donations")
    .select("id, amount, donated_at, org_name, user_id, status")
    .order("donated_at", { ascending: false })
    .limit(10);

  // Enrich with user emails
  const recent = await Promise.all(
    (recentRaw ?? []).map(async (d: any) => {
      let email = "Guest";
      if (d.user_id) {
        const { data: u } = await db
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
