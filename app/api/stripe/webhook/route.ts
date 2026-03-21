import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReceiptEmail } from "@/lib/email";
import { generateReceiptPdf } from "@/lib/generateReceiptPdf";

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

function generateReceiptNumber(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RCP-${ts}-${rand}`;
}

async function generateAndStoreReceipt(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  receiptRow: {
    id: string;
    donor_id: string | null;
    receipt_number: string;
    type: "individual" | "portfolio_summary";
    amount: number;
    created_at: string;
  },
  orgs: Array<{ name: string; ein: string | null; amount: number }>,
  donorEmail: string,
  donorName: string | null
): Promise<Buffer | null> {
  const pdfBuffer = await generateReceiptPdf({
    receiptNumber: receiptRow.receipt_number,
    donorName,
    donorEmail,
    createdAt: new Date(receiptRow.created_at),
    type: receiptRow.type,
    orgs,
    totalAmount: receiptRow.amount,
  });

  // Guest donors: generate PDF but skip storage upload
  if (!receiptRow.donor_id) {
    await supabase
      .from("receipts")
      .update({ pdf_status: "generated" })
      .eq("id", receiptRow.id);
    return pdfBuffer;
  }

  const storagePath = `${receiptRow.donor_id}/${receiptRow.id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) throw uploadError;

  await supabase
    .from("receipts")
    .update({ pdf_url: storagePath, pdf_status: "generated" })
    .eq("id", receiptRow.id);

  return pdfBuffer;
}

