import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

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
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI fill is temporarily unavailable." },
        { status: 503 }
      );
    }

    // Rate limit by IP: 5 per hour
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { allowed } = checkRateLimit(ip, "autofill-signup", 5, 60 * 60 * 1000);
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
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
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

    // Strip HTML and truncate
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 15_000);

    const prompt = `You are helping a nonprofit or church fill out their application to list on EasyToGive, a charitable giving platform.

Based on the website content below, extract two pieces of information:

1. name — The official organization name (e.g. "Grace Community Church" or "Second Harvest Food Bank")
2. description — 2–3 sentences describing what the organization does and who it helps (max 400 characters). Clear, specific, and human-sounding. No buzzwords like "empower", "leverage", or "transformative".

Website URL: ${url}

Website text (may be truncated):
${text}

Return ONLY valid JSON — no markdown, no explanation:
{
  "name": "...",
  "description": "..."
}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "AI service unavailable. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

    let parsed: { name?: string; description?: string };
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned an unexpected response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      name: (parsed.name ?? "").trim(),
      description: (parsed.description ?? "").slice(0, 400),
    });
  } catch (err: unknown) {
    console.error("autofill-signup error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
