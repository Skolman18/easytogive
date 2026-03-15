import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_METADATA_KEYS = 20;
const MAX_METADATA_VALUE_LENGTH = 500;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

// Use anon key to read public org data (organizations table has public read RLS)
function getSupabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface CreatePaymentIntentBody {
  amountCents: number;
  description?: string;
  metadata?: Record<string, string>;
  // Connect fields (optional — falls back to direct charge if omitted)
  orgId?: string;
  donorId?: string;
  coverFee?: boolean;
  // Portfolio: per-org allocation breakdown for multi-org donations
  allocations?: { orgId: string; orgName: string; amountCents: number }[];
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
    const { allowed, retryAfterMs } = checkRateLimit(ip, "create-payment-intent", 30, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
        }
      );
    }

    let body: CreatePaymentIntentBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { amountCents, description, metadata, orgId, donorId, coverFee, allocations } = body;

    // amountCents = what the DONOR was quoted (donation amount, before fee if not covering)
    if (typeof amountCents !== "number" || amountCents < 50) {
      return NextResponse.json({ error: "Minimum donation amount is $0.50." }, { status: 400 });
    }
    if (amountCents > 99999900) {
      return NextResponse.json({ error: "Donation amount exceeds the maximum limit." }, { status: 400 });
    }

    const safeDescription =
      typeof description === "string"
        ? description.slice(0, MAX_DESCRIPTION_LENGTH).trim() || "Donation"
        : "Donation";

    const stripe = getStripe();

    // ── Stripe Connect path (org has a connected account) ──────────────────
    if (orgId) {
      const supabase = getSupabasePublic();
      const { data: org } = await supabase
        .from("organizations")
        .select("stripe_account_id, stripe_onboarding_complete, name")
        .eq("id", orgId)
        .single();

      if (org?.stripe_account_id && org?.stripe_onboarding_complete) {
        const donationAmountCents = amountCents; // the base donation
        const platformFeeCents = Math.max(1, Math.round(donationAmountCents * 0.01)); // 1% fee, min 1¢
        // If donor covers fee: charge them donation + fee; org receives full donation
        // If donor doesn't cover: charge just the donation; org receives donation minus fee
        const chargeAmountCents = coverFee
          ? donationAmountCents + platformFeeCents
          : donationAmountCents;

        const connectMetadata: Record<string, string> = {
          platform: "easytogive",
          orgId: orgId.slice(0, 500),
          orgName: (org.name ?? "").slice(0, 500),
          donationAmount: String(donationAmountCents),
          coverFee: String(!!coverFee),
          ...(donorId ? { donorId: donorId.slice(0, 500) } : {}),
        };

        const paymentIntent = await stripe.paymentIntents.create({
          amount: chargeAmountCents,
          currency: "usd",
          description: safeDescription || `EasyToGive donation to ${org.name}`,
          application_fee_amount: platformFeeCents,
          transfer_data: { destination: org.stripe_account_id },
          metadata: connectMetadata,
          automatic_payment_methods: { enabled: true },
        });

        return NextResponse.json({
          clientSecret: paymentIntent.client_secret,
          platformFee: platformFeeCents / 100,
          chargeAmount: chargeAmountCents / 100,
        });
      }
    }

    // ── Direct charge fallback (no Connect account yet, or portfolio donation) ──
    // Serialize allocations compactly for the webhook: "orgId|cents,orgId|cents,..."
    // Split across multiple metadata keys (allocations, allocations2, ...) so large
    // portfolios don't get silently truncated by Stripe's 500-char per-value limit.
    const allocationChunks: Record<string, string> = {};
    if (allocations && allocations.length > 1) {
      const entries = allocations.map((a) => `${a.orgId.slice(0, 60)}|${a.amountCents}`);
      let chunk = "";
      let chunkIdx = 0;
      for (const entry of entries) {
        const candidate = chunk ? `${chunk},${entry}` : entry;
        if (candidate.length > 490) {
          const key = chunkIdx === 0 ? "allocations" : `allocations${chunkIdx + 1}`;
          allocationChunks[key] = chunk;
          chunk = entry;
          chunkIdx++;
        } else {
          chunk = candidate;
        }
      }
      if (chunk) {
        const key = chunkIdx === 0 ? "allocations" : `allocations${chunkIdx + 1}`;
        allocationChunks[key] = chunk;
      }
    }

    const safeMetadata = sanitizeMetadata({
      ...metadata,
      ...(orgId ? { orgId: orgId.slice(0, 500) } : {}),
      ...(donorId ? { donorId: donorId.slice(0, 500) } : {}),
      ...(coverFee !== undefined ? { coverFee: String(!!coverFee) } : {}),
      ...allocationChunks,
      platform: "easytogive",
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      description: safeDescription,
      metadata: safeMetadata,
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      platformFee: 0,
      chargeAmount: amountCents / 100,
    });
  } catch (err) {
    console.error("Stripe PaymentIntent error:", err);
    return NextResponse.json(
      { error: "Failed to create payment intent. Please try again." },
      { status: 500 }
    );
  }
}