async function incrementOrgStats(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orgId: string,
  amountCents: number,
  donorId: string | null
): Promise<void> {
  const addedDollars = Math.floor(amountCents / 100);
  try {
    // Use an atomic Postgres function to avoid read-modify-write race conditions
    const { error } = await supabase.rpc("increment_org_raised", {
      p_org_id: orgId,
      p_dollars: addedDollars,
      p_donor_id: donorId ?? null,
    });
    if (error) throw error;
  } catch (rpcErr) {
    console.error(`increment_org_raised RPC failed for ${orgId}, falling back to direct update:`, rpcErr);
    // Fallback: direct update (not atomic, but better than silent failure)
    try {
      const { data: current } = await supabase
        .from("organizations")
        .select("raised, donors")
        .eq("id", orgId)
        .single();
      if (current) {
        const newDonors = donorId
          ? (current.donors ?? 0) + 1
          : (current.donors ?? 0);
        await supabase
          .from("organizations")
          .update({ raised: (current.raised ?? 0) + addedDollars, donors: newDonors })
          .eq("id", orgId);
      }
    } catch (fallbackErr) {
      console.error(`Fallback org stats update also failed for ${orgId}:`, fallbackErr);
    }
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
          const parsedDonationAmount = meta.donationAmount ? parseInt(meta.donationAmount, 10) : NaN;
          const donationAmountCents =
            !isNaN(parsedDonationAmount) && parsedDonationAmount > 0
              ? parsedDonationAmount
              : pi.amount;
          const feeAmountCents = pi.application_fee_amount ?? 0;
          const feeCovered = meta.coverFee === "true";
          const receiptId = `ETG-${pi.id.replace("pi_", "").slice(0, 12).toUpperCase()}`;
          const now = new Date().toISOString();

          // Parse multi-org allocations if present: "orgId|cents,orgId|cents,..."
          // May be split across allocations, allocations2, allocations3, ... keys.
          const rawAllocStr = [
            meta.allocations,
            meta.allocations2,
            meta.allocations3,
            meta.allocations4,
            meta.allocations5,
          ].filter(Boolean).join(",");
          const allocParts = rawAllocStr
            ? rawAllocStr.split(",").map((s: string) => {
                const [oId, cStr] = s.split("|");
                return { orgId: oId?.trim(), amountCents: parseInt(cStr, 10) || 0 };
              }).filter((a: { orgId: string; amountCents: number }) => a.orgId && a.amountCents > 0)
            : [];

          let inserted = false;
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
            const { error: insertErr } = await supabase.from("donations").insert(rows);
            if (insertErr) {
              // 23505 = unique_violation; means a concurrent webhook already inserted — skip
              if ((insertErr as any).code === "23505") break;
              throw insertErr;
            }
            inserted = true;
            for (const a of allocParts) {
              await incrementOrgStats(supabase, a.orgId, a.amountCents, meta.donorId || null);
            }
          } else {
            // Single org donation
            const { error: insertErr } = await supabase.from("donations").insert({
              user_id: meta.donorId || null,
              org_id: meta.orgId || null,
              amount: donationAmountCents,
              fee_amount: feeAmountCents,
              fee_covered: feeCovered,
              stripe_payment_intent_id: pi.id,
              receipt_id: receiptId,
              donated_at: now,
            });
            if (insertErr) {
              if ((insertErr as any).code === "23505") break;
              throw insertErr;
            }
            inserted = true;
            if (meta.orgId) {
              await incrementOrgStats(supabase, meta.orgId, donationAmountCents, meta.donorId || null);
            }
          }

          // Generate receipts + send email — inside idempotency guard, only on first delivery
          if (inserted) {
            try {
              const primaryOrgId = meta.orgId || (allocParts[0]?.orgId ?? null);
              const now2 = new Date().toISOString();

              // Fetch donor + org info
              const [donor, primaryOrgInfo] = await Promise.all([
                meta.donorId
                  ? getDonorInfo(supabase, meta.donorId)
                  : Promise.resolve({ email: null, name: null }),
                primaryOrgId
                  ? getOrgInfo(supabase, primaryOrgId)
                  : Promise.resolve({ name: meta.orgName ?? "EasyToGive", ein: null }),
              ]);

              // Fetch all org info for portfolio
              const allOrgInfos: Array<{ orgId: string; name: string; ein: string | null; amountCents: number }> = [];
              if (allocParts.length > 1) {
                const orgFetches = allocParts.map((a: { orgId: string; amountCents: number }) =>
                  getOrgInfo(supabase, a.orgId).then((info) => ({
                    orgId: a.orgId,
                    name: info.name,
                    ein: info.ein,
                    amountCents: a.amountCents,
                  }))
                );
                allOrgInfos.push(...(await Promise.all(orgFetches)));
              }

              // Fetch donation IDs just inserted (for donation_ids column)
              const { data: justInserted } = await supabase
                .from("donations")
                .select("id, org_id")
                .eq("stripe_payment_intent_id", pi.id);
              const donationIdMap: Record<string, string> = {};
              for (const row of justInserted ?? []) {
                if (row.org_id) donationIdMap[row.org_id] = row.id;
              }
              const allDonationIds = (justInserted ?? []).map((r: { id: string }) => r.id);

              // Insert receipt rows (pdf_status: 'pending')
              type ReceiptRow = { id: string; donor_id: string | null; receipt_number: string; type: "individual" | "portfolio_summary"; amount: number; created_at: string };
              let portfolioReceiptRow: ReceiptRow | null = null;
              const individualReceiptRows: (ReceiptRow | null)[] = [];

              if (allocParts.length > 1) {
                // Portfolio: 1 summary + N individual rows
                const summaryNumber = generateReceiptNumber();
                const { data: summaryRow } = await supabase
                  .from("receipts")
                  .insert({
                    donor_id: meta.donorId ?? null,
                    payment_intent_id: pi.id,
                    donation_ids: allDonationIds,
                    org_id: null,
                    type: "portfolio_summary",
                    amount: donationAmountCents,
                    receipt_number: summaryNumber,
                    pdf_status: "pending",
                    created_at: now2,
                  })
                  .select("id, donor_id, receipt_number, type, amount, created_at")
                  .single();

                if (summaryRow) portfolioReceiptRow = summaryRow as ReceiptRow;

                for (const orgInfo of allOrgInfos) {
                  const donId = donationIdMap[orgInfo.orgId];
                  const { data: indRow } = await supabase
                    .from("receipts")
                    .insert({
                      donor_id: meta.donorId ?? null,
                      payment_intent_id: pi.id,
                      donation_ids: donId ? [donId] : null,
                      org_id: orgInfo.orgId,
                      type: "individual",
                      amount: orgInfo.amountCents,
                      receipt_number: generateReceiptNumber(),
                      pdf_status: "pending",
                      created_at: now2,
                    })
                    .select("id, donor_id, receipt_number, type, amount, created_at")
                    .single();

                  individualReceiptRows.push(indRow as ReceiptRow | null);
                }
              } else {
                // Single org: 1 individual row
                const { data: indRow } = await supabase
                  .from("receipts")
                  .insert({
                    donor_id: meta.donorId ?? null,
                    payment_intent_id: pi.id,
                    donation_ids: allDonationIds,
                    org_id: meta.orgId ?? null,
                    type: "individual",
                    amount: donationAmountCents,
                    receipt_number: generateReceiptNumber(),
                    pdf_status: "pending",
                    created_at: now2,
                  })
                  .select("id, donor_id, receipt_number, type, amount, created_at")
                  .single();

                individualReceiptRows.push(indRow as ReceiptRow | null);
              }

              // Generate PDF and send email (failure falls back to HTML-only email)
              let pdfBuffer: Buffer | null = null;
              try {
                if (donor.email) {
                  const receiptRowForPdf = portfolioReceiptRow ?? individualReceiptRows[0];
                  if (receiptRowForPdf) {
                    const orgsForPdf = allocParts.length > 1
                      ? allOrgInfos.map((o) => ({ name: o.name, ein: o.ein, amount: o.amountCents }))
                      : [{ name: primaryOrgInfo.name, ein: primaryOrgInfo.ein, amount: donationAmountCents }];

                    pdfBuffer = await generateAndStoreReceipt(
                      supabase,
                      receiptRowForPdf,
                      orgsForPdf,
                      donor.email,
                      donor.name
                    );

                    // Generate individual PDFs for portfolio allocations (non-blocking)
                    if (allocParts.length > 1) {
                      Promise.all(
                        individualReceiptRows.map((row, i) =>
                          row
                            ? generateAndStoreReceipt(
                                supabase,
                                row,
                                [{ name: allOrgInfos[i].name, ein: allOrgInfos[i].ein, amount: allOrgInfos[i].amountCents }],
                                donor.email!,
                                donor.name
                              )
                            : Promise.resolve(null)
                        )
                      ).catch((err) => console.error("[receipt] individual portfolio PDFs failed:", err));
                    }
                  }
                }
              } catch (pdfErr) {
                console.error("[receipt] PDF generation failed, falling back to HTML-only email:", pdfErr);
                const failedIds = [portfolioReceiptRow, ...individualReceiptRows].filter(Boolean).map((r) => r!.id);
                if (failedIds.length > 0) {
                  await supabase.from("receipts").update({ pdf_status: "failed" }).in("id", failedIds);
                }
              }

              // Send email (with or without PDF attachment)
              if (donor.email) {
                const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://easytogive.online";
                await sendReceiptEmail({
                  to: donor.email,
                  donorName: donor.name,
                  orgName: allocParts.length > 1 ? "EasyToGive Portfolio" : primaryOrgInfo.name,
                  orgEin: allocParts.length > 1 ? null : primaryOrgInfo.ein,
                  amountCents: donationAmountCents,
                  receiptId,
                  donatedAt: now,
                  receiptUrl: `${baseUrl}/receipts/${encodeURIComponent(receiptId)}`,
                  allocations:
                    allocParts.length > 1
                      ? allOrgInfos.map((o) => ({
                          orgName: o.name,
                          orgEin: o.ein,
                          amountCents: o.amountCents,
                        }))
                      : undefined,
                  pdfBuffer,
                });
              }
            } catch (receiptErr) {
              console.error(`[receipt] receipt block failed for payment_intent ${pi.id}:`, receiptErr);
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

          const { error: insertErr } = await supabase.from("donations").insert({
            user_id: meta.donorId || null,
            org_id: meta.orgId || null,
            amount: invoice.amount_paid,
            fee_amount: 0,
            fee_covered: false,
            stripe_payment_intent_id: piId,
            receipt_id: receiptId,
            donated_at: now,
          });
          if (insertErr) {
            if ((insertErr as any).code === "23505") break;
            throw insertErr;
          }

          // Update org raised total (amount stored in cents)
          if (meta.orgId) {
            await incrementOrgStats(supabase, meta.orgId, invoice.amount_paid, meta.donorId || null);
          }

          // Generate receipt + send recurring email — catch separately
          if (meta.donorId) {
            try {
              const [donor, orgInfo] = await Promise.all([
                getDonorInfo(supabase, meta.donorId),
                meta.orgId ? getOrgInfo(supabase, meta.orgId) : Promise.resolve({ name: "EasyToGive", ein: null }),
              ]);

              // Fetch donation IDs for this recurring payment (for donation_ids column)
              const { data: recurInserted } = await supabase
                .from("donations")
                .select("id")
                .eq("stripe_payment_intent_id", piId);
              const recurDonationIds = (recurInserted ?? []).map((r: { id: string }) => r.id);

              const recurReceiptNumber = generateReceiptNumber();
              const now2 = new Date().toISOString();
              const { data: recurReceiptRow } = await supabase
                .from("receipts")
                .insert({
                  donor_id: meta.donorId,
                  payment_intent_id: piId,
                  donation_ids: recurDonationIds,
                  org_id: meta.orgId ?? null,
                  type: "individual",
                  amount: invoice.amount_paid,
                  receipt_number: recurReceiptNumber,
                  pdf_status: "pending",
                  created_at: now2,
                })
                .select("id, donor_id, receipt_number, type, amount, created_at")
                .single();

              let pdfBuffer: Buffer | null = null;
              if (donor.email && recurReceiptRow) {
                try {
                  pdfBuffer = await generateAndStoreReceipt(
                    supabase,
                    recurReceiptRow as { id: string; donor_id: string | null; receipt_number: string; type: "individual" | "portfolio_summary"; amount: number; created_at: string },
                    [{ name: orgInfo.name, ein: orgInfo.ein, amount: invoice.amount_paid }],
                    donor.email,
                    donor.name
                  );
                } catch (pdfErr) {
                  console.error("[receipt] recurring PDF failed:", pdfErr);
                  if (recurReceiptRow) {
                    await supabase.from("receipts").update({ pdf_status: "failed" }).eq("id", (recurReceiptRow as { id: string }).id);
                  }
                }
              }

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
                  pdfBuffer,
                });
              }
            } catch (emailErr) {
              console.error(`Recurring receipt email failed for invoice ${invoice.id}:`, emailErr);
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
