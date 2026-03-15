import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  // Authenticate the caller — userId must come from the verified session
  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { recurringDonationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { recurringDonationId } = body;
  if (!recurringDonationId) {
    return NextResponse.json({ error: "recurringDonationId required." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch the row — verify it belongs to the authenticated user
  const { data: row, error: fetchErr } = await supabase
    .from("recurring_donations")
    .select("id, stripe_subscription_id, user_id")
    .eq("id", recurringDonationId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Recurring donation not found." }, { status: 404 });
  }

  // Cancel in Stripe if we have a subscription ID
  if (row.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(row.stripe_subscription_id);
    } catch (err: unknown) {
      const stripeErr = err as { code?: string };
      // If already cancelled in Stripe, continue marking inactive in DB
      if (stripeErr?.code !== "resource_missing") {
        console.error("Stripe subscription cancel error:", err);
        return NextResponse.json({ error: "Failed to cancel subscription in Stripe." }, { status: 500 });
      }
    }
  }

  // Mark inactive in DB
  await supabase
    .from("recurring_donations")
    .update({ active: false })
    .eq("id", recurringDonationId);

  return NextResponse.json({ success: true });
}
