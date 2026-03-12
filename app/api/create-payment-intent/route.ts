import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_METADATA_KEYS = 20;
const MAX_METADATA_VALUE_LENGTH = 500;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

export interface CreatePaymentIntentBody {
  amountCents: number;
  description: string;
  metadata?: Record<string, string>;
}

function sanitizeMetadata(metadata: Record<string, string> | undefined): Record<string, string> {
  if (!metadata || typeof metadata !== "object") return {};
  const out: Record<string, string> = {};
  const entries = Object.entries(metadata).slice(0, MAX_METADATA_KEYS);
  for (const [k, v] of entries) {
    if (typeof k === "string" && typeof v === "string" && k.length <= 40) {
      out[k] = String(v).slice(0, MAX_METADATA_VALUE_LENGTH);
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Payment system is temporarily unavailable." },
        { status: 503 }
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { allowed } = checkRateLimit(ip, "create-payment-intent", 30, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    let body: CreatePaymentIntentBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { amountCents, description, metadata } = body;

    if (typeof amountCents !== "number" || amountCents < 50) {
      return NextResponse.json(
        { error: "Minimum donation amount is $0.50." },
        { status: 400 }
      );
    }

    if (amountCents > 99999900) {
      return NextResponse.json(
        { error: "Donation amount exceeds the maximum limit." },
        { status: 400 }
      );
    }

    const safeDescription =
      typeof description === "string"
        ? description.slice(0, MAX_DESCRIPTION_LENGTH).trim() || "Donation"
        : "Donation";
    const safeMetadata = sanitizeMetadata(metadata);

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      description: safeDescription,
      metadata: safeMetadata,
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe PaymentIntent error:", err);
    return NextResponse.json(
      { error: "Failed to create payment intent. Please try again." },
      { status: 500 }
    );
  }
}
