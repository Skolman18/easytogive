import { NextRequest, NextResponse } from "next/server";

// Map GiveButter API responses to EasyToGive org schema
function parseCampaignStats(campaign: any) {
  if (!campaign) return {};

  // GiveButter v1 stores amounts as { cents, dollars } or as plain numbers
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
  const { apiKey } = await req.json();
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "API key is required." }, { status: 400 });
  }

  try {
    const headers = { Authorization: `Bearer ${apiKey.trim()}` };

    const [accountRes, campaignsRes] = await Promise.all([
      fetch("https://api.givebutter.com/v1/account", { headers }),
      fetch("https://api.givebutter.com/v1/campaigns?limit=1", { headers }),
    ]);

    if (accountRes.status === 401 || accountRes.status === 403) {
      return NextResponse.json({ error: "Invalid API key. Check your GiveButter account settings." }, { status: 400 });
    }
    if (!accountRes.ok) {
      return NextResponse.json({ error: "GiveButter returned an error. Please try again." }, { status: 400 });
    }

    const accountJson = await accountRes.json();
    // GiveButter may wrap in { data: ... }
    const account = accountJson.data ?? accountJson;

    const campaignsJson = campaignsRes.ok ? await campaignsRes.json() : null;
    const firstCampaign = campaignsJson?.data?.[0] ?? null;

    const stats = parseCampaignStats(firstCampaign);

    return NextResponse.json({
      name: account.name ?? "",
      description: account.description ?? firstCampaign?.description ?? "",
      website: account.website ?? account.url ?? "",
      image_url: account.logo ?? account.avatar ?? account.logo_url ?? "",
      campaign_title: firstCampaign?.title ?? firstCampaign?.name ?? "",
      ...stats,
    });
  } catch {
    return NextResponse.json({ error: "Failed to connect to GiveButter. Check your internet connection." }, { status: 500 });
  }
}
