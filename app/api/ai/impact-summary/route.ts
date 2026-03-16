import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// POST /api/ai/impact-summary
// Body: { updateId: string }
// Called after an org posts an impact update. Generates and stores donor-facing summary.
export async function POST(req: NextRequest) {
  try {
    const { updateId } = await req.json();
    if (!updateId) return NextResponse.json({ error: "updateId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // Fetch the update record + org details
    const { data: update } = await supabase
      .from("org_impact_updates")
      .select("id, org_id, stat_label, stat_value, stat_period, message, ai_summary, ai_stat_highlight")
      .eq("id", updateId)
      .single();

    if (!update) return NextResponse.json({ error: "Update not found" }, { status: 404 });

    // If already summarized, return the cached result
    if (update.ai_summary) {
      return NextResponse.json({
        summary: update.ai_summary,
        statHighlight: update.ai_stat_highlight,
      });
    }

    // Fetch org details
    const { data: org } = await supabase
      .from("organizations")
      .select("name, category")
      .eq("id", update.org_id)
      .single();

    const orgName = org?.name ?? "This organization";
    const orgCategory = org?.category ?? "nonprofit";

    const updateText = [
      update.stat_value && update.stat_label
        ? `${update.stat_value} ${update.stat_label} ${update.stat_period ?? ""}`
        : "",
      update.message ?? "",
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `You are writing a short impact summary for donors of EasyToGive.

An organization called ${orgName} (category: ${orgCategory}) just posted this update:
${updateText}

Write a 1-sentence donor-facing summary that:
- Starts with a specific number or result if one is mentioned
- Is warm and personal
- Makes the donor feel their giving made a difference
- Is under 20 words

Also extract or generate the single most compelling stat or result from this update in under 8 words.

Respond with JSON only:
{
  "summary": "string under 20 words",
  "statHighlight": "string under 8 words e.g. '847 meals served this month'"
}`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const result = JSON.parse(text);

    const summary: string = result.summary ?? "";
    const statHighlight: string = result.statHighlight ?? "";

    // Store back on the update record
    await supabase
      .from("org_impact_updates")
      .update({ ai_summary: summary, ai_stat_highlight: statHighlight })
      .eq("id", updateId);

    return NextResponse.json({ summary, statHighlight });
  } catch (err) {
    console.error("[ai/impact-summary]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
