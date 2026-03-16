import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function parseCampaignStats(campaign: any) {
  const raisedCents =
    campaign.raised?.cents ??
    (campaign.raised?.dollars != null ? Math.round(campaign.raised.dollars * 100) : null) ??
    (campaign.raised_amount != null ? Math.round(Number(campaign.raised_amount) * 100) : 0);

  const goalCents =
    campaign.goal?.cents ??
    (campaign.goal?.dollars != null ? Math.round(campaign.goal.dollars * 100) : null) ??
    (campaign.goal_amount != null ? Math.round(Number(campaign.goal_amount) * 100) : null) ??
    (typeof campaign.goal === "number" ? Math.round(campaign.goal * 100) : 0);

  const donors =
    campaign.supporter_count ??
    campaign.supporters_count ??
    campaign.supporters ??
    0;

  return { raised: raisedCents, goal: goalCents, donors };
}

export async function POST(req: NextRequest) {
  const { apiKey, orgId } = await req.json();
  if (!apiKey?.trim() || !orgId?.trim()) {
    return NextResponse.json({ error: "apiKey and orgId are required." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.givebutter.com/v1/campaigns?limit=1", {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
    });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ error: "Invalid GiveButter API key." }, { status: 400 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "GiveButter API error." }, { status: 400 });
    }

    const json = await res.json();
    const firstCampaign = json?.data?.[0] ?? null;
    if (!firstCampaign) {
      return NextResponse.json({ error: "No campaigns found in this GiveButter account." }, { status: 404 });
    }

    const stats = parseCampaignStats(firstCampaign);

    const supabase = getSupabaseAdmin();
    const { error } = await (supabase as any)
      .from("organizations")
      .update(stats)
      .eq("id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ synced: true, ...stats });
  } catch {
    return NextResponse.json({ error: "Failed to sync from GiveButter." }, { status: 500 });
  }
}
