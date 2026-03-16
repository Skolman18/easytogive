"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, SlidersHorizontal, ChevronDown, Sparkles } from "lucide-react";
import OrgCard from "@/components/OrgCard";
import type { OrgDisplaySettings } from "@/components/OrgCard";
import { CATEGORIES, SUBCATEGORY_OPTIONS, CATEGORY_LABELS, CAUSE_TO_CATEGORY } from "@/lib/categories";
import type { Organization } from "@/lib/placeholder-data";
import type { TopCategory } from "@/lib/categories";
import { createClient } from "@/lib/supabase-browser";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "raised",   label: "Most Raised" },
  { value: "donors",   label: "Most Donors" },
  { value: "newest",   label: "Newest" },
];

interface Props {
  organizations: Organization[];
  displaySettingsMap?: Record<string, OrgDisplaySettings>;
}

export default function DiscoverClient({ organizations, displaySettingsMap }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState("featured");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [causesBanner, setCausesBanner] = useState(false);

  // Read ?q= from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQuery(q);
  }, []);

  useEffect(() => {
    async function loadUserCauses() {
      const supabase = createClient() as any;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("causes")
        .eq("id", userData.user.id)
        .single();
      if (!profile?.causes?.length) return;
      const matchedCat = (profile.causes as string[])
        .map((c: string) => CAUSE_TO_CATEGORY[c])
        .find(Boolean);
      if (matchedCat) {
        setActiveCategory(matchedCat);
        setCausesBanner(true);
      }
    }
    loadUserCauses();
  }, []);

  function selectCategory(cat: string) {
    setActiveCategory(cat);
    setActiveSubcategory("all");
    setCausesBanner(false);
  }

  const hasActiveFilters =
    activeCategory !== "all" || showVerifiedOnly || locationFilter.trim() || query.trim();

  function clearAll() {
    setQuery("");
    setActiveCategory("all");
    setActiveSubcategory("all");
    setShowVerifiedOnly(false);
    setLocationFilter("");
    setCausesBanner(false);
  }

  // Subcategory chips for the active top-level category
  const subOptions: string[] =
    activeCategory !== "all"
      ? [...(SUBCATEGORY_OPTIONS[activeCategory as TopCategory] ?? [])]
      : [];

  const filtered = useMemo(() => {
    let orgs = [...organizations];

    if (query.trim()) {
      const q = query.toLowerCase();
      orgs = orgs.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.tagline.toLowerCase().includes(q) ||
          o.location.toLowerCase().includes(q) ||
          o.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (locationFilter.trim()) {
      const loc = locationFilter.toLowerCase();
      orgs = orgs.filter((o) => o.location.toLowerCase().includes(loc));
    }

    if (activeCategory !== "all") {
      orgs = orgs.filter((o) => o.category === activeCategory);
    }

    if (activeCategory !== "all" && activeSubcategory !== "all") {
      orgs = orgs.filter((o) => o.subcategory === activeSubcategory);
    }

    if (showVerifiedOnly) {
      orgs = orgs.filter((o) => o.verified);
    }

    orgs.sort((a, b) => {
      if (sortBy === "raised")  return b.raised - a.raised;
      if (sortBy === "donors")  return b.donors - a.donors;
      if (sortBy === "newest")  return (b.founded ?? 0) - (a.founded ?? 0);
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });

    return orgs;
  }, [organizations, query, locationFilter, activeCategory, activeSubcategory, sortBy, showVerifiedOnly]);

  // ── chip helpers ──────────────────────────────────────────────────────────
  const chipStyle = (active: boolean) =>
    active
      ? { backgroundColor: "#1a7a4a", color: "white" }
      : { backgroundColor: "#f5f4f0", color: "#5c5b56", border: "1px solid #e8e5de" };

  const subChipStyle = (active: boolean) =>
    active
      ? { backgroundColor: "#1a7a4a", color: "white" }
      : { backgroundColor: "#f5f4f0", color: "#5c5b56", border: "1px solid #e8e5de" };

  return (
    <div style={{ backgroundColor: "#faf9f6" }} className="min-h-screen">
      {/* Page header — warm, seamless from nav */}
      <div className="border-b" style={{ borderColor: "#e8e5de" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4 md:pt-10 md:pb-5">
          <h1 className="font-display text-[26px] md:text-5xl text-gray-900 mb-1 md:mb-2">
            Discover Causes
          </h1>
          <p className="text-sm md:text-base max-w-xl" style={{ color: "#9b9990" }}>
            Browse {organizations.length}+ verified nonprofits, churches, and local causes.
          </p>

          {/* Search bar */}
          <div className="relative mt-4 max-w-2xl">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "#9b9990" }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search organizations..."
              className="w-full pl-11 pr-10 rounded-full text-gray-900 text-sm outline-none transition-colors"
              style={{
                height: "48px",
                backgroundColor: "white",
                border: "1.5px solid #e8e5de",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 hover:text-gray-600 transition-colors"
                style={{ color: "#9b9990" }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">

        {/* Causes pre-filter banner */}
        {causesBanner && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl mb-5 text-sm"
            style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Showing causes matched to your interests</span>
            </div>
            <button
              onClick={clearAll}
              className="text-xs font-semibold underline whitespace-nowrap hover:no-underline"
            >
              Show all
            </button>
          </div>
        )}

        {/* ── Category chips — always visible, horizontally scrollable ─────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 md:mb-3 -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => selectCategory("all")}
            className="flex-shrink-0 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap"
            style={chipStyle(activeCategory === "all")}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => selectCategory(cat.value)}
              className="flex-shrink-0 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap"
              style={chipStyle(activeCategory === cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Subcategory chips (row 2) ──────────────────────────────────── */}
        {subOptions.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 md:mb-5 -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setActiveSubcategory("all")}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
              style={subChipStyle(activeSubcategory === "all")}
            >
              All {CATEGORY_LABELS[activeCategory] ?? activeCategory}
            </button>
            {subOptions.map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSubcategory(sub)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
                style={subChipStyle(activeSubcategory === sub)}
              >
                {CATEGORY_LABELS[sub] ?? sub}
              </button>
            ))}
          </div>
        )}

        {/* ── Mobile: compact filter row ─────────────────────────────────── */}
        <div className="sm:hidden mb-3 flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 text-xs border rounded-lg px-3 py-2 text-gray-700 outline-none focus:border-green-600 min-h-[44px]"
            style={{ borderColor: "#e5e1d8" }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap min-h-[44px]"
            style={
              showVerifiedOnly
                ? { borderColor: "#1a7a4a", backgroundColor: "#e8f5ee", color: "#1a7a4a" }
                : { borderColor: "#e5e1d8", color: "#6b7280" }
            }
          >
            <div
              className="w-3 h-3 rounded border-2 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: showVerifiedOnly ? "#1a7a4a" : "#9ca3af" }}
            >
              {showVerifiedOnly && <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "#1a7a4a" }} />}
            </div>
            Verified
          </button>
          {hasActiveFilters && (
            <button onClick={clearAll} className="text-xs text-red-500 font-medium px-3 whitespace-nowrap min-h-[44px]">
              Clear
            </button>
          )}
        </div>

        {/* ── Desktop: filters row (result count, location, verified, sort) ─ */}
        <div className="hidden sm:flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm" style={{ color: "#9b9990" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>

            <div className="relative">
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Filter by location…"
                className="pl-3 pr-8 py-1.5 border rounded-lg text-sm outline-none focus:border-green-600 w-44"
                style={{ borderColor: "#e5e1d8" }}
              />
              {locationFilter && (
                <button
                  onClick={() => setLocationFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
              style={
                showVerifiedOnly
                  ? { borderColor: "#1a7a4a", backgroundColor: "#e8f5ee", color: "#1a7a4a" }
                  : { borderColor: "#e5e1d8", backgroundColor: "white", color: "#6b7280" }
              }
            >
              <div
                className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: showVerifiedOnly ? "#1a7a4a" : "#9ca3af" }}
              >
                {showVerifiedOnly && (
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#1a7a4a" }} />
                )}
              </div>
              Verified only
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear all
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "#9b9990" }}>Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 outline-none focus:border-green-600 cursor-pointer"
              style={{ borderColor: "#e5e1d8", backgroundColor: "white" }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile result count */}
        <div className="sm:hidden flex items-center justify-between mb-4">
          <span className="text-sm" style={{ color: "#9b9990" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
          {hasActiveFilters && (
            <button onClick={clearAll} className="text-sm text-red-500 font-medium min-h-[44px] px-1">
              Clear all
            </button>
          )}
        </div>

        {/* Results grid */}
        {filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                displaySettings={displaySettingsMap?.[org.id]}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "#e8f5ee" }}
            >
              <Search className="w-5 h-5" style={{ color: "#1a7a4a" }} />
            </div>
            <h3 className="font-display text-xl text-gray-900 mb-2">
              No organizations match your search.
            </h3>
            <p className="text-sm mb-6" style={{ color: "#9b9990" }}>
              Try a different keyword or browse all causes below.
            </p>
            <button
              onClick={clearAll}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
