import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function getSupabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

const INTERVAL_MAP: Record<string, { interval: Stripe.PriceCreateParams.Recurring.Interval; interval_count: number }> = {
  weekly:    { interval: "week",  interval_count: 1 },
  biweekly:  { interval: "week",  interval_count: 2 },
  monthly:   { interval: "month", interval_count: 1 },
  yearly:    { interval: "year",  interval_count: 1 },
};

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payment system unavailable." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = checkRateLimit(ip, "create-subscription", 10, 60 * 60 * 1000); // 10 per hour
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  interface AllocationInput { orgId: string; orgName: string; amountCents: number; }

  let body: {
    amountCents: number;
    orgId?: string;
    donorId?: string;
    donorEmail?: string;
    frequency?: string;
    allocations?: AllocationInput[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { amountCents, orgId, donorId, donorEmail, frequency = "monthly", allocations } = body;

  if (typeof amountCents !== "number" || amountCents < 50) {
    return NextResponse.json({ error: "Minimum donation amount is $0.50." }, { status: 400 });
  }

  const intervalConfig = INTERVAL_MAP[frequency] ?? INTERVAL_MAP.monthly;

  try {
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();
    const supabasePublic = getSupabasePublic();

    // ── Resolve org name and Connect account ──────────────────────────────────
    let orgName = "EasyToGive";
    let stripeAccountId: string | null = null;

    if (orgId) {
      const { data: org } = await supabasePublic
        .from("organizations")
        .select("name, stripe_account_id, stripe_onboarding_complete")
        .eq("id", orgId)
        .single();

      if (org) {
        orgName = org.name ?? orgName;
        if (org.stripe_onboarding_complete && org.stripe_account_id) {
          stripeAccountId = org.stripe_account_id;
        }
      }
    }

    // ── Get or create Stripe Customer ─────────────────────────────────────────
    let stripeCustomerId: string | null = null;

    if (donorId) {
      // Check if we already have a customer ID for this user
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("stripe_customer_id")
        .eq("id", donorId)
        .maybeSingle();

      stripeCustomerId = userRow?.stripe_customer_id ?? null;
    }

    if (!stripeCustomerId) {
      // Create a new Stripe Customer
      const customerData: Stripe.CustomerCreateParams = {};
      if (donorEmail) customerData.email = donorEmail;
      if (donorId) customerData.metadata = { supabase_user_id: donorId };

      const customer = await stripe.customers.create(customerData);
      stripeCustomerId = customer.id;

      // Persist the customer ID on the user record
      if (donorId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        await supabaseAdmin
          .from("users")
          .upsert({ id: donorId, stripe_customer_id: stripeCustomerId }, { onConflict: "id" });
      }
    }

    // ── Frequency label for product name ──────────────────────────────────────
    const freqLabel = frequency.charAt(0).toUpperCase() + frequency.slice(1);

    // ── Create subscription ───────────────────────────────────────────────────
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: stripeCustomerId,
      items: [
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          price_data: {
            currency: "usd",
            product_data: {
              name: `${freqLabel} donation to ${orgName} via EasyToGive`,
            },
            unit_amount: amountCents,
            recurring: intervalConfig,
          } as any,
        },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        platform: "easytogive",
        ...(orgId ? { orgId } : {}),
        ...(donorId ? { donorId } : {}),
        frequency,
      },
    };

    // Connect: route to org's account with 1% platform fee
    if (stripeAccountId) {
      subscriptionParams.application_fee_percent = 1;
      subscriptionParams.transfer_data = { destination: stripeAccountId };
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Extract clientSecret from the latest invoice's payment intent (expanded)
    const latestInvoice = subscription.latest_invoice as (Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent }) | null;
    const paymentIntent = latestInvoice?.payment_intent ?? null;
    const clientSecret = paymentIntent?.client_secret;

    if (!clientSecret) {
      return NextResponse.json(
        { error: "Could not initialize subscription payment. Please try again." },
        { status: 500 }
      );
    }

    // ── Record in recurring_donations for display/cancellation ───────────────
    if (donorId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const rows = allocations && allocations.length > 0
          ? allocations.map((a) => ({
              user_id: donorId,
              org_id: a.orgId,
              org_name: a.orgName,
              amount_cents: a.amountCents,
              frequency,
              active: true,
              stripe_subscription_id: subscription.id,
            }))
          : orgId
          ? [{
              user_id: donorId,
              org_id: orgId,
              org_name: orgName,
              amount_cents: amountCents,
              frequency,
              active: true,
              stripe_subscription_id: subscription.id,
            }]
          : [];

        if (rows.length > 0) {
          await supabaseAdmin.from("recurring_donations").insert(rows);
        }
      } catch {
        // Non-fatal — subscription was created successfully
      }
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      chargeAmount: amountCents / 100,
    });
  } catch (err) {
    console.error("Stripe Subscription error:", err);
    return NextResponse.json(
      { error: "Failed to create subscription. Please try again." },
      { status: 500 }
    );
  }
}
