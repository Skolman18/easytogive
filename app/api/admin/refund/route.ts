import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover" as any,
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const db = getSupabaseAdmin();
  const { donationId, amount, reason } = await req.json();

  if (!donationId || !amount || !reason?.trim()) {
    return NextResponse.json(
      { error: "donationId, amount (cents), and reason are required" },
      { status: 400 }
    );
  }

  // Fetch the donation
  const { data: donation, error: fetchErr } = await db
    .from("donations")
    .select("id, amount, stripe_payment_intent_id, status, user_id, org_name")
    .eq("id", donationId)
    .maybeSingle();

  if (fetchErr || !donation) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  const d = donation as any;

  if (d.status === "refunded") {
    return NextResponse.json({ error: "Donation already refunded" }, { status: 400 });
  }
  if (!d.stripe_payment_intent_id) {
    return NextResponse.json(
      { error: "No Stripe payment intent ID on this donation" },
      { status: 400 }
    );
  }
  if (amount > d.amount) {
    return NextResponse.json(
      { error: "Refund amount exceeds original donation" },
      { status: 400 }
    );
  }

  // Issue Stripe refund
  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: d.stripe_payment_intent_id,
      amount: amount,
    });
  } catch (stripeErr: any) {
    return NextResponse.json(
      { error: `Stripe refund failed: ${stripeErr.message}` },
      { status: 500 }
    );
  }

  // Update donation in Supabase
  const newStatus = amount >= d.amount ? "refunded" : "partial_refund";

  const { error: updateErr } = await db
    .from("donations")
    .update({
      status: newStatus,
      refund_amount: amount,
      refund_reason: reason.trim(),
    } as any)
    .eq("id", donationId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await logAdminAction("refund_issued", "donation", donationId, {
    amountCents: amount,
    reason: reason.trim(),
    stripeRefundId: refund.id,
    orgName: d.org_name,
    performedBy: (auth as { user: { email: string } }).user.email,
  });

  console.log(`[admin/refund] Refund issued — donationId: ${donationId}, amount: ${amount}¢, stripeRefundId: ${refund.id}`);

  return NextResponse.json({ success: true, refundId: refund.id, status: newStatus });
}
