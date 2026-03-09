"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, Lock, AlertCircle, CheckCircle, Search, RefreshCw, X } from "lucide-react";
import {
  PORTFOLIO_ALLOCATIONS,
  ORGANIZATIONS,
  formatCurrency,
  PortfolioAllocation,
} from "@/lib/placeholder-data";
import CheckoutModal, { DonationAllocation } from "@/components/CheckoutModal";
import { createClient } from "@/lib/supabase-browser";

interface LocalAllocation extends PortfolioAllocation {
  imageUrl?: string;
  category?: string;
}

interface OrgSearchResult {
  id: string;
  name: string;
  category: string;
  location: string;
  image_url: string | null;
}

interface RecurringDonation {
  id: string;
  org_id: string;
  org_name: string;
  amount_cents: number;
  frequency: string;
  active: boolean;
  created_at: string;
}

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

type Frequency = (typeof FREQUENCIES)[number]["value"];

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
  const [allocations, setAllocations] = useState<LocalAllocation[]>(
    PORTFOLIO_ALLOCATIONS.map((a) => {
      const org = ORGANIZATIONS.find((o) => o.id === a.orgId);
      return { ...a, imageUrl: org?.imageUrl, category: org?.category };
    })
  );
  const [donationAmount, setDonationAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [addingOrg, setAddingOrg] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [recurringDonations, setRecurringDonations] = useState<RecurringDonation[]>([]);
  const [recurringStatus, setRecurringStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OrgSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced Supabase search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const supabase = createClient() as any;
      const addedIds = allocations.map((a) => a.orgId);
      const { data } = await supabase
        .from("organizations")
        .select("id, name, category, location, image_url")
        .eq("visible", true)
        .ilike("name", `%${searchQuery}%`)
        .limit(8);
      if (data) {
        setSearchResults(data.filter((r: OrgSearchResult) => !addedIds.includes(r.id)));
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, allocations]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Load recurring donations
  useEffect(() => {
    async function loadRecurring() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await (supabase as any)
        .from("recurring_donations")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (data) setRecurringDonations(data);
    }
    loadRecurring();
  }, []);

  async function handleCancelRecurring(id: string) {
    await (createClient() as any)
      .from("recurring_donations")
      .update({ active: false })
      .eq("id", id);
    setRecurringDonations((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleStartPortfolioRecurring() {
    if (effectiveAmount < 1 || !isValid) return;
    setRecurringStatus("saving");
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      await Promise.all(
        allocations
          .filter((a) => a.percentage > 0)
          .map((a) =>
            (supabase as any).from("recurring_donations").insert({
              user_id: userId ?? null,
              org_id: a.orgId,
              org_name: a.orgName,
              amount_cents: Math.round(effectiveAmount * (a.percentage / 100) * 100),
              frequency,
              active: true,
            })
          )
      );
      setRecurringStatus("saved");
      // Refresh list
      const { data } = await (supabase as any)
        .from("recurring_donations")
        .select("*")
        .eq("user_id", userId)
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (data) setRecurringDonations(data);
      setTimeout(() => setRecurringStatus("idle"), 3000);
    } catch {
      setRecurringStatus("error");
      setTimeout(() => setRecurringStatus("idle"), 3000);
    }
  }

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

  const handleAddOrgFromResult = (result: OrgSearchResult) => {
    if (allocations.find((a) => a.orgId === result.id)) return;
    setAllocations((prev) => [
      ...prev,
      {
        orgId: result.id,
        orgName: result.name,
        percentage: 0,
        color: EXTRA_COLORS[prev.length % EXTRA_COLORS.length],
        imageUrl: result.image_url ?? undefined,
        category: result.category,
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    setAddingOrg(false);
  };

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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
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
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-800">Add an organization</p>
                    <button
                      onClick={() => { setAddingOrg(false); setSearchQuery(""); setSearchResults([]); }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                  <div ref={searchRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search organizations by name…"
                        autoFocus
                        className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm bg-white outline-none focus:border-green-600"
                        style={{ borderColor: "#e5e1d8" }}
                      />
                      {searchLoading && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          Searching…
                        </span>
                      )}
                    </div>

                    {showDropdown && searchResults.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border shadow-lg overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onMouseDown={() => handleAddOrgFromResult(result)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                              {result.image_url ? (
                                <img src={result.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-200" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
                              <p className="text-xs text-gray-400 truncate">{result.location}</p>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0 capitalize">
                              {CATEGORY_LABELS[result.category] ?? result.category}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {showDropdown && searchQuery && !searchLoading && searchResults.length === 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border shadow-lg px-4 py-3 text-sm text-gray-400" style={{ borderColor: "#e5e1d8" }}>
                        No organizations found for &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Org rows */}
              {allocations.map((alloc) => {
                const placeholderOrg = ORGANIZATIONS.find((o) => o.id === alloc.orgId);
                const imageUrl = alloc.imageUrl ?? placeholderOrg?.imageUrl;
                const category = alloc.category ?? placeholderOrg?.category ?? "";
                const dollarAmount = (effectiveAmount * alloc.percentage) / 100;
                const categoryLabel = CATEGORY_LABELS[category] || category;

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
                        {imageUrl ? (
                          <img
                            src={imageUrl}
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

                {/* One-time / Recurring toggle */}
                <div className="flex rounded-xl p-1 mb-4" style={{ backgroundColor: "#f3f4f6" }}>
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

                {/* Frequency (when recurring) */}
                {isRecurring && (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {FREQUENCIES.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFrequency(f.value)}
                        className="py-2 rounded-lg text-xs font-semibold transition-all"
                        style={
                          frequency === f.value
                            ? { backgroundColor: "#1a7a4a", color: "white" }
                            : { backgroundColor: "#f3f4f6", color: "#374151" }
                        }
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Amount selector */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {isRecurring ? `Amount per ${FREQUENCIES.find((f) => f.value === frequency)?.label.toLowerCase() ?? "period"}` : "Donation amount"}
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

                {/* Donate / Start Recurring button */}
                {isRecurring ? (
                  <button
                    onClick={handleStartPortfolioRecurring}
                    disabled={!isValid || effectiveAmount < 1 || recurringStatus === "saving"}
                    className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    {recurringStatus === "saving"
                      ? "Setting up…"
                      : recurringStatus === "saved"
                      ? "Recurring giving set up!"
                      : isValid && effectiveAmount >= 1
                      ? `Give ${formatCurrency(effectiveAmount)} ${FREQUENCIES.find((f) => f.value === frequency)?.label ?? ""}`
                      : "Set Up Recurring Giving"}
                  </button>
                ) : (
                  <button
                    onClick={() => setCheckoutOpen(true)}
                    disabled={!isValid || effectiveAmount < 1}
                    className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    <Lock className="w-4 h-4" />
                    Donate {isValid && effectiveAmount >= 1 ? formatCurrency(effectiveAmount) : "Securely"}
                  </button>
                )}
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

          {/* ── Active Recurring Giving ──────────────────────────────── */}
          {recurringDonations.length > 0 && (
            <div className="mt-10 pb-10">
              <h2 className="font-display text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                Active Recurring Giving
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recurringDonations.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border bg-white p-4 flex items-center justify-between gap-4"
                    style={{ borderColor: "#e5e1d8" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: "#1a7a4a" }}
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          {r.frequency}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.org_name}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: "#1a7a4a" }}>
                        {formatCurrency(r.amount_cents / 100)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancelRecurring(r.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
                      aria-label="Cancel recurring"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
