import { NextRequest, NextResponse } from "next/server";

const VALID_CATEGORIES = [
  "nonprofits",
  "education",
  "health",
  "environment",
  "arts",
  "community",
  "animals",
  "international",
  "churches",
  "animal-rescue",
  "local",
];

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
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
