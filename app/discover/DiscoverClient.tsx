"use client";

import { useState, useMemo } from "react";
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import OrgCard from "@/components/OrgCard";
import { CATEGORIES } from "@/lib/placeholder-data";
import type { Organization, Category } from "@/lib/placeholder-data";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "raised", label: "Most Raised" },
  { value: "donors", label: "Most Donors" },
  { value: "newest", label: "Newest" },
];

interface Props {
  organizations: Organization[];
}

export default function DiscoverClient({ organizations }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [sortBy, setSortBy] = useState("featured");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasActiveFilters =
    activeCategory !== "all" || showVerifiedOnly || locationFilter.trim() || query.trim();

  function clearAll() {
    setQuery("");
    setActiveCategory("all");
    setShowVerifiedOnly(false);
    setLocationFilter("");
  }

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

    if (showVerifiedOnly) {
      orgs = orgs.filter((o) => o.verified);
    }

    orgs.sort((a, b) => {
      if (sortBy === "raised") return b.raised - a.raised;
      if (sortBy === "donors") return b.donors - a.donors;
      if (sortBy === "newest") return (b.founded ?? 0) - (a.founded ?? 0);
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });

    return orgs;
  }, [organizations, query, locationFilter, activeCategory, sortBy, showVerifiedOnly]);

  return (
    <div style={{ backgroundColor: "#faf9f6" }} className="min-h-screen">
      {/* Page header */}
      <div style={{ backgroundColor: "#0d1117" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-3">
            Discover Causes
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">
            Browse {organizations.length}+ verified nonprofits, churches, and local causes.
            Find what speaks to your values.
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: "#9ca3af" }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, cause, or location…"
              className="w-full pl-12 pr-12 py-4 rounded-xl text-gray-900 text-base outline-none border-2 border-transparent focus:border-green-600 transition-colors shadow-lg"
              style={{ backgroundColor: "white" }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Desktop: category chips ─────────────────────────────── */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap mb-5">
          <button
            onClick={() => setActiveCategory("all")}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={
              activeCategory === "all"
                ? { backgroundColor: "#1a7a4a", color: "white" }
                : { backgroundColor: "#e5e1d8", color: "#374151" }
            }
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5"
              style={
                activeCategory === cat.value
                  ? { backgroundColor: "#1a7a4a", color: "white" }
                  : { backgroundColor: "#e5e1d8", color: "#374151" }
              }
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Mobile: collapsible filter drawer ─────────────────────── */}
        <div className="sm:hidden mb-4">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white border text-sm font-semibold text-gray-700"
            style={{ borderColor: "#e5e1d8" }}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "#1a7a4a" }}
                />
              )}
            </span>
            <ChevronDown
              className="w-4 h-4 text-gray-400 transition-transform"
              style={{ transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {filtersOpen && (
            <div
              className="mt-2 rounded-xl bg-white border p-4 space-y-4"
              style={{ borderColor: "#e5e1d8" }}
            >
              {/* Category */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveCategory("all")}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={
                      activeCategory === "all"
                        ? { backgroundColor: "#1a7a4a", color: "white" }
                        : { backgroundColor: "#f3f4f6", color: "#374151" }
                    }
                  >
                    All
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setActiveCategory(cat.value)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={
                        activeCategory === cat.value
                          ? { backgroundColor: "#1a7a4a", color: "white" }
                          : { backgroundColor: "#f3f4f6", color: "#374151" }
                      }
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Location</p>
                <input
                  type="text"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="Filter by city or state…"
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600"
                  style={{ borderColor: "#e5e1d8" }}
                />
              </div>

              {/* Sort + Verified */}
              <div className="flex gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 text-sm border rounded-lg px-3 py-2 text-gray-700 outline-none focus:border-green-600"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all"
                  style={
                    showVerifiedOnly
                      ? { borderColor: "#1a7a4a", backgroundColor: "#e8f5ee", color: "#1a7a4a" }
                      : { borderColor: "#e5e1d8", color: "#6b7280" }
                  }
                >
                  <div
                    className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: showVerifiedOnly ? "#1a7a4a" : "#9ca3af" }}
                  >
                    {showVerifiedOnly && <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "#1a7a4a" }} />}
                  </div>
                  Verified
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Desktop: filters row ───────────────────────────────────── */}
        <div className="hidden sm:flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-500">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>

            {/* Location filter */}
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

            {/* Verified */}
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

            {/* Clear all */}
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
            <span className="text-sm text-gray-500">Sort by</span>
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
          <span className="text-sm text-gray-500">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
          {hasActiveFilters && (
            <button onClick={clearAll} className="text-sm text-red-500 font-medium">
              Clear all
            </button>
          )}
        </div>

        {/* Results grid */}
        {filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((org) => (
              <OrgCard key={org.id} org={org} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
              No results found
            </h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search or clearing the filters.
            </p>
            <button
              onClick={clearAll}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
