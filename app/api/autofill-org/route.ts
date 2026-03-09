import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Valid categories in our DB enum
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

    // Strip HTML tags and truncate so we stay within token limits
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

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Parse the JSON Claude returned
    let parsed: Record<string, unknown>;
    try {
      // Strip markdown code fences if Claude wrapped it anyway
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
