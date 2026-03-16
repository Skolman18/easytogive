import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are a friendly and knowledgeable giving assistant for EasyToGive — a charitable giving platform that makes it easy to discover nonprofits, build a giving portfolio, and track your impact.

You help donors with:
- Discovering organizations and causes that match their interests
- Understanding how charitable giving works
- Answering questions about tax deductions for charitable donations
- Explaining how to use EasyToGive features (portfolios, giving goals, impact feed, tax receipts)
- Guidance on giving strategies (recurring giving, bunching donations, Donor-Advised Funds)
- Questions about specific types of nonprofits, churches, and causes

Key facts about EasyToGive:
- Free to use for donors
- Organizations are verified before going live
- Donors can build a giving portfolio to give to multiple organizations at once
- Automatic tax receipts are generated for every donation
- Impact Feed shows donors how their money is being used
- Giving Goals help donors set and track yearly giving targets
- GiveButter integration allows organizations to sync their campaign data
- Tax Optimizer tool helps donors understand the tax impact of their giving

Be warm, concise, and helpful. Use short paragraphs. If someone asks about a specific organization or cause, suggest they browse the Discover page at /discover. If they want to get started, point them to /get-started.

For tax questions, provide helpful educational information but always remind them to consult a tax professional for their specific situation.

Do not make up specific organization names or claim they are on the platform. Do not discuss topics unrelated to charitable giving or the EasyToGive platform.`;

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error("invalid");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(-12), // keep last 12 messages for context
      ],
    }),
  });

  if (!groqRes.ok || !groqRes.body) {
    return new Response(JSON.stringify({ error: "AI service error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pass the stream straight through
  return new Response(groqRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
