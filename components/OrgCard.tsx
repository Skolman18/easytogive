"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, CheckCircle, Users, Plus, Check, Quote, ChevronDown } from "lucide-react";
import { Organization, formatCurrency, getProgressPercent } from "@/lib/placeholder-data";
import { createClient } from "@/lib/supabase-browser";
import { CATEGORY_LABELS } from "@/lib/categories";

export interface OrgDisplaySettings {
  show_raised?: boolean;
  show_donors?: boolean;
  show_goal?: boolean;
}

interface OrgCardProps {
  org: Organization;
  compact?: boolean;
  displaySettings?: OrgDisplaySettings;
}

function AddToPortfolioButton({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/auth/signin?redirectTo=/discover");
        return;
      }
      await (supabase as any)
        .from("portfolio_orgs")
        .upsert(
          { user_id: userData.user.id, org_id: orgId, allocation: 0 },
          { onConflict: "user_id,org_id" }
        );
      setAdded(true);
    } finally {
      setLoading(false);
    }
  }

  if (added) {
    return (
      <div
        className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold"
        style={{ color: "#1a7a4a" }}
      >
        <Check className="w-4 h-4" />
        Added to Portfolio
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-colors disabled:opacity-60 min-h-[44px]"
      style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
    >
      <Plus className="w-4 h-4" />
      {loading ? "Adding…" : "Add to Portfolio"}
    </button>
  );
}

export default function OrgCard({
  org,
  compact = false,
  displaySettings,
}: OrgCardProps) {
  const [storyOpen, setStoryOpen] = useState(false);
  const progress = getProgressPercent(org.raised, org.goal);
  // Prefer subcategory label, fall back to top-level category label
  const badgeLabel =
    (org.subcategory && CATEGORY_LABELS[org.subcategory]) ||
    CATEGORY_LABELS[org.category] ||
    org.category;

  const badgeStyle = { backgroundColor: "#f0ede6", color: "#5c5b56", border: "1px solid #e5e1d8" };

  const storyRaw = (org.ourStory ?? "").trim();
  const storyPreview =
    storyRaw.length > 120 ? `${storyRaw.slice(0, 117).trim()}…` : storyRaw;

  // If no displaySettings passed, show everything (backward compat / placeholder data).
  const showRaised = displaySettings ? (displaySettings.show_raised ?? false) : true;
  const showDonors = displaySettings ? (displaySettings.show_donors ?? false) : true;
  const showGoal = displaySettings ? (displaySettings.show_goal ?? false) : true;
  const showStats = showRaised || showDonors || showGoal;
  const hasGoal = (org.goal ?? 0) > 0;

  return (
    <div
      className="group rounded-xl md:rounded-2xl overflow-hidden border bg-white h-full flex flex-col card-hover"
      style={{ borderColor: "#e5e1d8" }}
    >
      {/* Main card content — wrapped in Link */}
      <Link href={`/org/${org.id}`} className="flex-1 flex flex-col">
        {/* Image */}
        <div
          className="relative h-28 md:h-32 overflow-hidden flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #e8f5ee 0%, #f5f4f0 100%)" }}
        >
          {org.imageUrl ? (
            <img
              src={org.imageUrl}
              alt={org.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-display text-4xl select-none" style={{ color: "#1a7a4a" }}>
                {org.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={badgeStyle}
            >
              {badgeLabel}
            </span>
          </div>
          {org.verified && (
            <div className="absolute top-3 right-3">
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  backgroundColor: "white",
                  color: "#1a7a4a",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                }}
              >
                <CheckCircle className="w-2.5 h-2.5" />
                Verified
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 md:p-4 flex flex-col flex-1">
          <h3 className="font-display font-normal text-[14px] md:text-[15px] leading-tight mb-1 text-gray-900 group-hover:text-green-700 transition-colors">
            {org.name}
          </h3>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
            {org.location}
          </p>
          {!compact && (
            <p className="text-sm text-gray-600 mt-1.5 md:mt-2 leading-relaxed line-clamp-2">
              {org.tagline}
            </p>
          )}

          {/* Our Story (optional) */}
          {storyRaw && (
            <div className="mt-4">
              <div className="border-t" style={{ borderColor: "#e5e1d8" }} />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setStoryOpen((v) => !v);
                }}
                className="w-full text-left cursor-pointer"
                aria-expanded={storyOpen}
                aria-controls={`story-${org.id}`}
              >
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <Quote className="w-4 h-4" style={{ color: "#1a7a4a" }} />
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: "#1a7a4a" }}
                    >
                      Our Story
                    </span>
                  </div>
                  <ChevronDown
                    className="w-4 h-4 text-gray-400 transition-transform"
                    style={{ transform: storyOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </div>
                <p
                  className="text-sm"
                  style={{ color: "#374151", lineHeight: "1.6" }}
                >
                  {storyPreview}
                </p>
              </button>

              <div
                id={`story-${org.id}`}
                className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                style={{ maxHeight: storyOpen ? 420 : 0 }}
              >
                <div className="pt-2 pb-1">
                  <p
                    className="text-sm"
                    style={{ color: "#374151", lineHeight: "1.6" }}
                  >
                    {storyRaw}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats — only when enabled and a real goal exists */}
          {showStats && hasGoal && (
            <div className="mt-auto pt-4">
              {showRaised && (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-500">
                      {formatCurrency(org.raised)} raised
                    </span>
                    <span className="text-xs font-medium" style={{ color: "#1a7a4a" }}>
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "#e5e1d8" }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${progress}%`, backgroundColor: "#1a7a4a" }}
                    />
                  </div>
                </>
              )}
              {(showDonors || showGoal) && (
                <div className={`flex items-center justify-between ${showRaised ? "mt-2" : ""}`}>
                  {showDonors && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {org.donors.toLocaleString()} donors
                    </span>
                  )}
                  {showGoal && (
                    <span className="text-xs text-gray-400 ml-auto">
                      Goal: {formatCurrency(org.goal)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Add to Portfolio — outside the Link to avoid nested anchor */}
      <div className="px-3 md:px-4 pb-3 md:pb-3.5">
        <AddToPortfolioButton orgId={org.id} />
      </div>
    </div>
  );
}
