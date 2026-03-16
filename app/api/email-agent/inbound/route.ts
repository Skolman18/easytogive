import { NextRequest, NextResponse } from "next/server";
import type { InboundEmail } from "../route";

// Resend inbound webhook payload (simplified)
interface ResendInboundPayload {
  from?: string;
  sender?: string;
  subject?: string;
  text?: string;
  html?: string;
  date?: string;
  headers?: Record<string, string>;
}

// POST /api/email-agent/inbound
// Resend calls this when an email arrives at seth@easytogive.online
// No auth header needed — Resend signs requests; we forward with CRON_SECRET to the main route
export async function POST(req: NextRequest) {
  let payload: ResendInboundPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email: InboundEmail = {
    from: payload.from ?? payload.sender ?? "unknown",
    subject: payload.subject ?? "(no subject)",
    body: payload.text ?? stripHtml(payload.html ?? ""),
    date: payload.date ?? new Date().toISOString(),
  };

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[email-agent/inbound] CRON_SECRET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Forward to main agent route
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://easytogive.online";
  const res = await fetch(`${baseUrl}/api/email-agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ emails: [email] }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[email-agent/inbound] Agent route error:", text);
    return NextResponse.json({ error: "Agent failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
