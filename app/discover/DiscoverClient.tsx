"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import OrgCard from "@/components/OrgCard";
import { CATEGORIES } from "@/lib/placeholder-data";
import type { Organization, Category } from "@/lib/placeholder-data";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "raised", label: "Most Raised" },
  { value: "donors", label: "Most Donors" },
  { value: "goal", label: "Largest Goal" },
];

interface Props {
  organizations: Organization[];
}

export default function DiscoverClient({ organizations }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [sortBy, setSortBy] = useState("featured");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

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

    if (activeCategory !== "all") {
      orgs = orgs.filter((o) => o.category === activeCategory);
    }

    if (showVerifiedOnly) {
      orgs = orgs.filter((o) => o.verified);
    }

    orgs.sort((a, b) => {
      if (sortBy === "raised") return b.raised - a.raised;
      if (sortBy === "donors") return b.donors - a.donors;
      if (sortBy === "goal") return b.goal - a.goal;
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });

    return orgs;
  }, [organizations, query, activeCategory, sortBy, showVerifiedOnly]);

  return (
    <div style={{ backgroundColor: "#faf9f6" }} className="min-h-screen">
      {/* Page header */}
      <div style={{ backgroundColor: "#0d1117" }} className="pb-0">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-0">
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

        <div className="h-6" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category chips */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === "all" ? "text-white" : "text-gray-600 hover:text-gray-900"
            }`}
            style={
              activeCategory === "all"
                ? { backgroundColor: "#1a7a4a" }
                : { backgroundColor: "#e5e1d8" }
            }
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeCategory === cat.value
                  ? "text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              style={
                activeCategory === cat.value
                  ? { backgroundColor: "#1a7a4a" }
                  : { backgroundColor: "#e5e1d8" }
              }
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                showVerifiedOnly
                  ? "border-green-600 text-green-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
              style={
                showVerifiedOnly ? { backgroundColor: "#e8f5ee" } : { backgroundColor: "white" }
              }
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  showVerifiedOnly ? "border-green-600" : "border-gray-400"
                }`}
              >
                {showVerifiedOnly && (
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#1a7a4a" }} />
                )}
              </div>
              Verified only
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:block">Sort by</span>
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
              onClick={() => {
                setQuery("");
                setActiveCategory("all");
                setShowVerifiedOnly(false);
              }}
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
