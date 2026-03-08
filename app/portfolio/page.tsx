"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  Trash2,
  Lock,
  AlertCircle,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import {
  PORTFOLIO_ALLOCATIONS,
  ORGANIZATIONS,
  formatCurrency,
  PortfolioAllocation,
} from "@/lib/placeholder-data";
import CheckoutModal, { DonationAllocation } from "@/components/CheckoutModal";

const DONATION_AMOUNTS = [25, 50, 100, 250, 500];

const EXTRA_COLORS = [
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
  "#84cc16",
];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-lg shadow-lg text-sm font-medium"
        style={{ backgroundColor: "#0d1117", color: "white" }}
      >
        {payload[0].name}: {payload[0].value}%
      </div>
    );
  }
  return null;
}

export default function PortfolioPage() {
  const [allocations, setAllocations] = useState<PortfolioAllocation[]>(
    PORTFOLIO_ALLOCATIONS
  );
  const [donationAmount, setDonationAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [addingOrg, setAddingOrg] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const totalPercent = allocations.reduce((sum, a) => sum + a.percentage, 0);
  const remaining = 100 - totalPercent;
  const isValid = totalPercent === 100;
  const effectiveAmount = useCustom
    ? parseFloat(customAmount) || 0
    : donationAmount;

  const handleSlider = (orgId: string, value: number) => {
    setAllocations((prev) =>
      prev.map((a) => (a.orgId === orgId ? { ...a, percentage: value } : a))
    );
  };

  const handleRemove = (orgId: string) => {
    setAllocations((prev) => prev.filter((a) => a.orgId !== orgId));
  };

  const handleAddOrg = () => {
    const org = ORGANIZATIONS.find((o) => o.id === selectedOrgId);
    if (!org || allocations.find((a) => a.orgId === org.id)) return;
    const newAlloc: PortfolioAllocation = {
      orgId: org.id,
      orgName: org.name,
      percentage: 0,
      color: EXTRA_COLORS[allocations.length % EXTRA_COLORS.length],
    };
    setAllocations((prev) => [...prev, newAlloc]);
    setAddingOrg(false);
    setSelectedOrgId("");
  };

  const availableOrgs = ORGANIZATIONS.filter(
    (o) => !allocations.find((a) => a.orgId === o.id)
  );

  const chartData = allocations.map((a) => ({
    name: a.orgName,
    value: a.percentage,
    color: a.color,
  }));

  // Build the allocations array for the checkout modal
  const checkoutAllocations: DonationAllocation[] = allocations
    .filter((a) => a.percentage > 0)
    .map((a) => ({
      orgId: a.orgId,
      orgName: a.orgName,
      percentage: a.percentage,
      amountCents: Math.round(effectiveAmount * (a.percentage / 100) * 100),
    }));

  return (
    <>
      <div style={{ backgroundColor: "#faf9f6" }} className="min-h-screen">
        {/* Header */}
        <div style={{ backgroundColor: "#0d1117" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-3">
              My Giving Portfolio
            </h1>
            <p className="text-gray-400 text-lg max-w-xl">
              Allocate your donation across multiple organizations. Adjust the
              percentages until they add up to 100%.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Allocation controls */}
            <div className="lg:col-span-2 space-y-4">
              {allocations.map((alloc) => {
                const org = ORGANIZATIONS.find((o) => o.id === alloc.orgId);
                const dollarAmount = (effectiveAmount * alloc.percentage) / 100;

                return (
                  <div
                    key={alloc.orgId}
                    className="bg-white rounded-2xl border p-5"
                    style={{ borderColor: "#e5e1d8" }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: alloc.color }}
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/org/${alloc.orgId}`}
                            className="font-semibold text-gray-900 hover:text-green-700 transition-colors block leading-tight"
                          >
                            {alloc.orgName}
                          </Link>
                          {org && (
                            <p className="text-sm text-gray-500 mt-0.5">
                              {org.location} · {org.category}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <div className="text-right">
                          <div
                            className="text-lg font-bold tabular-nums"
                            style={{ color: "#1a7a4a" }}
                          >
                            {alloc.percentage}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(dollarAmount)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(alloc.orgId)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={alloc.percentage}
                      onChange={(e) =>
                        handleSlider(alloc.orgId, parseInt(e.target.value))
                      }
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${alloc.color} 0%, ${alloc.color} ${alloc.percentage}%, #e5e1d8 ${alloc.percentage}%, #e5e1d8 100%)`,
                        accentColor: alloc.color,
                      }}
                    />
                  </div>
                );
              })}

              {/* Add org */}
              {!addingOrg ? (
                <button
                  onClick={() => setAddingOrg(true)}
                  className="w-full border-2 border-dashed rounded-2xl py-5 flex items-center justify-center gap-2 text-sm font-medium transition-colors hover:border-green-600 hover:text-green-700"
                  style={{ borderColor: "#c9c3b8", color: "#6b7280" }}
                >
                  <Plus className="w-4 h-4" />
                  Add another organization
                </button>
              ) : (
                <div
                  className="bg-white rounded-2xl border p-5"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Add an organization
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <select
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-green-600 appearance-none cursor-pointer pr-8"
                        style={{ borderColor: "#e5e1d8" }}
                      >
                        <option value="">Select an organization…</option>
                        {availableOrgs.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <button
                      onClick={handleAddOrg}
                      disabled={!selectedOrgId}
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#1a7a4a" }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setAddingOrg(false);
                        setSelectedOrgId("");
                      }}
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Total indicator */}
              <div
                className="rounded-xl px-5 py-3 flex items-center gap-3 border"
                style={{
                  backgroundColor: isValid
                    ? "#e8f5ee"
                    : totalPercent > 100
                    ? "#fef2f2"
                    : "#fff7ed",
                  borderColor: isValid
                    ? "#86efac"
                    : totalPercent > 100
                    ? "#fca5a5"
                    : "#fed7aa",
                }}
              >
                {isValid ? (
                  <CheckCircle
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: "#1a7a4a" }}
                  />
                ) : (
                  <AlertCircle
                    className="w-5 h-5 flex-shrink-0"
                    style={{
                      color: totalPercent > 100 ? "#dc2626" : "#ea580c",
                    }}
                  />
                )}
                <div className="flex-1">
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: isValid
                        ? "#1a7a4a"
                        : totalPercent > 100
                        ? "#dc2626"
                        : "#ea580c",
                    }}
                  >
                    {isValid
                      ? "Allocations total 100% — ready to give!"
                      : totalPercent > 100
                      ? `Over-allocated by ${totalPercent - 100}% — reduce some allocations`
                      : `${remaining}% unallocated — add more or adjust`}
                  </span>
                </div>
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{
                    color: isValid
                      ? "#1a7a4a"
                      : totalPercent > 100
                      ? "#dc2626"
                      : "#ea580c",
                  }}
                >
                  {totalPercent}%
                </span>
              </div>
            </div>

            {/* Right: chart + donation */}
            <div className="space-y-5">
              {/* Donut chart */}
              <div
                className="bg-white rounded-2xl border p-6"
                style={{ borderColor: "#e5e1d8" }}
              >
                <h2 className="font-display font-semibold text-lg text-gray-900 mb-4">
                  Giving Split
                </h2>

                {allocations.length > 0 ? (
                  <>
                    <div className="relative h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.filter((d) => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            strokeWidth={0}
                          >
                            {chartData
                              .filter((d) => d.value > 0)
                              .map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                              ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div
                          className="text-2xl font-bold font-display"
                          style={{ color: "#1a7a4a" }}
                        >
                          {totalPercent}%
                        </div>
                        <div className="text-xs text-gray-500">allocated</div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {allocations.map((a) => (
                        <div
                          key={a.orgId}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: a.color }}
                            />
                            <span className="text-gray-700 truncate">
                              {a.orgName}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-900 ml-2 flex-shrink-0">
                            {a.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                    Add organizations to see your giving split
                  </div>
                )}
              </div>

              {/* Donation amount */}
              <div
                className="bg-white rounded-2xl border p-6"
                style={{ borderColor: "#e5e1d8" }}
              >
                <h2 className="font-display font-semibold text-lg text-gray-900 mb-4">
                  Donation Amount
                </h2>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {DONATION_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => {
                        setDonationAmount(amt);
                        setUseCustom(false);
                      }}
                      className="py-2 rounded-lg text-sm font-semibold transition-all"
                      style={
                        !useCustom && donationAmount === amt
                          ? { backgroundColor: "#1a7a4a", color: "white" }
                          : { backgroundColor: "#f0ede6", color: "#374151" }
                      }
                    >
                      ${amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setUseCustom(true)}
                    className="py-2 rounded-lg text-sm font-semibold transition-all"
                    style={
                      useCustom
                        ? { backgroundColor: "#1a7a4a", color: "white" }
                        : { backgroundColor: "#f0ede6", color: "#374151" }
                    }
                  >
                    Custom
                  </button>
                </div>

                {useCustom && (
                  <div className="relative mb-4">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                      $
                    </span>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full pl-8 pr-4 py-2.5 border rounded-lg text-sm outline-none focus:border-green-600"
                      style={{ borderColor: "#e5e1d8" }}
                      min={1}
                      autoFocus
                    />
                  </div>
                )}

                {/* Per-org breakdown */}
                <div
                  className="space-y-1.5 mb-5 pt-3 border-t"
                  style={{ borderColor: "#f0ede6" }}
                >
                  {allocations
                    .filter((a) => a.percentage > 0)
                    .map((a) => (
                      <div
                        key={a.orgId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-600 truncate mr-2">
                          {a.orgName}
                        </span>
                        <span className="font-semibold text-gray-900 flex-shrink-0">
                          {formatCurrency(
                            (effectiveAmount * a.percentage) / 100
                          )}
                        </span>
                      </div>
                    ))}
                  <div
                    className="flex items-center justify-between pt-2 mt-2 border-t font-semibold"
                    style={{ borderColor: "#e5e1d8" }}
                  >
                    <span className="text-gray-900">Total</span>
                    <span style={{ color: "#1a7a4a" }}>
                      {formatCurrency(effectiveAmount)}
                    </span>
                  </div>
                </div>

                {/* Donate button — opens Stripe checkout */}
                <button
                  onClick={() => setCheckoutOpen(true)}
                  disabled={!isValid || effectiveAmount < 1}
                  className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  <Lock className="w-4 h-4" />
                  Donate Securely
                </button>

                <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Secured by Stripe · 100% tax-deductible
                </p>
              </div>

              <Link
                href="/discover"
                className="block text-center text-sm font-medium transition-colors hover:underline"
                style={{ color: "#1a7a4a" }}
              >
                Discover more organizations to add →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe checkout modal */}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        amountDollars={effectiveAmount}
        allocations={checkoutAllocations}
      />
    </>
  );
}
