"use client";

import { useEffect, useRef, useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  X,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Heart,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { getStripe } from "@/lib/stripe-client";
import { formatCurrency } from "@/lib/placeholder-data";
import Link from "next/link";

export interface DonationAllocation {
  orgId: string;
  orgName: string;
  percentage: number;
  amountCents: number;
}

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Donation amount in whole dollars (what donor intends to give) */
  amountDollars: number;
  allocations: DonationAllocation[];
  singleOrgName?: string;
  /** Set true when the org has a Stripe Connect account */
  stripeAccountConnected?: boolean;
  donorId?: string;
  donorEmail?: string;
  isRecurring?: boolean;
  frequency?: string;
  /** Called after payment/subscription confirmed successfully */
  onSuccess?: () => void;
}

// ── Payment form rendered inside <Elements> ──────────────────────────────────
function PaymentForm({
  chargeAmountDollars,
  onSuccess,
}: {
  chargeAmountDollars: number;
  onSuccess: (paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErrorMsg(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: typeof window !== "undefined" ? window.location.href : "",
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      setErrorMsg("Something unexpected happened. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3 rounded-lg border text-sm"
          style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#dc2626" }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#1a7a4a" }}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Donate {formatCurrency(chargeAmountDollars)} Now
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" />
        Secured by Stripe · 256-bit SSL · 100% tax-deductible
      </p>
    </form>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({
  chargeAmountDollars,
  donationAmountDollars,
  platformFeeDollars,
  feeCovered,
  allocations,
  isConnect,
  isRecurring,
  frequency,
  onClose,
}: {
  chargeAmountDollars: number;
  donationAmountDollars: number;
  platformFeeDollars: number;
  feeCovered: boolean;
  allocations: DonationAllocation[];
  isConnect: boolean;
  isRecurring?: boolean;
  frequency?: string;
  onClose: () => void;
}) {
  const isMultiOrg = allocations.length > 1;
  const orgName = isMultiOrg
    ? "your giving portfolio"
    : allocations[0]?.orgName ?? "the organization";
  const orgReceives = isConnect
    ? feeCovered
      ? donationAmountDollars
      : donationAmountDollars - platformFeeDollars
    : chargeAmountDollars;

  const freqLabel = frequency
    ? frequency.charAt(0).toUpperCase() + frequency.slice(1)
    : "Recurring";

  if (isRecurring) {
    return (
      <div className="text-center py-2">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: "#e8f5ee" }}
        >
          <CheckCircle className="w-10 h-10" style={{ color: "#1a7a4a" }} />
        </div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
          Recurring giving activated!
        </h2>
        <p className="text-gray-500 text-sm mb-5">
          {formatCurrency(chargeAmountDollars)}{" "}
          <span className="font-semibold text-gray-700">{freqLabel.toLowerCase()}</span> to{" "}
          <span className="font-semibold text-gray-800">{orgName}</span>.
        </p>
        <div
          className="rounded-xl border p-4 mb-4 text-left space-y-2"
          style={{ borderColor: "#e5e1d8", backgroundColor: "#faf9f6" }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Frequency</span>
            <span className="font-semibold text-gray-900">{freqLabel}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Amount per period</span>
            <span className="font-semibold" style={{ color: "#1a7a4a" }}>
              {formatCurrency(chargeAmountDollars)}
            </span>
          </div>
          <div className="flex items-start justify-between text-sm">
            <span className="text-gray-600 flex-shrink-0">
              {isMultiOrg ? "Beneficiaries" : "Beneficiary"}
            </span>
            <div className="ml-4 text-right">
              {isMultiOrg ? (
                allocations.map((a) => (
                  <div key={a.orgId} className="font-semibold text-gray-900 text-xs leading-5">
                    {a.orgName}
                  </div>
                ))
              ) : (
                <span className="font-semibold text-gray-900">{orgName}</span>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          You can manage or cancel this subscription from your profile at any time.
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#1a7a4a" }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-2">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{ backgroundColor: "#e8f5ee" }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: "#1a7a4a" }} />
      </div>

      <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
        Thank you for giving!
      </h2>
      <p className="text-gray-500 text-sm mb-5">
        Your donation to{" "}
        <span className="font-semibold text-gray-800">{orgName}</span>{" "}
        has been processed.
      </p>

      <div
        className="rounded-xl border p-4 mb-4 text-left space-y-2"
        style={{ borderColor: "#e5e1d8", backgroundColor: "#faf9f6" }}
      >
        {allocations.map((a) => (
          <div key={a.orgId} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Heart className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1a7a4a" }} />
              <span className="text-gray-700 truncate">{a.orgName}</span>
            </div>
            <span className="font-semibold text-gray-900 flex-shrink-0 ml-3">
              {formatCurrency(isConnect ? orgReceives : a.amountCents / 100)}
            </span>
          </div>
        ))}
        {isConnect && platformFeeDollars > 0 && (
          <div
            className="flex items-center justify-between text-sm pt-1.5 border-t"
            style={{ borderColor: "#e5e1d8" }}
          >
            <span className="text-gray-400">Platform fee (1%)</span>
            <span className="text-gray-400">
              {feeCovered
                ? `+${formatCurrency(platformFeeDollars)}`
                : `-${formatCurrency(platformFeeDollars)}`}
            </span>
          </div>
        )}
        <div
          className="flex items-center justify-between pt-1.5 border-t font-bold text-base"
          style={{ borderColor: "#e5e1d8" }}
        >
          <span className="text-gray-900">Total charged</span>
          <span style={{ color: "#1a7a4a" }}>{formatCurrency(chargeAmountDollars)}</span>
        </div>
      </div>

      <div className="space-y-2.5">
        <Link
          href="/profile?tab=receipts"
          onClick={onClose}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
        >
          <Receipt className="w-4 h-4" />
          View Receipt
        </Link>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-semibold text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function CheckoutModal({
  isOpen,
  onClose,
  amountDollars,
  allocations,
  singleOrgName,
  stripeAccountConnected,
  donorId,
  donorEmail,
  isRecurring = false,
  frequency = "monthly",
  onSuccess,
}: CheckoutModalProps) {
  // configure → loading → payment → success
  const [step, setStep] = useState<"configure" | "loading" | "payment" | "success">("configure");
  const [coverFee, setCoverFee] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [successPaymentId, setSuccessPaymentId] = useState<string | null>(null);
  const [platformFee, setPlatformFee] = useState(0);
  const [chargeAmount, setChargeAmount] = useState(amountDollars);

  const isConnect = !!stripeAccountConnected;
  const orgId = allocations[0]?.orgId;
  const orgName = singleOrgName ?? allocations[0]?.orgName ?? "";
  const feeAmount = Math.max(0.01, Math.round(amountDollars * 100 * 0.01) / 100);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("configure");
      setCoverFee(true);
      setClientSecret(null);
      setFetchError(null);
      setSuccessPaymentId(null);
      setPlatformFee(0);
      setChargeAmount(amountDollars);
    }
  }, [isOpen, amountDollars]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || step === "loading") return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function trapFocus(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    dialog.addEventListener("keydown", trapFocus);
    return () => dialog.removeEventListener("keydown", trapFocus);
  }, [isOpen, step]);

  async function proceedToPayment() {
    const amountCents = Math.round(amountDollars * 100);
    if (amountCents < 50) return;

    setStep("loading");
    setFetchError(null);

    try {
      let res: Response;

      if (isRecurring) {
        // For multi-org portfolio, skip Connect routing (no single orgId)
        const singleOrgId = allocations.length === 1 ? (orgId ?? undefined) : undefined;
        res = await fetch("/api/stripe/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountCents,
            orgId: singleOrgId,
            donorId: donorId ?? undefined,
            donorEmail: donorEmail ?? undefined,
            frequency,
            allocations: allocations.map((a) => ({
              orgId: a.orgId,
              orgName: a.orgName,
              amountCents: a.amountCents,
            })),
          }),
        });
      } else {
        const desc =
          allocations.length === 1
            ? `EasyToGive donation to ${orgName}`
            : `EasyToGive portfolio donation (${allocations.length} organizations)`;

        // For multi-org portfolio, skip Connect routing (no single orgId)
        const singleOrgId = allocations.length === 1 ? (orgId ?? undefined) : undefined;
        res = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountCents,
            description: desc,
            orgId: singleOrgId,
            donorId: donorId ?? undefined,
            coverFee,
            // Pass all allocations so the webhook can save one record per org
            allocations: allocations.map((a) => ({
              orgId: a.orgId,
              orgName: a.orgName,
              amountCents: a.amountCents,
            })),
            metadata: { platform: "easytogive" },
          }),
        });
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setClientSecret(data.clientSecret);
      setPlatformFee(data.platformFee ?? 0);
      setChargeAmount(data.chargeAmount ?? amountDollars);
      setStep("payment");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not start checkout. Please try again.";
      setFetchError(msg);
      setStep("configure");
    }
  }

  if (!isOpen) return null;

  const quotedTotal = coverFee && !isRecurring ? amountDollars + feeAmount : amountDollars;

  const stripeAppearance = {
    theme: "stripe" as const,
    variables: {
      colorPrimary: "#1a7a4a",
      colorBackground: "#ffffff",
      colorText: "#1c1c1e",
      colorDanger: "#dc2626",
      fontFamily: "Inter, system-ui, sans-serif",
      borderRadius: "8px",
    },
    rules: {
      ".Input": { border: "1.5px solid #e5e1d8", boxShadow: "none" },
      ".Input:focus": { border: "1.5px solid #1a7a4a", boxShadow: "0 0 0 3px rgba(26,122,74,0.12)" },
      ".Label": { fontWeight: "500", marginBottom: "6px" },
    },
  };

  const title =
    step === "success"
      ? isRecurring ? "Recurring Giving Active" : "Donation Complete"
      : isRecurring
      ? orgName ? `Give ${frequency} to ${orgName}` : "Set Up Recurring Giving"
      : orgName
      ? `Donate to ${orgName}`
      : allocations.length === 1
      ? `Donate to ${allocations[0].orgName}`
      : "Portfolio Donation";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4"
      style={{ backgroundColor: "rgba(13,17,23,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-dialog-title"
        className="animate-slide-up relative w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "#d1d5db" }} />
        </div>

        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 md:px-6 py-3.5 md:py-4 border-b"
          style={{ backgroundColor: "white", borderColor: "#e5e1d8" }}
        >
          <div>
            <h2 id="checkout-dialog-title" className="font-display font-semibold text-lg text-gray-900 leading-tight">
              {title}
            </h2>
            {step !== "success" && (
              <p className="text-xs text-gray-500 mt-0.5">
                {formatCurrency(step === "payment" ? chargeAmount : quotedTotal)} · Tax-deductible
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-4 flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 md:px-6 py-4 md:py-5 pb-8 md:pb-5">

          {/* ── Configure ── */}
          {step === "configure" && (
            <div className="space-y-5">
              {/* Allocation summary */}
              <div
                className="rounded-xl border p-4 space-y-2"
                style={{ borderColor: "#e5e1d8", backgroundColor: "#faf9f6" }}
              >
                {allocations.map((a) => (
                  <div key={a.orgId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate pr-3">{a.orgName}</span>
                    <span className="font-semibold text-gray-900 flex-shrink-0">
                      {formatCurrency(a.amountCents / 100)}
                    </span>
                  </div>
                ))}
                <div
                  className="flex items-center justify-between pt-2 mt-1 border-t font-bold text-base"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  <span className="text-gray-900">Total</span>
                  <span style={{ color: "#1a7a4a" }}>{formatCurrency(amountDollars)}</span>
                </div>
              </div>

              {/* Fee coverage — two selectable cards */}
              {feeAmount > 0 && !isRecurring && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Card 1 — Donor covers fee (default) */}
                  <button
                    type="button"
                    onClick={() => setCoverFee(true)}
                    className="relative rounded-xl border p-3.5 text-left transition-all focus:outline-none"
                    style={{
                      borderColor: coverFee ? "#1a7a4a" : "#e5e1d8",
                      backgroundColor: coverFee ? "#e8f5ee" : "white",
                      borderWidth: coverFee ? 2 : 1,
                    }}
                  >
                    {coverFee && (
                      <div
                        className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#1a7a4a" }}
                      >
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-900 leading-snug pr-5">
                      I&apos;ll cover the fee
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-snug">
                      100% of my donation goes to {orgName || "the organization"}
                    </p>
                    <p className="text-xs mt-2 leading-snug" style={{ color: "#6b7280" }}>
                      You pay:{" "}
                      <span className="font-medium text-gray-800">{formatCurrency(amountDollars + feeAmount)}</span>
                      {" · "}{orgName || "Org"} receives:{" "}
                      <span className="font-medium text-gray-800">{formatCurrency(amountDollars)}</span>
                    </p>
                  </button>

                  {/* Card 2 — Deduct fee from donation */}
                  <button
                    type="button"
                    onClick={() => setCoverFee(false)}
                    className="relative rounded-xl border p-3.5 text-left transition-all focus:outline-none"
                    style={{
                      borderColor: !coverFee ? "#1a7a4a" : "#e5e1d8",
                      backgroundColor: !coverFee ? "#e8f5ee" : "white",
                      borderWidth: !coverFee ? 2 : 1,
                    }}
                  >
                    {!coverFee && (
                      <div
                        className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#1a7a4a" }}
                      >
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-900 leading-snug pr-5">
                      Deduct fee from my donation
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-snug">
                      My donation goes to {orgName || "the organization"} minus the 1% fee
                    </p>
                    <p className="text-xs mt-2 leading-snug" style={{ color: "#6b7280" }}>
                      You pay:{" "}
                      <span className="font-medium text-gray-800">{formatCurrency(amountDollars)}</span>
                      {" · "}{orgName || "Org"} receives:{" "}
                      <span className="font-medium text-gray-800">{formatCurrency(amountDollars - feeAmount)}</span>
                    </p>
                  </button>
                </div>
              )}

              {fetchError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3 rounded-lg border text-sm"
                  style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#dc2626" }}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  {fetchError}
                </div>
              )}

              <button
                onClick={proceedToPayment}
                className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                Continue to Payment
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Secured by Stripe · 256-bit SSL
              </p>
            </div>
          )}

          {/* ── Loading ── */}
          {step === "loading" && (
            <div className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a7a4a" }} />
              <p className="text-sm text-gray-500">Preparing checkout…</p>
            </div>
          )}

          {/* ── Payment ── */}
          {step === "payment" && clientSecret && (
            <div className="space-y-4">
              {/* Compact summary */}
              <div
                className="rounded-lg border p-3 space-y-1.5 text-sm"
                style={{ borderColor: "#e5e1d8", backgroundColor: "#faf9f6" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 truncate pr-3">{orgName || "Donation"}</span>
                  <span className="font-bold flex-shrink-0" style={{ color: "#1a7a4a" }}>
                    {formatCurrency(amountDollars)}
                  </span>
                </div>
                {isConnect && platformFee > 0 && (
                  <div className="flex items-center justify-between text-xs text-gray-400 border-t pt-1.5" style={{ borderColor: "#e5e1d8" }}>
                    <span>Platform fee (1%) {coverFee ? "— covered by you" : "— deducted from donation"}</span>
                    <span>{coverFee ? `+${formatCurrency(platformFee)}` : `-${formatCurrency(platformFee)}`}</span>
                  </div>
                )}
                <div className="flex items-center justify-between font-semibold border-t pt-1.5" style={{ borderColor: "#e5e1d8" }}>
                  <span className="text-gray-700">Total charged</span>
                  <span style={{ color: "#1a7a4a" }}>{formatCurrency(chargeAmount)}</span>
                </div>
              </div>

              <Elements
                stripe={getStripe()}
                options={{ clientSecret, appearance: stripeAppearance }}
              >
                <PaymentForm
                  chargeAmountDollars={chargeAmount}
                  onSuccess={(id) => {
                    setSuccessPaymentId(id);
                    setStep("success");
                    onSuccess?.();
                  }}
                />
              </Elements>
            </div>
          )}

          {/* ── Success ── */}
          {step === "success" && successPaymentId && (
            <SuccessScreen
              chargeAmountDollars={chargeAmount}
              donationAmountDollars={amountDollars}
              platformFeeDollars={platformFee}
              feeCovered={coverFee}
              allocations={allocations}
              isConnect={isConnect}
              isRecurring={isRecurring}
              frequency={frequency}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
