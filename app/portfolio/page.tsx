"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  Plus,
  Trash2,
  Lock,
  AlertCircle,
  CheckCircle,
  Search,
  RefreshCw,
  X,
  PieChart as PieChartIcon,
  MapPin,
  Info,
  Repeat2,
  Receipt,
} from "lucide-react";
import { formatCurrency } from "@/lib/placeholder-data";
import CheckoutModal, { DonationAllocation } from "@/components/CheckoutModal";
import { createClient } from "@/lib/supabase-browser";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioOrg {
  orgId: string;
  orgName: string;
  percentage: number;
  imageUrl?: string;
  category?: string;
  location?: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN_SHADES = ["#1a7a4a", "#2d9e6b", "#4cb87e", "#7dd4a8", "#b3e8cc"];

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

type Frequency = (typeof FREQUENCIES)[number]["value"];

const DONATION_AMOUNTS = [25, 50, 100, 250, 500];

const CATEGORY_LABELS: Record<string, string> = {
  churches: "Church",
  "animal-rescue": "Animal Rescue",
  nonprofits: "Nonprofit",
  education: "Education",
  environment: "Environment",
  local: "Local Cause",
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [orgs, setOrgs] = useState<PortfolioOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Donation
  const [donationAmount, setDonationAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [recurringDonations, setRecurringDonations] = useState<RecurringDonation[]>([]);

  // Add Charity panel
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OrgSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Explainer banner
  const [bannerDismissed, setBannerDismissed] = useState(true); // start hidden, load from LS after mount
  useEffect(() => {
    setBannerDismissed(localStorage.getItem("portfolio_banner_dismissed") === "1");
  }, []);
  function dismissBanner() {
    setBannerDismissed(true);
    localStorage.setItem("portfolio_banner_dismissed", "1");
  }

  // Track whether portfolio has loaded (to avoid saving on initial render)
  const hasLoadedRef = useRef(false);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Load portfolio on mount ──────────────────────────────────────────────

  useEffect(() => {
    async function loadPortfolio() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }
      setUserId(userData.user.id);
      setUserEmail(userData.user.email ?? null);

      // Step 1: load portfolio rows
      const { data: portfolioRows } = await (supabase as any)
        .from("portfolio_orgs")
        .select("org_id, allocation")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: true });

      if (portfolioRows && portfolioRows.length > 0) {
        // Step 2: fetch org details in a separate query (avoids fragile PostgREST join)
        const orgIds = portfolioRows.map((r: any) => r.org_id);
        const { data: orgDetails } = await (supabase as any)
          .from("organizations")
          .select("id, name, image_url, category, location")
          .in("id", orgIds);
        const orgMap = new Map((orgDetails ?? []).map((o: any) => [o.id, o]));

        const loaded: PortfolioOrg[] = portfolioRows.map((row: any) => {
          const org: any = orgMap.get(row.org_id);
          return {
            orgId: row.org_id,
            orgName: org?.name ?? row.org_id,
            percentage: row.allocation ?? 0,
            imageUrl: org?.image_url ?? undefined,
            category: org?.category ?? undefined,
            location: org?.location ?? undefined,
          };
        });
        setOrgs(loaded);
      }

      // Load recurring donations
      const { data: recurringData } = await (supabase as any)
        .from("recurring_donations")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (recurringData) setRecurringDonations(recurringData);

      setLoading(false);
      hasLoadedRef.current = true;
    }
    loadPortfolio();
  }, []);

  // ── Debounced save of allocations ────────────────────────────────────────

  const saveAllocations = useCallback(
    (updatedOrgs: PortfolioOrg[]) => {
      if (!hasLoadedRef.current || !userId) return;
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(async () => {
        const supabase = createClient() as any;
        await Promise.all(
          updatedOrgs.map((o) =>
            supabase
              .from("portfolio_orgs")
              .update({ allocation: o.percentage })
              .eq("user_id", userId)
              .eq("org_id", o.orgId)
          )
        );
      }, 500);
    },
    [userId]
  );

  // ── Search orgs ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const supabase = createClient() as any;
      const addedIds = orgs.map((o) => o.orgId);
      const { data } = await supabase
        .from("organizations")
        .select("id, name, category, location, image_url")
        .neq("visible", false)
        .ilike("name", `%${searchQuery}%`)
        .limit(8);
      if (data) {
        setSearchResults(data.filter((r: OrgSearchResult) => !addedIds.includes(r.id)));
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, orgs]);

  // Focus search input when panel opens
  useEffect(() => {
    if (addPanelOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [addPanelOpen]);

  // Close panel on outside click
  useEffect(() => {
    if (!addPanelOpen) return;
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setAddPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [addPanelOpen]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSlider = (orgId: string, value: number) => {
    const updated = orgs.map((o) => (o.orgId === orgId ? { ...o, percentage: value } : o));
    setOrgs(updated);
    saveAllocations(updated);
  };

  const handlePercentInput = (orgId: string, raw: string) => {
    const val = Math.min(100, Math.max(0, parseInt(raw) || 0));
    const updated = orgs.map((o) => (o.orgId === orgId ? { ...o, percentage: val } : o));
    setOrgs(updated);
    saveAllocations(updated);
  };

  const handleRemove = async (orgId: string) => {
    const updated = orgs.filter((o) => o.orgId !== orgId);
    setOrgs(updated);
    if (!userId) return;
    const supabase = createClient() as any;
    await supabase.from("portfolio_orgs").delete().eq("user_id", userId).eq("org_id", orgId);
  };

  const handleDistributeEvenly = async () => {
    if (orgs.length === 0) return;
    const base = Math.floor(100 / orgs.length);
    const remainder = 100 - base * orgs.length;
    const updated = orgs.map((o, i) => ({
      ...o,
      percentage: base + (i === 0 ? remainder : 0),
    }));
    setOrgs(updated);
    if (!userId) return;
    const supabase = createClient() as any;
    await Promise.all(
      updated.map((o) =>
        supabase
          .from("portfolio_orgs")
          .update({ allocation: o.percentage })
          .eq("user_id", userId)
          .eq("org_id", o.orgId)
      )
    );
  };

  const handleAddOrg = async (result: OrgSearchResult) => {
    if (orgs.find((o) => o.orgId === result.id)) return;

    const newOrg: PortfolioOrg = {
      orgId: result.id,
      orgName: result.name,
      percentage: 0,
      imageUrl: result.image_url ?? undefined,
      category: result.category,
      location: result.location,
    };

    // Add then immediately distribute evenly so the org shows in the pie
    setOrgs((prev) => {
      const next = [...prev, newOrg];
      const base = Math.floor(100 / next.length);
      const remainder = 100 - base * next.length;
      return next.map((o, i) => ({ ...o, percentage: base + (i === 0 ? remainder : 0) }));
    });
    setAddPanelOpen(false);
    setSearchQuery("");

    if (!userId) return;
    const supabase = createClient() as any;

    // Upsert new row then save all updated allocations
    await supabase.from("portfolio_orgs").upsert(
      { user_id: userId, org_id: result.id, allocation: 0 },
      { onConflict: "user_id,org_id" }
    );
    // Save the redistributed allocations (read from current state after update)
    setOrgs((current) => {
      // fire-and-forget save
      Promise.all(
        current.map((o) =>
          supabase
            .from("portfolio_orgs")
            .update({ allocation: o.percentage })
            .eq("user_id", userId)
            .eq("org_id", o.orgId)
        )
      );
      return current;
    });
  };

  const handleCancelRecurring = async (id: string) => {
    try {
      await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recurringDonationId: id }),
      });
    } catch { /* silent — still remove from UI */ }
    setRecurringDonations((prev) => prev.filter((r) => r.id !== id));
  };

  async function reloadRecurringDonations() {
    if (!userId) return;
    const supabase = createClient();
    const { data } = await (supabase as any)
      .from("recurring_donations")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (data) setRecurringDonations(data);
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const totalPercent = orgs.reduce((sum, o) => sum + o.percentage, 0);
  const remaining = 100 - totalPercent;
  const isValid = totalPercent === 100;
  const effectiveAmount = useCustom ? parseFloat(customAmount) || 0 : donationAmount;

  const chartData = orgs
    .filter((o) => o.percentage > 0)
    .map((o, i) => ({
      name: o.orgName,
      value: o.percentage,
      color: GREEN_SHADES[i % GREEN_SHADES.length],
    }));

  const checkoutAllocations: DonationAllocation[] = orgs
    .filter((o) => o.percentage > 0)
    .map((o) => ({
      orgId: o.orgId,
      orgName: o.orgName,
      percentage: o.percentage,
      amountCents: Math.round(effectiveAmount * (o.percentage / 100) * 100),
    }));

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b" style={{ borderColor: "#f0ede6" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="h-7 w-48 rounded-lg bg-gray-100 animate-pulse mb-1" />
            <div className="h-4 w-72 rounded-lg bg-gray-100 animate-pulse" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <div className="rounded-2xl border h-80 animate-pulse bg-gray-50" style={{ borderColor: "#e5e1d8" }} />
            </div>
            <div className="lg:col-span-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border h-28 animate-pulse bg-gray-50" style={{ borderColor: "#e5e1d8" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* ── Page header ───────────────────────────────────────────────── */}
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
                disabled={orgs.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "#d1d5db", color: "#374151" }}
              >
                Distribute Evenly
              </button>
              <button
                onClick={() => setAddPanelOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                <Plus className="w-4 h-4" />
                Add Charity
              </button>
            </div>
          </div>
        </div>

        {/* ── Explainer banner (dismissible) ────────────────────────────── */}
        {!bannerDismissed && orgs.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div
              className="relative rounded-xl border bg-white overflow-hidden"
              style={{ borderColor: "#e5e1d8" }}
            >
              {/* Green left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: "#1a7a4a" }} />
              <div className="pl-5 pr-10 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      Icon: Info,
                      label: "Build Your Split",
                      desc: "Add organizations and set what percentage of your donation each one receives.",
                    },
                    {
                      Icon: Repeat2,
                      label: "Give Once or Recurring",
                      desc: "Make a one-time donation or set up weekly, bi-weekly, monthly, or yearly giving.",
                    },
                    {
                      Icon: Receipt,
                      label: "One Tax Receipt",
                      desc: "We handle the distribution and send you a single consolidated tax receipt.",
                    },
                  ].map(({ Icon, label, desc }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: "#e8f5ee" }}
                      >
                        <Icon className="w-4 h-4" style={{ color: "#1a7a4a" }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={dismissBanner}
                className="absolute top-3 right-3 p-1 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {orgs.length === 0 ? (
          <div className="max-w-2xl mx-auto px-4 py-16">
            {/* Full explainer for first-time users */}
            <div
              className="rounded-2xl border bg-white p-8 mb-8"
              style={{ borderColor: "#e5e1d8" }}
            >
              <h2 className="font-display text-xl font-bold text-gray-900 mb-6">
                How Your Giving Portfolio Works
              </h2>
              <div className="space-y-6">
                {[
                  {
                    num: "01",
                    title: "Add Organizations",
                    body: "Search for any verified nonprofit, church, or cause and add it to your portfolio. You can add as many as you want.",
                  },
                  {
                    num: "02",
                    title: "Set Your Split",
                    body: "Use the sliders to decide what percentage of your donation goes to each organization. It must add up to 100%.",
                  },
                  {
                    num: "03",
                    title: "Give on Your Terms",
                    body: "Choose a one-time amount or set up recurring giving — weekly, bi-weekly, monthly, or yearly. We split and send the funds automatically and give you one tax receipt.",
                  },
                ].map(({ num, title, body }) => (
                  <div key={num} className="flex gap-4">
                    <div
                      className="text-sm font-bold tabular-nums flex-shrink-0 w-8 pt-0.5"
                      style={{ color: "#1a7a4a" }}
                    >
                      {num}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">{title}</p>
                      <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="mt-6 rounded-lg px-4 py-3 text-sm text-gray-500 italic"
                style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}
              >
                Think of it like a charitable investment portfolio — you decide the allocation, we handle the rest.
              </div>
            </div>

            {/* Centered search prompt */}
            <div className="flex flex-col items-center text-center">
              <PieChartIcon
                className="mb-4"
                style={{ width: 40, height: 40, color: "#e5e1d8" }}
              />
              <h3 className="font-display text-lg font-bold text-gray-900 mb-1">
                Add your first organization
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Search below to get started.
              </p>
            </div>

            {/* Inline search */}
            <div ref={searchRef} className="relative w-full max-w-sm mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setAddPanelOpen(false); // use inline when empty state
                  }}
                  placeholder="Search organizations…"
                  className="w-full pl-9 pr-4 py-3 border rounded-xl text-sm bg-white outline-none focus:border-green-600 transition-colors"
                  style={{ borderColor: "#e5e1d8" }}
                />
                {searchLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Searching…
                  </span>
                )}
              </div>

              {searchQuery && searchResults.length > 0 && (
                <div
                  className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border shadow-lg overflow-hidden text-left"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onMouseDown={() => handleAddOrg(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {result.image_url ? (
                          <img src={result.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {result.location}
                        </p>
                      </div>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}
                      >
                        {CATEGORY_LABELS[result.category] ?? result.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && !searchLoading && searchResults.length === 0 && (
                <div
                  className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border shadow-lg px-4 py-3 text-sm text-gray-400 text-left"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  No organizations found for &quot;{searchQuery}&quot;
                </div>
              )}
            </div>

            <p className="mt-6 text-sm text-center">
              <Link href="/discover" className="font-medium hover:underline" style={{ color: "#1a7a4a" }}>
                Browse all organizations →
              </Link>
            </p>
          </div>
        ) : (
          /* ── Portfolio layout ──────────────────────────────────────────── */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid lg:grid-cols-5 gap-8">

              {/* ── Left: Donut chart (40%) ─────────────────────────────── */}
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
                      <div className="relative h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={64}
                              outerRadius={100}
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
                        {orgs.map((o, i) => (
                          <div key={o.orgId} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: GREEN_SHADES[i % GREEN_SHADES.length] }}
                              />
                              <span className="text-gray-700 truncate">{o.orgName}</span>
                            </div>
                            <span className="font-semibold text-gray-900 ml-3 flex-shrink-0">
                              {o.percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-56 flex items-center justify-center">
                      <p className="text-sm text-gray-400 text-center px-4">
                        Set allocations to see your giving split
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right: Org rows + donate card (60%) ────────────────── */}
              <div className="lg:col-span-3 space-y-3">

                {/* Org rows */}
                {orgs.map((org, i) => {
                  const color = GREEN_SHADES[i % GREEN_SHADES.length];
                  const dollarAmount = (effectiveAmount * org.percentage) / 100;
                  const categoryLabel = CATEGORY_LABELS[org.category ?? ""] || org.category;

                  return (
                    <div
                      key={org.orgId}
                      className="rounded-2xl border bg-white p-5"
                      style={{ borderColor: "#e5e1d8" }}
                    >
                      {/* Top row */}
                      <div className="flex items-center gap-4 mb-4">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          {org.imageUrl ? (
                            <img
                              src={org.imageUrl}
                              alt={org.orgName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200" />
                          )}
                        </div>

                        {/* Name + category */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/org/${org.orgId}`}
                            className="font-semibold text-gray-900 hover:text-green-700 transition-colors text-sm leading-tight block truncate"
                          >
                            {org.orgName}
                          </Link>
                          {categoryLabel && (
                            <span
                              className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}
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
                              value={org.percentage}
                              onChange={(e) => handlePercentInput(org.orgId, e.target.value)}
                              className="w-16 text-right border rounded-lg px-2 py-1.5 text-sm font-semibold outline-none focus:border-green-600 tabular-nums"
                              style={{ borderColor: "#e5e1d8", color: "#1a7a4a" }}
                            />
                            <span className="text-sm font-semibold text-gray-500">%</span>
                          </div>
                          <span className="text-xs text-gray-400">{formatCurrency(dollarAmount)}</span>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => handleRemove(org.orgId)}
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
                        value={org.percentage}
                        onChange={(e) => handleSlider(org.orgId, parseInt(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${color} 0%, ${color} ${org.percentage}%, #e5e1d8 ${org.percentage}%, #e5e1d8 100%)`,
                          accentColor: color,
                        }}
                      />
                    </div>
                  );
                })}

                {/* Add another org link */}
                <button
                  onClick={() => setAddPanelOpen(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  <Plus className="w-4 h-4" />
                  Add another charity
                </button>

                {/* ── Allocation status + Fund Your Portfolio ─────────── */}
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    borderColor: isValid ? "#86efac" : totalPercent > 100 ? "#fca5a5" : "#e5e1d8",
                    backgroundColor: isValid ? "#f0fdf4" : totalPercent > 100 ? "#fef2f2" : "white",
                  }}
                >
                  {/* Allocation status */}
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

                  {/* Frequency (recurring only) */}
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
                      {isRecurring
                        ? `Amount per ${FREQUENCIES.find((f) => f.value === frequency)?.label.toLowerCase() ?? "period"}`
                        : "Donation amount"}
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
                          min={0.01}
                          step={0.01}
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {/* Per-org breakdown */}
                  {orgs.some((o) => o.percentage > 0) && (
                    <div
                      className="space-y-1.5 mb-4 pt-4 border-t text-sm"
                      style={{ borderColor: "#e5e1d8" }}
                    >
                      {orgs
                        .filter((o) => o.percentage > 0)
                        .map((o) => (
                          <div key={o.orgId} className="flex justify-between">
                            <span className="text-gray-500 truncate mr-3">{o.orgName}</span>
                            <span className="font-semibold text-gray-900 flex-shrink-0">
                              {formatCurrency((effectiveAmount * o.percentage) / 100)}
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
                      onClick={() => setCheckoutOpen(true)}
                      disabled={!isValid || effectiveAmount < 0.50}
                      className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                      style={{ backgroundColor: "#1a7a4a" }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      {isValid && effectiveAmount >= 0.50
                        ? `Give ${formatCurrency(effectiveAmount)} ${FREQUENCIES.find((f) => f.value === frequency)?.label ?? ""}`
                        : "Set Up Recurring Giving"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setCheckoutOpen(true)}
                      disabled={!isValid || effectiveAmount < 0.50}
                      className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                      style={{ backgroundColor: "#1a7a4a" }}
                    >
                      <Lock className="w-4 h-4" />
                      Donate {isValid && effectiveAmount >= 0.50 ? formatCurrency(effectiveAmount) : "Securely"}
                    </button>
                  )}
                  <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    Secured by Stripe · 100% tax-deductible
                  </p>
                </div>

                <div className="text-center pb-2">
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

            {/* ── Active Recurring Giving ─────────────────────────────────── */}
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
        )}
      </div>

      {/* ── Add Charity slide-in panel ────────────────────────────────────── */}
      {addPanelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={() => setAddPanelOpen(false)}
          />
          {/* Panel */}
          <div
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            style={{ borderLeft: "1px solid #e5e1d8" }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "#f0ede6" }}>
              <h3 className="font-display text-lg font-bold text-gray-900">Add a Charity</h3>
              <button
                onClick={() => setAddPanelOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search input */}
            <div className="px-6 py-4 border-b" style={{ borderColor: "#f0ede6" }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search organizations by name…"
                  className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-white outline-none focus:border-green-600 transition-colors"
                  style={{ borderColor: "#e5e1d8" }}
                />
                {searchLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Searching…
                  </span>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleAddOrg(result)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors border-b text-left"
                    style={{ borderColor: "#f0ede6" }}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {result.image_url ? (
                        <img src={result.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{result.name}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {result.location}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}
                      >
                        {CATEGORY_LABELS[result.category] ?? result.category}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: "#1a7a4a" }}>
                        + Add
                      </span>
                    </div>
                  </button>
                ))
              ) : searchQuery && !searchLoading ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-gray-400">
                    No organizations found for &quot;{searchQuery}&quot;
                  </p>
                  <Link
                    href="/discover"
                    className="text-sm font-medium mt-2 block hover:underline"
                    style={{ color: "#1a7a4a" }}
                    onClick={() => setAddPanelOpen(false)}
                  >
                    Browse all organizations →
                  </Link>
                </div>
              ) : !searchQuery ? (
                <div className="px-6 py-12 text-center">
                  <Search className="w-8 h-8 mx-auto mb-3" style={{ color: "#e5e1d8" }} />
                  <p className="text-sm text-gray-400">
                    Type to search for organizations to add to your portfolio.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        amountDollars={effectiveAmount}
        allocations={checkoutAllocations}
        donorId={userId ?? undefined}
        donorEmail={userEmail ?? undefined}
        isRecurring={isRecurring}
        frequency={frequency}
        onSuccess={reloadRecurringDonations}
      />
    </>
  );
}
