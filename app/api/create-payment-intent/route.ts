import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export interface CreatePaymentIntentBody {
  amountCents: number;
  description: string;
  metadata?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreatePaymentIntentBody = await req.json();
    const { amountCents, description, metadata } = body;

    if (!amountCents || amountCents < 50) {
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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      description,
      metadata: metadata ?? {},
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
