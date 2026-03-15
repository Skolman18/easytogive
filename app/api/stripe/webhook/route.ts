import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReceiptEmail } from "@/lib/email";

// Must be dynamic so Next.js doesn't buffer the body (needed for signature verification)
export const dynamic = "force-dynamic";

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

async function getDonorInfo(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  donorId: string
): Promise<{ email: string | null; name: string | null }> {
  try {
    const [authRes, profileRes] = await Promise.all([
      supabase.auth.admin.getUserById(donorId),
      supabase.from("users").select("full_name").eq("id", donorId).single(),
    ]);
    return {
      email: authRes.data?.user?.email ?? null,
      name: (profileRes.data as any)?.full_name || null,
    };
  } catch {
    return { email: null, name: null };
  }
}

async function getOrgInfo(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orgId: string
): Promise<{ name: string; ein: string | null }> {
  try {
    const { data } = await supabase.from("organizations").select("name, ein").eq("id", orgId).single();
    return { name: data?.name ?? "an organization", ein: (data as any)?.ein ?? null };
  } catch {
    return { name: "an organization", ein: null };
  }
}

async function incrementOrgStats(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orgId: string,
  amountCents: number,
  donorId: string | null
): Promise<void> {
  try {
    const addedDollars = Math.floor(amountCents / 100);
    // Use an atomic Postgres function to avoid read-modify-write race conditions
    await supabase.rpc("increment_org_raised", {
      p_org_id: orgId,
      p_dollars: addedDollars,
      p_donor_id: donorId ?? null,
    });
  } catch (err) {
    console.error("Failed to increment org stats:", err);
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Webhook signature failed" }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Can't persist data but still acknowledge to Stripe
    return NextResponse.json({ received: true });
  }

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata ?? {};

        // Idempotency check — skip if already recorded
        const { data: existing } = await supabase
          .from("donations")
          .select("id")
          .eq("stripe_payment_intent_id", pi.id)
          .maybeSingle();

        if (!existing) {
          const donationAmountCents = meta.donationAmount
            ? parseInt(meta.donationAmount, 10)
            : pi.amount;
          const feeAmountCents = pi.application_fee_amount ?? 0;
          const feeCovered = meta.coverFee === "true";
          const receiptId = `ETG-${pi.id.replace("pi_", "").slice(0, 12).toUpperCase()}`;
          const now = new Date().toISOString();

          // Parse multi-org allocations if present: "orgId|cents,orgId|cents,..."
          const allocParts = meta.allocations
            ? meta.allocations.split(",").map((s: string) => {
                const [oId, cStr] = s.split("|");
                return { orgId: oId, amountCents: parseInt(cStr, 10) || 0 };
              }).filter((a: { orgId: string; amountCents: number }) => a.orgId && a.amountCents > 0)
            : [];

          if (allocParts.length > 1) {
            // Portfolio donation — one record per allocation, first gets the receipt ID
            const rows = allocParts.map((a: { orgId: string; amountCents: number }, i: number) => ({
              user_id: meta.donorId || null,
              org_id: a.orgId,
              amount: a.amountCents,
              fee_amount: i === 0 ? feeAmountCents : 0,
              fee_covered: feeCovered,
              stripe_payment_intent_id: pi.id,
              receipt_id: i === 0 ? receiptId : `${receiptId}-${i}`,
              donated_at: now,
            }));
            await supabase.from("donations").insert(rows);

            for (const a of allocParts) {
              await incrementOrgStats(supabase, a.orgId, a.amountCents, meta.donorId || null);
            }
          } else {
            // Single org donation
            await supabase.from("donations").insert({
              user_id: meta.donorId || null,
              org_id: meta.orgId || null,
              amount: donationAmountCents,
              fee_amount: feeAmountCents,
              fee_covered: feeCovered,
              stripe_payment_intent_id: pi.id,
              receipt_id: receiptId,
              donated_at: now,
            });

            if (meta.orgId) {
              await incrementOrgStats(supabase, meta.orgId, donationAmountCents, meta.donorId || null);
            }
          }

          // Send receipt email
          if (meta.donorId) {
            const primaryOrgId = meta.orgId || (allocParts[0]?.orgId ?? null);
            const [donor, orgInfo] = await Promise.all([
              getDonorInfo(supabase, meta.donorId),
              primaryOrgId ? getOrgInfo(supabase, primaryOrgId) : Promise.resolve({ name: meta.orgName ?? "EasyToGive", ein: null }),
            ]);
            if (donor.email) {
              const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://easytogive.online";
              await sendReceiptEmail({
                to: donor.email,
                donorName: donor.name,
                orgName: allocParts.length > 1 ? "EasyToGive Portfolio" : orgInfo.name,
                orgEin: allocParts.length > 1 ? null : orgInfo.ein,
                amountCents: donationAmountCents,
                receiptId,
                donatedAt: now,
                receiptUrl: `${baseUrl}/receipts/${encodeURIComponent(receiptId)}`,
              });
            }
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | null;
          payment_intent?: string | null;
        };
        // Only record subscription invoices (not one-off)
        if (!invoice.subscription) break;

        // Retrieve subscription metadata
        const stripeClient = getStripe();
        const sub = await stripeClient.subscriptions.retrieve(invoice.subscription);
        const meta = sub.metadata ?? {};

        const piId = invoice.payment_intent ?? null;
        if (!piId) break;

        // Idempotency — use payment intent ID
        const { data: existingInv } = await supabase
          .from("donations")
          .select("id")
          .eq("stripe_payment_intent_id", piId)
          .maybeSingle();

        if (!existingInv && invoice.amount_paid > 0) {
          const receiptId = `ETG-REC-${(invoice.id ?? "").replace("in_", "").slice(0, 12).toUpperCase()}`;
          const now = new Date().toISOString();

          await supabase.from("donations").insert({
            user_id: meta.donorId || null,
            org_id: meta.orgId || null,
            amount: invoice.amount_paid,
            fee_amount: 0,
            fee_covered: false,
            stripe_payment_intent_id: piId,
            receipt_id: receiptId,
            donated_at: now,
          });

          // Update org raised total (raised stored in dollars, amount in cents)
          if (meta.orgId) {
            await incrementOrgStats(supabase, meta.orgId, invoice.amount_paid, meta.donorId || null);
          }

          // Send recurring receipt email
          if (meta.donorId) {
            const [donor, orgInfo] = await Promise.all([
              getDonorInfo(supabase, meta.donorId),
              meta.orgId ? getOrgInfo(supabase, meta.orgId) : Promise.resolve({ name: "EasyToGive", ein: null }),
            ]);
            if (donor.email) {
              const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://easytogive.online";
              await sendReceiptEmail({
                to: donor.email,
                donorName: donor.name,
                orgName: orgInfo.name,
                orgEin: orgInfo.ein,
                amountCents: invoice.amount_paid,
                receiptId,
                donatedAt: now,
                isRecurring: true,
                frequency: meta.frequency,
                receiptUrl: `${baseUrl}/receipts/${encodeURIComponent(receiptId)}`,
              });
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.id) {
          await supabase
            .from("recurring_donations")
            .update({ active: false })
            .eq("stripe_subscription_id", sub.id);
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        if (account.charges_enabled && account.payouts_enabled) {
          await supabase
            .from("organizations")
            .update({ stripe_onboarding_complete: true })
            .eq("stripe_account_id", account.id);
        }
        break;
      }
    }
  } catch (err) {
    // Log but don't return 500 — Stripe would keep retrying
    console.error(`Error handling ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}
