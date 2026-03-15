import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  // Require authentication
  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    const isComplete = !!(account.charges_enabled && account.payouts_enabled);

    if (isComplete && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getSupabaseAdmin();
      await supabase
        .from("organizations")
        .update({ stripe_onboarding_complete: true })
        .eq("stripe_account_id", accountId);
    }

    return NextResponse.json({
      isComplete,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (err) {
    console.error("connect/account-status error:", err);
    return NextResponse.json({ error: "Failed to retrieve account status" }, { status: 500 });
  }
}
