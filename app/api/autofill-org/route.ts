import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { createClient as createServerClient } from "@/lib/supabase-server";

const ADMIN_EMAIL = "sethmitzel@gmail.com";

const VALID_CATEGORIES = [
  "nonprofits",
  "education",
  "environment",
  "churches",
  "animal-rescue",
  "local",
];

/** Allow only https URLs and block localhost / private IPs to prevent SSRF. */
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
  // Loopback / localhost
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) return false;
  // IPv6 loopback and unspecified
  if (host === "[::1]" || host === "0.0.0.0") return false;
  // RFC-1918 private ranges
  if (host.startsWith("192.168.") || host.startsWith("10.")) return false;
  // 172.16.0.0/12 → 172.16.x.x through 172.31.x.x
  const m = host.match(/^172\.(\d+)\./);
  if (m && parseInt(m[1], 10) >= 16 && parseInt(m[1], 10) <= 31) return false;
  // Link-local (169.254.0.0/16) — includes AWS/GCP/Azure metadata endpoints
  if (host.startsWith("169.254.")) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Admin only
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Autofill is temporarily unavailable." },
        { status: 503 }
      );
    }

    // Rate limit: max 10 autofill requests per IP per hour
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { allowed } = checkRateLimit(ip, "autofill-org", 10, 60 * 60 * 1000);
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
        { error: "Only https URLs are allowed. Localhost and private URLs are not permitted." },
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
        { error: `Could not fetch URL: ${msg}` },
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

    const prompt = `You are extracting structured data about a nonprofit organization from its website text.

Website URL: ${url}

Website text (may be truncated):
${text}

Extract the following fields and return ONLY valid JSON — no markdown, no explanation:
{
  "name": "Full official organization name",
  "tagline": "Short one-line mission statement or slogan (max 120 chars)",
  "description": "2-4 sentence description of what the org does and why (max 400 chars)",
  "category": "One of: ${VALID_CATEGORIES.join(", ")}",
  "location": "City, State (e.g. Austin, TX) or City, Country if outside US",
  "ein": "EIN in format XX-XXXXXXX if found, otherwise empty string",
  "founded": year as integer (e.g. 1998) or null if not found,
  "website": "Canonical website URL",
  "tags": ["array", "of", "3-6", "lowercase", "keyword", "tags"]
}

Rules:
- Return ONLY the JSON object, nothing else.
- If a field cannot be determined, use null (or empty string for ein, empty array for tags).
- category MUST be one of the listed values; pick the closest match.
- tags should describe the cause area (e.g. "hunger", "youth", "veterans", "climate").`;

    // Call Groq API
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
        { error: `Groq API error: ${errText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Parse the JSON Groq returned
    let parsed: Record<string, unknown>;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned malformed JSON. Please try again." },
        { status: 502 }
      );
    }

    // Sanitize category
    if (!VALID_CATEGORIES.includes(parsed.category as string)) {
      parsed.category = "nonprofits";
    }

    // Ensure tags is an array
    if (!Array.isArray(parsed.tags)) parsed.tags = [];

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("autofill-org error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
