import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Globe,
  Calendar,
  Users,
  ArrowLeft,
  Share2,
  Bookmark,
  ExternalLink,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";
import {
  ORGANIZATIONS,
  formatCurrency,
  getProgressPercent,
} from "@/lib/placeholder-data";
import OrgDonateSidebar from "@/components/OrgDonateSidebar";

const CATEGORY_LABELS: Record<string, string> = {
  churches: "Church",
  "animal-rescue": "Animal Rescue",
  nonprofits: "Nonprofit",
  education: "Education",
  environment: "Environment",
  local: "Local Cause",
};

const CATEGORY_COLORS: Record<string, string> = {
  churches: "#7c3aed",
  "animal-rescue": "#f59e0b",
  nonprofits: "#3b82f6",
  education: "#6366f1",
  environment: "#10b981",
  local: "#f97316",
};

export async function generateStaticParams() {
  return ORGANIZATIONS.map((org) => ({ id: org.id }));
}

export default async function OrgPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = ORGANIZATIONS.find((o) => o.id === id);
  if (!org) notFound();

  const categoryColor = CATEGORY_COLORS[org.category] || "#1a7a4a";
  const categoryLabel = CATEGORY_LABELS[org.category] || org.category;

  const related = ORGANIZATIONS.filter(
    (o) => o.category === org.category && o.id !== org.id
  ).slice(0, 3);

  return (
    <div style={{ backgroundColor: "#faf9f6" }}>
      {/* Cover image */}
      <div className="relative h-72 md:h-96 overflow-hidden bg-gray-900">
        <img
          src={org.coverUrl}
          alt={org.name}
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute top-4 left-4">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:bg-white/20"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Discover
          </Link>
        </div>

        <div className="absolute top-4 right-4 flex gap-2">
          <button
            className="p-2.5 rounded-lg text-white transition-colors hover:bg-white/20"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            aria-label="Save to watchlist"
          >
            <Bookmark className="w-4 h-4" />
          </button>
          <button
            className="p-2.5 rounded-lg text-white transition-colors hover:bg-white/20"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 md:left-8">
          <span
            className="px-3 py-1 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: categoryColor }}
          >
            {categoryLabel}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8 py-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-start gap-3 mb-2 flex-wrap">
                <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900">
                  {org.name}
                </h1>
                {org.verified && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white mt-1 flex-shrink-0"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xl text-gray-600 mb-4 italic font-display">
                {org.tagline}
              </p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {org.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Founded {org.founded}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {org.donors.toLocaleString()} donors
                </span>
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-green-700 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Visit website
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Description */}
            <div
              className="rounded-2xl border bg-white p-6"
              style={{ borderColor: "#e5e1d8" }}
            >
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                About this organization
              </h2>
              <p className="text-gray-700 leading-relaxed">{org.description}</p>
            </div>

            {/* Impact Stats */}
            <div
              className="rounded-2xl border bg-white p-6"
              style={{ borderColor: "#e5e1d8" }}
            >
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-5">
                Impact by the numbers
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {org.impactStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="text-center p-4 rounded-xl"
                    style={{ backgroundColor: "#e8f5ee" }}
                  >
                    <div
                      className="font-display text-2xl font-bold mb-1"
                      style={{ color: "#1a7a4a" }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification */}
            <div
              className="rounded-2xl border p-6"
              style={{ borderColor: "#86efac", backgroundColor: "#f0fdf4" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    EasyToGive Verified Organization
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    We have confirmed this organization&apos;s IRS 501(c)(3) status,
                    financial transparency, and governance standards. Donations are
                    tax-deductible to the extent permitted by law.
                  </p>
                  {org.ein !== "Pending" && (
                    <p className="text-sm text-gray-500 mt-2">
                      <span className="font-medium">EIN:</span> {org.ein}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {org.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-sm text-gray-600"
                  style={{ backgroundColor: "#e5e1d8" }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Sidebar — client component handles all donation interactivity */}
          <div>
            <OrgDonateSidebar org={org} />
          </div>
        </div>

        {/* Related organizations */}
        {related.length > 0 && (
          <div className="pb-16">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
              More in {categoryLabel}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((r) => {
                const rProgress = getProgressPercent(r.raised, r.goal);
                return (
                  <Link
                    key={r.id}
                    href={`/org/${r.id}`}
                    className="block group rounded-2xl border bg-white overflow-hidden card-hover"
                    style={{ borderColor: "#e5e1d8" }}
                  >
                    <div className="h-36 overflow-hidden bg-gray-100">
                      <img
                        src={r.imageUrl}
                        alt={r.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-display font-semibold text-gray-900 group-hover:text-green-700 transition-colors mb-1">
                        {r.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">{r.location}</p>
                      <div
                        className="w-full rounded-full h-1.5"
                        style={{ backgroundColor: "#e5e1d8" }}
                      >
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${rProgress}%`, backgroundColor: "#1a7a4a" }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        {formatCurrency(r.raised)} raised · {rProgress}%
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
