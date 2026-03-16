"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, Building2, Plus } from "lucide-react";
import type { OrgSuggestion } from "@/app/api/ai/org-suggestions/route";

const CATEGORY_LABELS: Record<string, string> = {
  community: "Community",
  nonprofit: "Nonprofit",
  church: "Church & Faith",
  food_hunger: "Food & Hunger",
  education: "Education",
  health_medical: "Health",
  disaster_relief: "Disaster Relief",
  animal_welfare: "Animal Welfare",
  community_development: "Community Dev.",
  international_aid: "International",
  youth_children: "Youth & Children",
};

interface Props {
  userId: string | null;
  currentOrgIds: string[];
  onAddOrg?: (org: { id: string; name: string; category: string; image_url: string | null; location: string }) => void;
}

function AiBadge() {
  return (
    <span
      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a", borderRadius: "4px" }}
    >
      AI
    </span>
  );
}

function SkeletonCard() {
  return (
    <div
      className="flex-shrink-0 w-64 rounded-xl border bg-white p-4 animate-pulse"
      style={{ borderColor: "#e5e1d8" }}
    >
      <div className="w-12 h-12 rounded-xl bg-gray-100 mb-3" />
      <div className="h-4 w-3/4 rounded bg-gray-100 mb-2" />
      <div className="h-3 w-1/3 rounded bg-gray-100 mb-3" />
      <div className="h-3 w-full rounded bg-gray-100 mb-1" />
      <div className="h-3 w-4/5 rounded bg-gray-100 mb-4" />
      <div className="h-8 rounded-lg bg-gray-100" />
    </div>
  );
}

export default function OrgSuggestions({ userId, currentOrgIds, onAddOrg }: Props) {
  const [suggestions, setSuggestions] = useState<OrgSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!userId || currentOrgIds.length < 2 || fetchedRef.current) return;
    fetchedRef.current = true;

    // Check session cache first
    const cacheKey = `etg_org_suggestions_${userId}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { suggestions: s, ts } = JSON.parse(cached);
        if (Date.now() - ts < 24 * 60 * 60 * 1000) {
          setSuggestions(s);
          return;
        }
      }
    } catch { /* ignore */ }

    setLoading(true);
    fetch("/api/ai/org-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, currentPortfolioOrgIds: currentOrgIds }),
    })
      .then((r) => { if (!r.ok) throw new Error("non-ok"); return r.json(); })
      .then(({ suggestions: s }) => {
        if (s?.length) {
          setSuggestions(s);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ suggestions: s, ts: Date.now() }));
          } catch { /* ignore */ }
        } else {
          setSuggestions([]);
        }
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [userId, currentOrgIds]);

  // Don't render if not enough orgs
  if (!userId || currentOrgIds.length < 2) {
    if (currentOrgIds.length > 0) {
      return (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: "#1a7a4a" }} />
            <h2 className="font-display text-lg font-bold text-gray-900">Suggested for you</h2>
            <AiBadge />
          </div>
          <div
            className="rounded-xl border p-5 text-sm text-gray-500"
            style={{ borderColor: "#e5e1d8", backgroundColor: "#faf9f6" }}
          >
            Add a few more organizations to your portfolio and we'll suggest causes you might love.
          </div>
        </div>
      );
    }
    return null;
  }

  // Don't show if no suggestions came back
  if (suggestions !== null && suggestions.length === 0 && !loading) return null;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#1a7a4a" }} />
          <h2 className="font-display text-lg font-bold text-gray-900">Suggested for you</h2>
          <AiBadge />
        </div>
        <span className="text-xs text-gray-400">Based on your giving history</span>
      </div>

      {/* Horizontal scroll row */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 md:grid md:grid-cols-3 md:overflow-visible">
          {loading || suggestions === null
            ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
            : suggestions.map((s) => (
                <div
                  key={s.orgId}
                  className="flex-shrink-0 w-64 md:w-auto rounded-xl border bg-white p-4 flex flex-col"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  {/* Logo */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 mb-3">
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: "#e8f5ee" }}
                      >
                        <Building2 className="w-6 h-6" style={{ color: "#1a7a4a" }} />
                      </div>
                    )}
                  </div>

                  {/* Name + category */}
                  <Link
                    href={`/org/${s.orgId}`}
                    className="font-semibold text-gray-900 text-sm hover:text-green-700 transition-colors leading-tight mb-1"
                  >
                    {s.orgName}
                  </Link>
                  {s.category && (
                    <span
                      className="inline-block self-start px-2 py-0.5 rounded-full text-xs font-medium mb-2"
                      style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
                    >
                      {CATEGORY_LABELS[s.category] ?? s.category}
                    </span>
                  )}

                  {/* AI reason */}
                  <p className="text-xs text-gray-400 italic leading-relaxed flex-1 mb-3">
                    {s.reason}
                  </p>

                  {/* CTA */}
                  {onAddOrg ? (
                    <button
                      onClick={() =>
                        onAddOrg({
                          id: s.orgId,
                          name: s.orgName,
                          category: s.category,
                          image_url: s.imageUrl,
                          location: "",
                        })
                      }
                      className="w-full py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: "#1a7a4a" }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to Portfolio
                    </button>
                  ) : (
                    <Link
                      href={`/org/${s.orgId}`}
                      className="w-full py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity text-center"
                      style={{ backgroundColor: "#1a7a4a" }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to Portfolio
                    </Link>
                  )}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
