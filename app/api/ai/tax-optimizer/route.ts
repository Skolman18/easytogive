import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const client = new Anthropic();

export interface TaxOptimizerRequest {
  filingStatus: "single" | "mfj" | "mfs" | "hoh";
  grossIncome: number;
  otherItemizedDeductions: number;
  totalDonationsDollars: number;
  donationBreakdown?: { orgName: string; amount: number; date: string }[];
  mode: "calculate" | "target";
  targetSavings?: number;
  taxYear: number;
}

const STATUS_LABELS: Record<string, string> = {
  single: "Single",
  mfj: "Married Filing Jointly",
  mfs: "Married Filing Separately",
  hoh: "Head of Household",
};

// Standard deductions by year and filing status
const STANDARD_DEDUCTIONS: Record<number, Record<string, number>> = {
  2024: { single: 14600, mfj: 29200, mfs: 14600, hoh: 21900 },
  2025: { single: 15000, mfj: 30000, mfs: 15000, hoh: 22500 },
};

function buildPrompt(req: TaxOptimizerRequest): string {
  const year = req.taxYear;
  const stdDed = STANDARD_DEDUCTIONS[year]?.[req.filingStatus] ?? 14600;
  const status = STATUS_LABELS[req.filingStatus];

  const donationLines =
    req.donationBreakdown && req.donationBreakdown.length > 0
      ? req.donationBreakdown
          .map((d) => `  - ${d.orgName}: $${d.amount.toFixed(2)} (${d.date})`)
          .join("\n")
      : "  (No individual records — using total provided)";

  if (req.mode === "calculate") {
    return `Help me understand my ${year} charitable donation tax deductions.

## My tax situation
- Filing status: ${status}
- Gross income (AGI): $${req.grossIncome.toLocaleString()}
- Other itemized deductions (mortgage interest, state/local taxes, etc.): $${req.otherItemizedDeductions.toLocaleString()}
- Total charitable donations this year: $${req.totalDonationsDollars.toLocaleString()}
- Standard deduction for my filing status in ${year}: $${stdDed.toLocaleString()}

## My donation breakdown
${donationLines}

## Please answer:
1. Should I itemize or take the standard deduction? Show me the numbers side-by-side.
2. How much does my charitable giving reduce my taxable income?
3. What is my estimated tax savings from these donations? Calculate this using the appropriate marginal tax bracket.
4. Am I close to the 60% AGI limit for cash charitable contributions? How much headroom do I have?
5. What could I do differently to maximize the tax benefit of my giving?

Show all calculations step by step. Use clear dollar amounts. Be specific about the ${year} tax rules.`;
  } else {
    return `I want to reduce my ${year} taxes by $${(req.targetSavings ?? 0).toLocaleString()} through charitable donations. Tell me what I need to do.

## My current tax situation
- Filing status: ${status}
- Gross income (AGI): $${req.grossIncome.toLocaleString()}
- Other itemized deductions (mortgage interest, state/local taxes, etc.): $${req.otherItemizedDeductions.toLocaleString()}
- Charitable donations given so far this year: $${req.totalDonationsDollars.toLocaleString()}
- Standard deduction for my filing status in ${year}: $${stdDed.toLocaleString()}

## Donations so far
${donationLines}

## My goal: Save $${(req.targetSavings ?? 0).toLocaleString()} in taxes

## Please answer:
1. Am I currently itemizing or using the standard deduction? Would I need to switch?
2. Exactly how much additional do I need to donate to save $${(req.targetSavings ?? 0).toLocaleString()} in taxes? Show the math.
3. What's the total I need to give this year (including what I've already donated)?
4. Is my target realistic given my income and marginal tax rate? Explain the relationship between donation amount and tax savings.
5. Are there any strategies that could make my dollars go further (Donor-Advised Funds, bunching, Qualified Charitable Distributions if I'm 70½+)?

Show all calculations step by step. Be specific with numbers for ${year}.`;
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: TaxOptimizerRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.grossIncome || body.grossIncome < 0) {
    return new Response(JSON.stringify({ error: "Valid gross income required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const messageStream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: `You are a knowledgeable tax education assistant specializing in US charitable giving deductions.
You provide clear, accurate, and educational information about how charitable donations affect federal income taxes.
Always show your calculations step by step with specific numbers.
Use markdown formatting: ## for section headers, **bold** for key figures, and bullet lists for options.
End every response with a brief disclaimer: "⚠️ This is educational information, not professional tax advice. Consult a CPA or tax advisor for your specific situation."`,
    messages: [{ role: "user", content: buildPrompt(body) }],
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        messageStream.on("text", (delta) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`)
          );
        });
        await messageStream.finalMessage();
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("Tax optimizer stream error:", err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
