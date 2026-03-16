import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface PortfolioAnalysis {
  needsRebalancing: boolean;
  headline: string;
  suggestion: string;
  actions: string[];
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// POST /api/ai/portfolio-analysis
// Body: { userId: string }
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ analysis: null });

    const supabase = getSupabaseAdmin();

    // Check cached analysis on the user profile
    const { data: userRow } = await supabase
      .from("users")
      .select("portfolio_analysis, portfolio_analyzed_at")
      .eq("id", userId)
      .single();

    const lastAnalyzed = userRow?.portfolio_analyzed_at
      ? new Date(userRow.portfolio_analyzed_at).getTime()
      : 0;
    const isFresh = Date.now() - lastAnalyzed < ONE_WEEK_MS;

    if (isFresh && userRow?.portfolio_analysis) {
      return NextResponse.json({ analysis: userRow.portfolio_analysis, cached: true });
    }

    // Fetch portfolio allocations
    const { data: portfolio } = await supabase
      .from("portfolio_orgs")
      .select("org_id, allocation")
      .eq("user_id", userId);

    if (!portfolio?.length) return NextResponse.json({ analysis: null });

    const orgIds = portfolio.map((p: any) => p.org_id);

    // Fetch org details
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, category")
      .in("id", orgIds);

    const orgMap: Record<string, any> = {};
    for (const o of orgs ?? []) orgMap[o.id] = o;

    // Fetch donation totals last 3 months
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentDonations } = await supabase
      .from("donations")
      .select("org_id, amount")
      .eq("user_id", userId)
      .gte("donated_at", threeMonthsAgo);

    const donationTotals: Record<string, number> = {};
    for (const d of recentDonations ?? []) {
      donationTotals[d.org_id] = (donationTotals[d.org_id] ?? 0) + d.amount;
    }

    // Estimate monthly budget from recent history or portfolio
    const totalDonatedCents = Object.values(donationTotals).reduce((a, b) => a + b, 0);
    const estimatedMonthlyBudget = Math.round(totalDonatedCents / 3 / 100) || 50; // fallback $50

    // Build allocation description
    const allocationList = portfolio
      .map((p: any) => {
        const org = orgMap[p.org_id];
        const pct = p.allocation ?? 0;
        const dollarAmount = Math.round((estimatedMonthlyBudget * pct) / 100);
        const actualDonated = donationTotals[p.org_id] ?? 0;
        return `- ${org?.name ?? p.org_id} (${org?.category ?? "unknown"}): ${pct}% ($${dollarAmount}/mo estimated)${actualDonated ? `, $${(actualDonated / 100).toFixed(0)} donated in last 3 months` : ""}`;
      })
      .join("\n");

    const prompt = `You are a giving portfolio advisor for EasyToGive.

This donor has a monthly giving budget of approximately $${estimatedMonthlyBudget} allocated as follows:
${allocationList}

Analyze their portfolio and determine:
1. Is it well balanced across causes?
2. Are they over-concentrated in one category?
3. Are they under-giving to high-impact areas based on their interests?

Be encouraging and specific. If the portfolio is healthy, say so clearly. If they could improve it, give concrete, actionable advice.

Respond with JSON only:
{
  "needsRebalancing": true,
  "headline": "one short headline about their portfolio health",
  "suggestion": "2-3 sentence plain English suggestion",
  "actions": ["specific action 1", "specific action 2"]
}`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const analysis: PortfolioAnalysis = JSON.parse(text);

    // Cache result on user profile
    await supabase
      .from("users")
      .update({
        portfolio_analysis: analysis,
        portfolio_analyzed_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("[ai/portfolio-analysis]", err);
    return NextResponse.json({ analysis: null });
  }
}
