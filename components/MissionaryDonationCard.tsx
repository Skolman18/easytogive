"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

interface Missionary {
  id: string;
  slug: string;
  full_name: string;
  photo_url: string;
  mission_org: string;
  monthly_goal_cents: number;
  monthly_raised_cents: number;
}

const ONE_TIME_PRESETS = [2500, 5000, 10000, 25000];
const MONTHLY_PRESETS = [2500, 5000, 10000, 20000];

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function MissionaryDonationCard({
  missionary,
  defaultType = "one_time",
}: {
  missionary: Missionary;
  defaultType?: "one_time" | "monthly";
}) {
  const router = useRouter();
  const [giveType, setGiveType] = useState<"one_time" | "monthly">(defaultType);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(5000);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [feeCovered, setFeeCovered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [successType, setSuccessType] = useState<"one_time" | "monthly">("one_time");

  const presets = giveType === "one_time" ? ONE_TIME_PRESETS : MONTHLY_PRESETS;
  const amountCents = isCustom
    ? Math.round(Number(customAmount || "0") * 100)
    : selectedPreset ?? 0;
  const feeCents = Math.max(1, Math.round(amountCents * 0.01));
  const totalCents = feeCovered ? amountCents + feeCents : amountCents;
  const netCents = feeCovered ? amountCents : amountCents - feeCents;

  const pct =
    missionary.monthly_goal_cents > 0
      ? Math.min(
          Math.round((missionary.monthly_raised_cents / missionary.monthly_goal_cents) * 100),
          100
        )
      : 0;

  async function handleGive() {
    if (amountCents < 50) return;
    const supabase = createClient() as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth/signin?redirectTo=/missionaries/${missionary.slug}`);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("missionary_donations").insert({
      missionary_id: missionary.id,
      user_id: user.id,
      amount_cents: amountCents,
      fee_cents: feeCents,
      fee_covered_by_donor: feeCovered,
      net_to_missionary_cents: netCents,
      type: giveType,
      status: "pending",
    });
    if (!error && giveType === "monthly") {
      await supabase
        .from("missionaries")
        .update({ monthly_raised_cents: missionary.monthly_raised_cents + amountCents })
        .eq("id", missionary.id);
    }
    setSubmitting(false);
    if (!error) {
      setSuccessAmount(amountCents);
      setSuccessType(giveType);
      setSuccess(true);
    }
  }

  const firstName = missionary.full_name.split(" ")[0];

  if (success) {
    return (
      <div
        className="bg-white rounded-xl border shadow-md p-6 text-center"
        style={{ borderColor: "#e5e1d8" }}
      >
        <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#1a7a4a" }} />
        <h3 className="font-display font-bold text-gray-900 text-lg mb-1">
          Thank you for supporting {missionary.full_name}!
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Your {successType === "one_time" ? "one-time gift" : "monthly support"} of{" "}
          {fmt(successAmount)} to {missionary.full_name} has been received.
        </p>
        {successType === "monthly" && (
          <p className="text-xs text-gray-400 mb-4">
            You&apos;ll be charged {fmt(successAmount)} each month. Cancel anytime from your wallet.
          </p>
        )}
        <button
          onClick={() => setSuccess(false)}
          className="text-sm font-medium hover:underline"
          style={{ color: "#1a7a4a" }}
        >
          Give again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-md p-6" style={{ borderColor: "#e5e1d8" }}>
      {/* Missionary photo + name */}
      <div className="text-center mb-5">
        {missionary.photo_url ? (
          <img
            src={missionary.photo_url}
            alt={missionary.full_name}
            className="w-20 h-20 rounded-full object-cover object-top border-4 border-white shadow mx-auto mb-3"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full border-4 border-white shadow mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-white"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            {missionary.full_name.charAt(0)}
          </div>
        )}
        <div className="font-display font-bold text-gray-900">{missionary.full_name}</div>
        {missionary.mission_org && (
          <div className="text-xs text-gray-500 mt-0.5">{missionary.mission_org}</div>
        )}
      </div>

      <div className="border-t mb-5" style={{ borderColor: "#f0ede6" }} />

      {/* Type toggle */}
      <div className="flex gap-2 mb-5">
        {(["one_time", "monthly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setGiveType(t)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-colors"
            style={
              giveType === t
                ? { backgroundColor: "#e8f5ee", color: "#1a7a4a", borderColor: "#1a7a4a" }
                : { borderColor: "#e5e1d8", color: "#6b7280" }
            }
          >
            {t === "one_time" ? "One-Time Gift" : "Monthly Support"}
          </button>
        ))}
      </div>

      {/* Amount presets */}
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-2 mb-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => {
                setSelectedPreset(p);
                setIsCustom(false);
              }}
              className="py-2 px-3 rounded-lg text-sm font-semibold border transition-colors"
              style={
                !isCustom && selectedPreset === p
                  ? { backgroundColor: "#1a7a4a", color: "white", borderColor: "#1a7a4a" }
                  : { borderColor: "#e5e1d8", color: "#374151" }
              }
            >
              {fmt(p)}
            </button>
          ))}
          <button
            onClick={() => {
              setIsCustom(true);
              setSelectedPreset(null);
            }}
            className="py-2 px-3 rounded-lg text-sm font-semibold border transition-colors col-span-2"
            style={
              isCustom
                ? { backgroundColor: "#1a7a4a", color: "white", borderColor: "#1a7a4a" }
                : { borderColor: "#e5e1d8", color: "#374151" }
            }
          >
            Custom
          </button>
        </div>
        {isCustom && (
          <div className="relative mt-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              $
            </span>
            <input
              type="number"
              min="0.50"
              step="0.01"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600"
              style={{ borderColor: "#e5e1d8" }}
            />
          </div>
        )}
        {giveType === "monthly" && (
          <p className="text-xs text-gray-400 mt-2">You&apos;ll be charged monthly until cancelled</p>
        )}
      </div>

      {/* Monthly progress — only on monthly tab */}
      {giveType === "monthly" && missionary.monthly_goal_cents > 0 && (
        <div className="mb-4">
          <div
            className="w-full h-2.5 rounded-full overflow-hidden mb-1"
            style={{ backgroundColor: "#e5e1d8" }}
          >
            <div
              className="h-2.5 rounded-full"
              style={{ width: `${pct}%`, backgroundColor: "#1a7a4a" }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {fmt(missionary.monthly_raised_cents)} of {fmt(missionary.monthly_goal_cents)}/mo goal
            · {pct}% funded
          </p>
        </div>
      )}

      {/* Fee breakdown */}
      {amountCents >= 50 && (
        <div
          className="rounded-lg p-3 mb-4 space-y-1 text-sm"
          style={{ backgroundColor: "#faf9f6" }}
        >
          <div className="flex justify-between text-gray-600">
            <span>Donation</span>
            <span>{fmt(amountCents)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Platform fee (1%)</span>
            <span>{fmt(feeCents)}</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="cover-fee-missionary"
              checked={feeCovered}
              onChange={(e) => setFeeCovered(e.target.checked)}
              className="rounded"
            />
            <label
              htmlFor="cover-fee-missionary"
              className="text-xs text-gray-500 cursor-pointer"
            >
              Cover the fee so 100% reaches {firstName}
            </label>
          </div>
          <div
            className="flex justify-between font-semibold text-gray-900 pt-1 border-t"
            style={{ borderColor: "#e5e1d8" }}
          >
            <span>Total</span>
            <span>{fmt(totalCents)}</span>
          </div>
        </div>
      )}

      {/* Give button */}
      <button
        onClick={handleGive}
        disabled={submitting || amountCents < 50}
        className="w-full rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
        style={{ backgroundColor: "#1a7a4a", height: "52px" }}
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          `Give to ${firstName} →`
        )}
      </button>
      <p className="text-center text-xs text-gray-400 mt-2">
        Secured by Stripe · Funds go directly to the missionary
      </p>
    </div>
  );
}
