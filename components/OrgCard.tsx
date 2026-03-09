import Link from "next/link";
import { MapPin, CheckCircle, Users } from "lucide-react";
import { Organization, formatCurrency, getProgressPercent } from "@/lib/placeholder-data";

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

const CATEGORY_COLORS: Record<string, string> = {
  churches: "#7c3aed",
  "animal-rescue": "#f59e0b",
  nonprofits: "#3b82f6",
  education: "#6366f1",
  environment: "#10b981",
  local: "#f97316",
};

const CATEGORY_LABELS: Record<string, string> = {
  churches: "Church",
  "animal-rescue": "Animal Rescue",
  nonprofits: "Nonprofit",
  education: "Education",
  environment: "Environment",
  local: "Local Cause",
};

export default function OrgCard({ org, compact = false, displaySettings }: OrgCardProps) {
  const progress = getProgressPercent(org.raised, org.goal);
  const categoryColor = CATEGORY_COLORS[org.category] || "#1a7a4a";
  const categoryLabel = CATEGORY_LABELS[org.category] || org.category;

  // If no displaySettings passed, show everything (backward compat / placeholder data).
  // If settings are provided, respect each flag.
  const showRaised = displaySettings ? (displaySettings.show_raised ?? false) : true;
  const showDonors = displaySettings ? (displaySettings.show_donors ?? false) : true;
  const showGoal = displaySettings ? (displaySettings.show_goal ?? false) : true;
  const showStats = showRaised || showDonors || showGoal;

  return (
    <Link href={`/org/${org.id}`} className="block group">
      <div
        className="card-hover rounded-2xl overflow-hidden border bg-white h-full flex flex-col"
        style={{ borderColor: "#e5e1d8" }}
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-gray-100 flex-shrink-0">
          <img
            src={org.imageUrl}
            alt={org.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: categoryColor }}
            >
              {categoryLabel}
            </span>
          </div>
          {org.verified && (
            <div className="absolute top-3 right-3">
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-display font-semibold text-lg leading-tight mb-1 text-gray-900 group-hover:text-green-700 transition-colors">
            {org.name}
          </h3>
          <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            {org.location}
          </p>
          {!compact && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-2">
              {org.tagline}
            </p>
          )}

          {/* Stats — only render if at least one stat is enabled */}
          {showStats && (
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
      </div>
    </Link>
  );
}
