import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface OrgSuggestion {
  orgId: string;
  orgName: string;
  category: string;
  imageUrl: string | null;
  reason: string;
}

// POST /api/ai/org-suggestions
// Body: { userId: string, currentPortfolioOrgIds: string[] }
export async function POST(req: NextRequest) {
  try {
    const { userId, currentPortfolioOrgIds } = await req.json();
    if (!userId) return NextResponse.json({ suggestions: [] });

    const supabase = getSupabaseAdmin();

    // 1. Get donor's portfolio orgs with details
    const { data: portfolioOrgs } = await supabase
      .from("portfolio_orgs")
      .select("org_id, allocation")
      .eq("user_id", userId);

    const portfolioIds: string[] =
      currentPortfolioOrgIds?.length > 0
        ? currentPortfolioOrgIds
        : (portfolioOrgs?.map((p: any) => p.org_id) ?? []);

    if (portfolioIds.length < 2) return NextResponse.json({ suggestions: [] });

    // 2. Get their portfolio org details
    const { data: currentOrgs } = await supabase
      .from("organizations")
      .select("id, name, category, subcategory, tagline")
      .in("id", portfolioIds);

    // 3. Get recent donation history for context
    const { data: recentDonations } = await supabase
      .from("donations")
      .select("org_id, amount")
      .eq("user_id", userId)
      .order("donated_at", { ascending: false })
      .limit(20);

    // Build a map: org_id -> total donated
    const donationTotals: Record<string, number> = {};
    for (const d of recentDonations ?? []) {
      donationTotals[d.org_id] = (donationTotals[d.org_id] ?? 0) + d.amount;
    }

    // 4. Get all available orgs the donor does NOT support (limit to 40)
    const { data: availableOrgs } = await supabase
      .from("organizations")
      .select("id, name, category, tagline, verified")
      .eq("visible", true)
      .not("id", "in", `(${portfolioIds.join(",")})`)
      .order("sort_order", { ascending: true })
      .limit(40);

    if (!availableOrgs?.length) return NextResponse.json({ suggestions: [] });

    // 5. Call Claude
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const portfolioList = (currentOrgs ?? [])
      .map((o: any) => {
        const donated = donationTotals[o.id];
        const donatedStr = donated ? ` ($${(donated / 100).toFixed(0)} donated)` : "";
        return `- ${o.name} (${o.category}${o.subcategory ? "/" + o.subcategory : ""})${donatedStr}`;
      })
      .join("\n");

    const availableList = availableOrgs
      .map((o: any) => `- id:${o.id} | ${o.name} | ${o.category} | ${o.tagline ?? ""}`)
      .join("\n");

    const prompt = `You are the recommendation engine for EasyToGive, a charitable giving marketplace.

A donor has the following giving history:
${portfolioList}

From the following available organizations they do NOT already support:
${availableList}

Suggest the 3 best organizations for this donor to add to their portfolio.
For each suggestion provide a one-sentence reason why it fits their giving pattern. Be specific and warm — mention what they already give to.

Respond with JSON only:
{"suggestions": [{"orgId": "string", "orgName": "string", "reason": "string"}]}`;

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = {}; }
    const raw: { orgId: string; orgName: string; reason: string }[] =
      parsed.suggestions ?? [];

    // Enrich with image_url and category from DB
    const suggestedIds = raw.map((s) => s.orgId).filter(Boolean);
    const { data: suggestedOrgs } = suggestedIds.length
      ? await supabase
          .from("organizations")
          .select("id, name, category, image_url")
          .in("id", suggestedIds)
      : { data: [] };

    const orgMap: Record<string, any> = {};
    for (const o of suggestedOrgs ?? []) orgMap[o.id] = o;

    const suggestions: OrgSuggestion[] = raw
      .map((s) => ({
        orgId: s.orgId,
        orgName: orgMap[s.orgId]?.name ?? s.orgName,
        category: orgMap[s.orgId]?.category ?? "",
        imageUrl: orgMap[s.orgId]?.image_url ?? null,
        reason: s.reason,
      }))
      .slice(0, 3);

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[ai/org-suggestions]", err);
    return NextResponse.json({ suggestions: [] });
  }
}
