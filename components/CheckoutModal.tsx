"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { X, Lock, CheckCircle, AlertCircle, Loader2, Heart, Download } from "lucide-react";
import { getStripe } from "@/lib/stripe-client";
import { formatCurrency } from "@/lib/placeholder-data";

export interface DonationAllocation {
  orgId: string;
  orgName: string;
  percentage: number;
  amountCents: number;
}

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Total donation in whole dollars */
  amountDollars: number;
  allocations: DonationAllocation[];
  /** For single-org donations, the org name shown in the header */
  singleOrgName?: string;
}

// ── Inner form rendered inside <Elements> ───────────────────────────────────
function PaymentForm({
  amountDollars,
  allocations,
  singleOrgName,
  onSuccess,
}: {
  amountDollars: number;
  allocations: DonationAllocation[];
  singleOrgName?: string;
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
        // No redirect URL needed — we handle success in-modal
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

      {/* Stripe PaymentElement */}
      <div>
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {/* Error message */}
      {errorMsg && (
        <div
          className="flex items-start gap-2.5 p-3 rounded-lg border text-sm"
          style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#dc2626" }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Submit */}
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
            Donate {formatCurrency(amountDollars)} Now
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

// ── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({
  amountDollars,
  allocations,
  paymentIntentId,
  onClose,
}: {
  amountDollars: number;
  allocations: DonationAllocation[];
  paymentIntentId: string;
  onClose: () => void;
}) {
  const shortId = paymentIntentId.replace("pi_", "").slice(0, 12).toUpperCase();

  return (
    <div className="text-center py-2">
      {/* Animated checkmark */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{ backgroundColor: "#e8f5ee" }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: "#1a7a4a" }} />
      </div>

      <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
        Thank you for giving!
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Your donation of{" "}
        <span className="font-semibold text-gray-800">{formatCurrency(amountDollars)}</span>{" "}
        has been processed.
      </p>

      {/* Breakdown */}
      <div
        className="rounded-xl border p-4 mb-5 text-left space-y-2"
        style={{ borderColor: "#e5e1d8", backgroundColor: "#faf9f6" }}
      >
        {allocations.map((a) => (
          <div key={a.orgId} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Heart className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1a7a4a" }} />
              <span className="text-gray-700 truncate">{a.orgName}</span>
            </div>
            <span className="font-semibold text-gray-900 flex-shrink-0 ml-3">
              {formatCurrency(a.amountCents / 100)}
            </span>
          </div>
        ))}
      </div>

      {/* Receipt ID */}
      <div
        className="rounded-lg px-4 py-2.5 mb-6 inline-flex items-center gap-2 text-sm"
        style={{ backgroundColor: "#f0ede6" }}
      >
        <span className="text-gray-500">Receipt ID:</span>
        <span className="font-mono font-semibold text-gray-800">ETG-{shortId}</span>
      </div>

      {/* Actions */}
      <div className="space-y-2.5">
        <button
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
          onClick={() => {
            // Placeholder — real receipt download wired in next sprint
            alert("Receipt download coming soon. Check your profile for tax documents.");
          }}
        >
          <Download className="w-4 h-4" />
          Download Receipt
        </button>
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

// ── Main modal shell ─────────────────────────────────────────────────────────
export default function CheckoutModal({
  isOpen,
  onClose,
  amountDollars,
  allocations,
  singleOrgName,
}: CheckoutModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successPaymentId, setSuccessPaymentId] = useState<string | null>(null);

  const amountCents = Math.round(amountDollars * 100);

  // Create PaymentIntent whenever the modal opens
  useEffect(() => {
    if (!isOpen || amountCents < 50) return;

    setClientSecret(null);
    setFetchError(null);
    setSuccessPaymentId(null);
    setLoading(true);

    const description =
      allocations.length === 1
        ? `EasyToGive donation to ${allocations[0].orgName}`
        : `EasyToGive portfolio donation (${allocations.length} organizations)`;

    const metadata: Record<string, string> = {
      platform: "easytogive",
      allocation_count: String(allocations.length),
    };
    allocations.slice(0, 5).forEach((a, i) => {
      metadata[`org_${i}`] = a.orgId;
      metadata[`org_${i}_pct`] = String(a.percentage);
    });

    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents, description, metadata }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setClientSecret(data.clientSecret);
      })
      .catch((err) => {
        setFetchError(err.message ?? "Could not start checkout. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [isOpen, amountCents]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const stripeAppearance = {
    theme: "stripe" as const,
    variables: {
      colorPrimary: "#1a7a4a",
      colorBackground: "#ffffff",
      colorText: "#1c1c1e",
      colorDanger: "#dc2626",
      fontFamily: "Inter, system-ui, sans-serif",
      borderRadius: "8px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        border: "1.5px solid #e5e1d8",
        boxShadow: "none",
      },
      ".Input:focus": {
        border: "1.5px solid #1a7a4a",
        boxShadow: "0 0 0 3px rgba(26,122,74,0.12)",
      },
      ".Label": {
        fontWeight: "500",
        marginBottom: "6px",
      },
    },
  };

  const title =
    singleOrgName
      ? `Donate to ${singleOrgName}`
      : allocations.length === 1
      ? `Donate to ${allocations[0].orgName}`
      : "Portfolio Donation";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(13,17,23,0.7)", backdropFilter: "blur(4px)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Modal card */}
        <div
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: "90vh", overflowY: "auto" }}
        >
          {/* Header */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
            style={{ backgroundColor: "white", borderColor: "#e5e1d8" }}
          >
            <div>
              <h2 className="font-display font-semibold text-lg text-gray-900 leading-tight">
                {successPaymentId ? "Donation Complete" : title}
              </h2>
              {!successPaymentId && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatCurrency(amountDollars)} · Tax-deductible
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
          <div className="px-6 py-5">
            {successPaymentId ? (
              <SuccessScreen
                amountDollars={amountDollars}
                allocations={allocations}
                paymentIntentId={successPaymentId}
                onClose={onClose}
              />
            ) : loading ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a7a4a" }} />
                <p className="text-sm text-gray-500">Preparing checkout…</p>
              </div>
            ) : fetchError ? (
              <div className="py-8 text-center">
                <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#dc2626" }} />
                <p className="text-sm text-gray-700 mb-4">{fetchError}</p>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  Close
                </button>
              </div>
            ) : clientSecret ? (
              <Elements
                stripe={getStripe()}
                options={{ clientSecret, appearance: stripeAppearance }}
              >
                <PaymentForm
                  amountDollars={amountDollars}
                  allocations={allocations}
                  singleOrgName={singleOrgName}
                  onSuccess={setSuccessPaymentId}
                />
              </Elements>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
