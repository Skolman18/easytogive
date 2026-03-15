"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Users, Lock, RefreshCw } from "lucide-react";
import CheckoutModal from "@/components/CheckoutModal";
import { formatCurrency, getProgressPercent } from "@/lib/placeholder-data";
import type { Organization } from "@/lib/placeholder-data";
import { createClient } from "@/lib/supabase-browser";

const QUICK_AMOUNTS = [25, 50, 100, 250];

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

type Frequency = (typeof FREQUENCIES)[number]["value"];

interface DisplaySettings {
  show_raised: boolean;
  show_goal: boolean;
  show_donors: boolean;
}

interface Props {
  org: Organization;
  displaySettings?: DisplaySettings;
}

const DEFAULT_DISPLAY: DisplaySettings = {
  show_raised: true,
  show_goal: true,
  show_donors: true,
};

export default function OrgDonateSidebar({ org, displaySettings }: Props) {
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [stripeConnected, setStripeConnected] = useState(false);
  const [donorId, setDonorId] = useState<string | undefined>(undefined);
  const [donorEmail, setDonorEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Check if this org has a connected Stripe account
    async function checkConnect() {
      try {
        const supabase = createClient() as any;
        const { data } = await supabase
          .from("organizations")
          .select("stripe_account_id, stripe_onboarding_complete")
          .eq("id", org.id)
          .single();
        if (data?.stripe_onboarding_complete) setStripeConnected(true);
      } catch { /* silent — fall back to direct charge */ }
    }
    // Get current donor ID + email for metadata
    async function getDonorId() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) setDonorId(user.id);
        if (user?.email) setDonorEmail(user.email);
      } catch { /* silent */ }
    }
    checkConnect();
    getDonorId();
  }, [org.id]);

  const ds = { ...DEFAULT_DISPLAY, ...displaySettings };
  const progress = getProgressPercent(org.raised, org.goal);
  const effectiveAmount = useCustom ? parseFloat(customAmount) || 0 : selectedAmount;

  function openCheckout() {
    if (effectiveAmount < 0.50) return;
    setModalOpen(true);
  }

  const showProgressSection = ds.show_raised || ds.show_goal || ds.show_donors;

  return (
    <>
      <div
        className="bg-white rounded-2xl border p-6 sticky top-20"
        style={{ borderColor: "#e5e1d8" }}
      >
        {/* Progress */}
        {showProgressSection && (
        <div className="mb-6">
          {(ds.show_raised || ds.show_goal) && (
          <div className="flex items-end justify-between mb-2">
            <div>
              {ds.show_raised && (
              <div
                className="font-display text-3xl font-bold"
                style={{ color: "#1a7a4a" }}
              >
                {formatCurrency(org.raised)}
              </div>
              )}
              {ds.show_goal && (
              <div className="text-sm text-gray-500">
                {ds.show_raised ? "raised of " : ""}{formatCurrency(org.goal)} goal
              </div>
              )}
            </div>
            {ds.show_goal && (
            <div
              className="text-2xl font-bold font-display"
              style={{ color: "#1a7a4a" }}
            >
              {progress}%
            </div>
            )}
          </div>
          )}
          {ds.show_goal && (
          <div
            className="w-full rounded-full h-3"
            style={{ backgroundColor: "#e5e1d8" }}
          >
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, backgroundColor: "#1a7a4a" }}
            />
          </div>
          )}
          {ds.show_donors && (
          <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {org.donors.toLocaleString()} donors
            </span>
            {ds.show_goal && <span>{100 - progress}% to go</span>}
          </div>
          )}
        </div>
        )}

        {/* One-time / Recurring toggle */}
        <div
          className="flex rounded-xl p-1 mb-4"
          style={{ backgroundColor: "#f0ede6" }}
        >
          <button
            onClick={() => setIsRecurring(false)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              !isRecurring
                ? { backgroundColor: "white", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                : { color: "#6b7280" }
            }
          >
            One-Time
          </button>
          <button
            onClick={() => setIsRecurring(true)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
            style={
              isRecurring
                ? { backgroundColor: "white", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                : { color: "#6b7280" }
            }
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recurring
          </button>
        </div>

        {/* Frequency selector (when recurring) */}
        {isRecurring && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className="py-2 rounded-lg text-xs font-semibold transition-all"
                style={
                  frequency === f.value
                    ? { backgroundColor: "#1a7a4a", color: "white" }
                    : { backgroundColor: "#f0ede6", color: "#374151" }
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Amount selector */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => {
                setSelectedAmount(amt);
                setUseCustom(false);
              }}
              className="py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                !useCustom && selectedAmount === amt
                  ? { backgroundColor: "#1a7a4a", color: "white" }
                  : { backgroundColor: "#f0ede6", color: "#374151" }
              }
            >
              ${amt}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-4">
          <button
            onClick={() => setUseCustom(true)}
            className="w-full py-2 rounded-lg text-sm font-semibold transition-all mb-2"
            style={
              useCustom
                ? { backgroundColor: "#1a7a4a", color: "white" }
                : { backgroundColor: "#f0ede6", color: "#374151" }
            }
          >
            Custom amount
          </button>
          {useCustom && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
                $
              </span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-7 pr-4 py-2.5 border rounded-lg text-sm outline-none focus:border-green-600 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                min={0.01}
                step={0.01}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Donate / Start Recurring button */}
        {isRecurring ? (
          <button
            onClick={openCheckout}
            disabled={effectiveAmount < 0.50}
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 mb-3 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            <RefreshCw className="w-4 h-4" />
            {`Give ${effectiveAmount >= 0.50 ? formatCurrency(effectiveAmount) : ""} ${FREQUENCIES.find((f) => f.value === frequency)?.label ?? ""}`}
          </button>
        ) : (
          <button
            onClick={openCheckout}
            disabled={effectiveAmount < 0.50}
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 mb-3 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            <Heart className="w-4 h-4 fill-white" />
            Donate {effectiveAmount >= 0.50 ? formatCurrency(effectiveAmount) : ""}
          </button>
        )}

        <Link
          href="/portfolio"
          className="w-full py-3 rounded-xl font-semibold text-center block transition-all hover:opacity-80 text-sm"
          style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
        >
          Add to My Portfolio
        </Link>

        <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          Secured by Stripe · 100% tax-deductible
        </p>
      </div>

      <CheckoutModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        amountDollars={effectiveAmount}
        singleOrgName={org.name}
        stripeAccountConnected={stripeConnected}
        donorId={donorId}
        donorEmail={donorEmail}
        isRecurring={isRecurring}
        frequency={frequency}
        allocations={[
          {
            orgId: org.id,
            orgName: org.name,
            percentage: 100,
            amountCents: Math.round(effectiveAmount * 100),
          },
        ]}
      />
    </>
  );
}
