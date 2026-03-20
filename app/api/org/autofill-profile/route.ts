import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { createClient as createServerClient } from "@/lib/supabase-server";

/** Block localhost and private IPs to prevent SSRF. */
function isUrlAllowed(input: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (input.length > 2000) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) return false;
  if (host === "::1" || host === "[::1]" || host === "::" || host === "0.0.0.0") return false;
  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return false;
  if (host.startsWith("192.168.") || host.startsWith("10.")) return false;
  const m = host.match(/^172\.(\d+)\./);
  if (m && parseInt(m[1], 10) >= 16 && parseInt(m[1], 10) <= 31) return false;
  if (host.startsWith("169.254.")) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Must be authenticated
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI fill is temporarily unavailable." },
        { status: 503 }
      );
    }

    // Rate limit: 5 autofill requests per user per hour
    const { allowed } = checkRateLimit(user.id, "autofill-profile", 5, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    let body: { url?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { url } = body;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    if (!isUrlAllowed(url)) {
      return NextResponse.json(
        { error: "Only https URLs are allowed." },
        { status: 400 }
      );
    }

    // Fetch the webpage
    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; EasyToGiveBot/1.0; +https://easytogive.org)",
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Could not fetch that URL: ${msg}` },
        { status: 422 }
      );
    }

    // Strip HTML tags and truncate
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 15_000);

    const prompt = `You are helping a nonprofit or church create their donor-facing profile on a charitable giving platform called EasyToGive.

Based on the website content below, write three pieces of copy for their profile:

1. tagline — A short, punchy one-liner that captures their mission (max 120 characters). Should sound human, not corporate.
2. description — 2–3 sentences explaining what the organization does and who it helps (max 400 characters). Clear and specific.
3. our_story — A warm, genuine 3–5 sentence narrative about why the organization exists, what drives them, and the impact they're making (max 1000 characters). Write in second person ("Your donations help...") or third person. Avoid buzzwords like "empower", "leverage", "synergy", "transformative".

Website URL: ${url}

Website text (may be truncated):
${text}

Return ONLY valid JSON — no markdown, no explanation:
{
  "tagline": "...",
  "description": "...",
  "our_story": "..."
}

If you cannot determine enough information from the website, return your best attempt based on what's available.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `AI error: ${errText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

    let parsed: { tagline?: string; description?: string; our_story?: string };
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned an unexpected response. Please try again." },
        { status: 502 }
      );
    }

    // Enforce character limits
    return NextResponse.json({
      tagline: (parsed.tagline ?? "").slice(0, 120),
      description: (parsed.description ?? "").slice(0, 400),
      our_story: (parsed.our_story ?? "").slice(0, 1000),
    });
  } catch (err: unknown) {
    console.error("autofill-profile error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
