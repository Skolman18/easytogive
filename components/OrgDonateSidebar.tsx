"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Users, Lock } from "lucide-react";
import CheckoutModal from "@/components/CheckoutModal";
import { formatCurrency, getProgressPercent } from "@/lib/placeholder-data";
import type { Organization } from "@/lib/placeholder-data";

const QUICK_AMOUNTS = [25, 50, 100, 250];

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

  const ds = { ...DEFAULT_DISPLAY, ...displaySettings };
  const progress = getProgressPercent(org.raised, org.goal);
  const effectiveAmount = useCustom ? parseFloat(customAmount) || 0 : selectedAmount;

  function openCheckout() {
    if (effectiveAmount < 1) return;
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
                min={1}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Donate button */}
        <button
          onClick={openCheckout}
          disabled={effectiveAmount < 1}
          className="w-full py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 mb-3 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#1a7a4a" }}
        >
          <Heart className="w-4 h-4 fill-white" />
          Donate {effectiveAmount >= 1 ? formatCurrency(effectiveAmount) : ""}
        </button>

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
