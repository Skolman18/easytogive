import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { sendDigestEmail } from "@/lib/email";

const CATEGORIES = [
  "donor_inquiry",
  "org_application",
  "support",
  "partnership",
  "press",
  "spam",
  "other",
] as const;

const PRIORITIES = ["urgent", "high", "normal", "low"] as const;

export interface InboundEmail {
  from: string;
  subject: string;
  body: string;
  date: string;
}

interface ClassifiedEmail {
  from: string;
  subject: string;
  body_preview: string;
  category: (typeof CATEGORIES)[number];
  priority: (typeof PRIORITIES)[number];
  summary: string;
  requires_response: boolean;
  draft_reply: string | null;
  action_items: string[];
  received_at: string;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin credentials not configured");
  return createClient(url, key);
}

function getAnthropicClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey: key });
}

async function classifyEmails(emails: InboundEmail[]): Promise<ClassifiedEmail[]> {
  const client = getAnthropicClient();

  const prompt = `You are the email triage assistant for EasyToGive, a charitable giving marketplace.

For each email below, classify it and draft a reply if needed. Return a JSON array where each item has exactly these fields:
- category: one of: donor_inquiry, org_application, support, partnership, press, spam, other
- priority: one of: urgent (needs response <2h), high (today), normal (this week), low (whenever/no response)
- summary: 1-2 sentence plain-English summary of what this email is about
- requires_response: boolean — true if Seth should or has responded
- draft_reply: string or null — if requires_response is true, write a warm, professional draft reply from Seth at EasyToGive. Sign off as "Seth, EasyToGive". Keep it concise (2-4 sentences). null otherwise.
- action_items: array of strings — specific things Seth needs to do (empty array if none)

Category guidance:
- donor_inquiry: questions from people who want to give or have given
- org_application: nonprofits asking to be listed, pending approvals, follow-ups
- support: account issues, technical problems, billing questions
- partnership: potential integrations, collaborations, sponsorships
- press: media requests, interviews, articles
- spam: unsolicited marketing, cold outreach with no relevance

Emails to classify:
${emails
  .map(
    (e, i) => `
--- Email ${i + 1} ---
From: ${e.from}
Date: ${e.date}
Subject: ${e.subject}
Body:
${e.body.slice(0, 2000)}
`
  )
  .join("\n")}

Respond with ONLY a valid JSON array, no markdown, no explanation.`;

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = JSON.parse(text);

  return emails.map((email, i) => ({
    from: email.from,
    subject: email.subject,
    body_preview: email.body.slice(0, 500),
    category: parsed[i]?.category ?? "other",
    priority: parsed[i]?.priority ?? "normal",
    summary: parsed[i]?.summary ?? "",
    requires_response: parsed[i]?.requires_response ?? false,
    draft_reply: parsed[i]?.draft_reply ?? null,
    action_items: parsed[i]?.action_items ?? [],
    received_at: email.date,
  }));
}

async function saveToDatabase(classified: ClassifiedEmail[]) {
  const supabase = getSupabaseAdmin();
  const rows = classified.map((e) => ({
    received_at: e.received_at,
    from_email: e.from,
    subject: e.subject,
    body_preview: e.body_preview,
    category: e.category,
    priority: e.priority,
    summary: e.summary,
    requires_response: e.requires_response,
    draft_reply: e.draft_reply,
    action_items: e.action_items,
  }));

  const { error } = await supabase.from("email_log").insert(rows);
  if (error) throw new Error(`DB insert failed: ${error.message}`);
}

function buildDigest(classified: ClassifiedEmail[]): string {
  const urgent = classified.filter((e) => e.priority === "urgent");
  const needsReply = classified.filter((e) => e.requires_response && e.priority !== "urgent");
  const byCategory = classified.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const lines: string[] = [
    `📬 EasyToGive Email Digest — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`,
    ``,
    `Processed ${classified.length} email${classified.length === 1 ? "" : "s"}.`,
    ``,
  ];

  if (urgent.length > 0) {
    lines.push(`🔴 URGENT (${urgent.length})`);
    urgent.forEach((e) => lines.push(`  • ${e.from} — ${e.subject}\n    ${e.summary}`));
    lines.push(``);
  }

  if (needsReply.length > 0) {
    lines.push(`📨 Needs Reply (${needsReply.length})`);
    needsReply.forEach((e) => lines.push(`  • [${e.priority}] ${e.from} — ${e.subject}`));
    lines.push(``);
  }

  const catSummary = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(", ");
  lines.push(`By category: ${catSummary}`);
  lines.push(``);
  lines.push(`View full inbox: https://easytogive.online/admin/email`);

  return lines.join("\n");
}

// POST /api/email-agent
// Accepts { emails: InboundEmail[] } or a single InboundEmail (from inbound webhook)
// Auth: Authorization: Bearer CRON_SECRET
export async function POST(req: NextRequest) {
  // Auth check
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let emails: InboundEmail[];
  try {
    const body = await req.json();
    emails = Array.isArray(body.emails) ? body.emails : [body];
    if (!emails.length) {
      return NextResponse.json({ processed: 0, urgent: [], drafts: [], digest: "" });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const classified = await classifyEmails(emails);
    await saveToDatabase(classified);

    const digest = buildDigest(classified);
    const urgent = classified.filter((e) => e.priority === "urgent");
    const drafts = classified.filter((e) => e.draft_reply);

    // Send digest email if DIGEST_EMAIL is set (or fall back to seth@easytogive.online)
    const digestTo = process.env.DIGEST_EMAIL ?? "seth@easytogive.online";
    await sendDigestEmail({ to: digestTo, digest, urgentCount: urgent.length });

    return NextResponse.json({
      processed: classified.length,
      urgent: urgent.map((e) => ({ from: e.from, subject: e.subject, summary: e.summary })),
      drafts: drafts.map((e) => ({ from: e.from, subject: e.subject, draft: e.draft_reply })),
      digest,
    });
  } catch (err) {
    console.error("[email-agent] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
