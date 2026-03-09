"use client";

import { useState } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, Lock, AlertCircle, CheckCircle, ChevronDown } from "lucide-react";
import {
  PORTFOLIO_ALLOCATIONS,
  ORGANIZATIONS,
  formatCurrency,
  PortfolioAllocation,
} from "@/lib/placeholder-data";
import CheckoutModal, { DonationAllocation } from "@/components/CheckoutModal";

const DONATION_AMOUNTS = [25, 50, 100, 250, 500];

const EXTRA_COLORS = ["#ec4899", "#8b5cf6", "#06b6d4", "#ef4444", "#84cc16"];

const CATEGORY_LABELS: Record<string, string> = {
  churches: "Church",
  "animal-rescue": "Animal Rescue",
  nonprofits: "Nonprofit",
  education: "Education",
  environment: "Environment",
  local: "Local Cause",
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) {
  if (active && payload?.length) {
    return (
      <div className="px-3 py-2 rounded-lg shadow-lg text-xs font-semibold bg-gray-900 text-white">
        {payload[0].name}: {payload[0].value}%
      </div>
    );
  }
  return null;
}

export default function PortfolioPage() {
  const [allocations, setAllocations] = useState<PortfolioAllocation[]>(PORTFOLIO_ALLOCATIONS);
  const [donationAmount, setDonationAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [addingOrg, setAddingOrg] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const totalPercent = allocations.reduce((sum, a) => sum + a.percentage, 0);
  const remaining = 100 - totalPercent;
  const isValid = totalPercent === 100;
  const effectiveAmount = useCustom ? parseFloat(customAmount) || 0 : donationAmount;

  const handleSlider = (orgId: string, value: number) => {
    setAllocations((prev) =>
      prev.map((a) => (a.orgId === orgId ? { ...a, percentage: value } : a))
    );
  };

  const handlePercentInput = (orgId: string, raw: string) => {
    const val = Math.min(100, Math.max(0, parseInt(raw) || 0));
    setAllocations((prev) =>
      prev.map((a) => (a.orgId === orgId ? { ...a, percentage: val } : a))
    );
  };

  const handleRemove = (orgId: string) => {
    setAllocations((prev) => prev.filter((a) => a.orgId !== orgId));
  };

  const handleDistributeEvenly = () => {
    if (allocations.length === 0) return;
    const base = Math.floor(100 / allocations.length);
    const remainder = 100 - base * allocations.length;
    setAllocations((prev) =>
      prev.map((a, i) => ({ ...a, percentage: base + (i === 0 ? remainder : 0) }))
    );
  };

  const handleAddOrg = () => {
    const org = ORGANIZATIONS.find((o) => o.id === selectedOrgId);
    if (!org || allocations.find((a) => a.orgId === org.id)) return;
    setAllocations((prev) => [
      ...prev,
      {
        orgId: org.id,
        orgName: org.name,
        percentage: 0,
        color: EXTRA_COLORS[allocations.length % EXTRA_COLORS.length],
      },
    ]);
    setAddingOrg(false);
    setSelectedOrgId("");
  };

  const availableOrgs = ORGANIZATIONS.filter(
    (o) => !allocations.find((a) => a.orgId === o.id)
  );

  const chartData = allocations
    .filter((a) => a.percentage > 0)
    .map((a) => ({ name: a.orgName, value: a.percentage, color: a.color }));

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
      <div className="min-h-screen bg-white">
        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="border-b" style={{ borderColor: "#f0ede6" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">
                My Giving Portfolio
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Allocate your donation across multiple organizations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDistributeEvenly}
                disabled={allocations.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "#d1d5db", color: "#374151" }}
              >
                Distribute Evenly
              </button>
              <button
                onClick={() => setAddingOrg(true)}
                disabled={availableOrgs.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                <Plus className="w-4 h-4" />
                Add Charity
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-5 gap-8">

            {/* ── Left: Donut chart ──────────────────────────────── */}
            <div className="lg:col-span-2">
              <div
                className="rounded-2xl border p-6 sticky top-20"
                style={{ borderColor: "#e5e1d8" }}
              >
                <h2 className="font-semibold text-gray-900 mb-5 text-sm uppercase tracking-wide">
                  Giving Split
                </h2>

                {chartData.length > 0 ? (
                  <>
                    {/* Chart */}
                    <div className="relative h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={72}
                            outerRadius={108}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            strokeWidth={0}
                          >
                            {chartData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span
                          className="font-display text-3xl font-bold"
                          style={{ color: isValid ? "#1a7a4a" : "#374151" }}
                        >
                          {totalPercent}%
                        </span>
                        <span className="text-xs text-gray-400 mt-0.5">allocated</span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-5 space-y-2.5">
                      {allocations.map((a) => (
                        <div key={a.orgId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: a.color }}
                            />
                            <span className="text-gray-700 truncate">{a.orgName}</span>
                          </div>
                          <span className="font-semibold text-gray-900 ml-3 flex-shrink-0">
                            {a.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                    Add organizations to see your giving split
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Org list + controls ─────────────────────── */}
            <div className="lg:col-span-3 space-y-3">

              {/* Add org panel */}
              {addingOrg && (
                <div
                  className="rounded-2xl border p-5"
                  style={{ borderColor: "#e5e1d8", backgroundColor: "#faf9f6" }}
                >
                  <p className="text-sm font-semibold text-gray-800 mb-3">
                    Add an organization
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <select
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-green-600 appearance-none pr-8 bg-white"
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
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                      style={{ backgroundColor: "#1a7a4a" }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingOrg(false); setSelectedOrgId(""); }}
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Org rows */}
              {allocations.map((alloc) => {
                const org = ORGANIZATIONS.find((o) => o.id === alloc.orgId);
                const dollarAmount = (effectiveAmount * alloc.percentage) / 100;
                const categoryLabel = org ? (CATEGORY_LABELS[org.category] || org.category) : "";

                return (
                  <div
                    key={alloc.orgId}
                    className="rounded-2xl border bg-white p-5"
                    style={{ borderColor: "#e5e1d8" }}
                  >
                    {/* Top row: thumbnail + info + percent + remove */}
                    <div className="flex items-center gap-4 mb-4">
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {org?.imageUrl ? (
                          <img
                            src={org.imageUrl}
                            alt={alloc.orgName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{ backgroundColor: alloc.color + "33" }}
                          />
                        )}
                      </div>

                      {/* Name + category */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/org/${alloc.orgId}`}
                          className="font-semibold text-gray-900 hover:text-green-700 transition-colors text-sm leading-tight block truncate"
                        >
                          {alloc.orgName}
                        </Link>
                        {categoryLabel && (
                          <span
                            className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: alloc.color + "18", color: alloc.color }}
                          >
                            {categoryLabel}
                          </span>
                        )}
                      </div>

                      {/* Percent input */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={alloc.percentage}
                            onChange={(e) => handlePercentInput(alloc.orgId, e.target.value)}
                            className="w-16 text-right border rounded-lg px-2 py-1.5 text-sm font-semibold outline-none focus:border-green-600 tabular-nums"
                            style={{ borderColor: "#e5e1d8", color: "#1a7a4a" }}
                          />
                          <span className="text-sm font-semibold text-gray-500">%</span>
                        </div>
                        <span className="text-xs text-gray-400">{formatCurrency(dollarAmount)}</span>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(alloc.orgId)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Slider */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={alloc.percentage}
                      onChange={(e) => handleSlider(alloc.orgId, parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${alloc.color} 0%, ${alloc.color} ${alloc.percentage}%, #e5e1d8 ${alloc.percentage}%, #e5e1d8 100%)`,
                        accentColor: alloc.color,
                      }}
                    />
                  </div>
                );
              })}

              {/* Empty state */}
              {allocations.length === 0 && !addingOrg && (
                <div className="rounded-2xl border-2 border-dashed py-16 text-center" style={{ borderColor: "#e5e1d8" }}>
                  <p className="text-gray-400 text-sm mb-4">Your portfolio is empty.</p>
                  <button
                    onClick={() => setAddingOrg(true)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Charity
                  </button>
                </div>
              )}

              {/* ── Allocation status + Donate ─────────────────── */}
              <div
                className="rounded-2xl border p-5"
                style={{
                  borderColor: isValid ? "#86efac" : totalPercent > 100 ? "#fca5a5" : "#e5e1d8",
                  backgroundColor: isValid ? "#f0fdf4" : totalPercent > 100 ? "#fef2f2" : "white",
                }}
              >
                {/* Status row */}
                <div className="flex items-center gap-2 mb-5">
                  {isValid ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#1a7a4a" }} />
                  ) : (
                    <AlertCircle
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: totalPercent > 100 ? "#dc2626" : "#d97706" }}
                    />
                  )}
                  <span
                    className="text-sm font-semibold flex-1"
                    style={{
                      color: isValid ? "#1a7a4a" : totalPercent > 100 ? "#dc2626" : "#92400e",
                    }}
                  >
                    {isValid
                      ? "Allocation complete — ready to donate!"
                      : totalPercent > 100
                      ? `Over-allocated by ${totalPercent - 100}% — reduce some allocations`
                      : `${remaining}% remaining — adjust sliders to reach 100%`}
                  </span>
                  <span
                    className="font-display text-xl font-bold tabular-nums"
                    style={{ color: isValid ? "#1a7a4a" : totalPercent > 100 ? "#dc2626" : "#374151" }}
                  >
                    {totalPercent}%
                  </span>
                </div>

                {/* Amount selector */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Donation amount
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {DONATION_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => { setDonationAmount(amt); setUseCustom(false); }}
                        className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                        style={
                          !useCustom && donationAmount === amt
                            ? { backgroundColor: "#1a7a4a", color: "white" }
                            : { backgroundColor: "#f3f4f6", color: "#374151" }
                        }
                      >
                        ${amt}
                      </button>
                    ))}
                    <button
                      onClick={() => setUseCustom(true)}
                      className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                      style={
                        useCustom
                          ? { backgroundColor: "#1a7a4a", color: "white" }
                          : { backgroundColor: "#f3f4f6", color: "#374151" }
                      }
                    >
                      Custom
                    </button>
                  </div>
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
                        className="w-full pl-7 pr-4 py-2.5 border rounded-lg text-sm outline-none focus:border-green-600"
                        style={{ borderColor: "#e5e1d8" }}
                        min={1}
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Per-org breakdown */}
                {allocations.some((a) => a.percentage > 0) && (
                  <div
                    className="space-y-1.5 mb-4 pt-4 border-t text-sm"
                    style={{ borderColor: "#e5e1d8" }}
                  >
                    {allocations
                      .filter((a) => a.percentage > 0)
                      .map((a) => (
                        <div key={a.orgId} className="flex justify-between">
                          <span className="text-gray-500 truncate mr-3">{a.orgName}</span>
                          <span className="font-semibold text-gray-900 flex-shrink-0">
                            {formatCurrency((effectiveAmount * a.percentage) / 100)}
                          </span>
                        </div>
                      ))}
                    <div
                      className="flex justify-between pt-2 border-t font-semibold"
                      style={{ borderColor: "#e5e1d8" }}
                    >
                      <span className="text-gray-900">Total</span>
                      <span style={{ color: "#1a7a4a" }}>{formatCurrency(effectiveAmount)}</span>
                    </div>
                  </div>
                )}

                {/* Donate button */}
                <button
                  onClick={() => setCheckoutOpen(true)}
                  disabled={!isValid || effectiveAmount < 1}
                  className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  <Lock className="w-4 h-4" />
                  Donate {isValid && effectiveAmount >= 1 ? formatCurrency(effectiveAmount) : "Securely"}
                </button>
                <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Secured by Stripe · 100% tax-deductible
                </p>
              </div>

              <div className="text-center">
                <Link
                  href="/discover"
                  className="text-sm font-medium hover:underline"
                  style={{ color: "#1a7a4a" }}
                >
                  Discover more organizations →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        amountDollars={effectiveAmount}
        allocations={checkoutAllocations}
      />
    </>
  );
}
