import type { Metadata } from "next";
import OrgCard, { type OrgDisplaySettings } from "@/components/OrgCard";
import { supabase } from "@/lib/supabase";
import type { OrganizationRow } from "@/lib/database.types";
import type { Organization, Category } from "@/lib/placeholder-data";

export const metadata: Metadata = {
  title: "Political Giving | EasyToGive",
  description:
    "Give to political campaigns, PACs, parties, and advocacy organizations through EasyToGive.",
};

function rowToOrg(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    ourStory: row.our_story,
    category: row.category as Category,
    location: row.location,
    raised: row.raised,
    goal: row.goal,
    donors: row.donors,
    verified: row.verified,
    featured: row.featured,
    imageUrl: row.image_url,
    coverUrl: row.cover_url,
    ein: row.ein,
    founded: row.founded ?? 0,
    website: row.website,
    impactStats: Array.isArray(row.impact_stats)
      ? (row.impact_stats as { label: string; value: string }[])
      : [],
    tags: row.tags ?? [],
  };
}

async function getPoliticalOrganizations(): Promise<Organization[]> {
  try {
    const { data, error } = await (supabase as any)
      .from("organizations")
      .select("*")
      // Tag-based filter so we don't rely on a new enum value in category.
      .contains("tags", ["political"]);

    if (error || !data) return [];

    return (data as OrganizationRow[])
      .filter((row: any) => row.visible !== false)
      .map(rowToOrg);
  } catch {
    return [];
  }
}

async function getDisplaySettingsMap(): Promise<Record<string, OrgDisplaySettings>> {
  try {
    const { data } = await (supabase as any)
      .from("org_display_settings")
      .select("org_id, show_raised, show_donors, show_goal");
    if (!data) return {};
    const map: Record<string, OrgDisplaySettings> = {};
    for (const row of data) map[row.org_id] = row;
    return map;
  } catch {
    return {};
  }
}

export default async function PoliticsPage() {
  const [organizations, displaySettingsMap] = await Promise.all([
    getPoliticalOrganizations(),
    getDisplaySettingsMap(),
  ]);

  const hasOrgs = organizations.length > 0;

  return (
    <main style={{ backgroundColor: "#faf9f6" }} className="min-h-screen">
      {/* Top disclaimer banner */}
      <section className="pt-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-lg px-5 py-4 mb-6"
            style={{
              backgroundColor: "#fef2f2",
              borderLeft: "4px solid #dc2626",
            }}
          >
            <h2 className="font-display text-sm sm:text-base font-semibold text-gray-900 mb-1">
              Political Donations Are Not Tax Deductible
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              Contributions to political campaigns, PACs, political parties, and political advocacy organizations are not tax
              deductible under IRS rules, regardless of the organization&apos;s tax status. EasyToGive does not provide tax
              receipts for political donations. Please consult a tax advisor if you have questions.
            </p>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="pb-10">
        <div
          className="border-y"
          style={{ backgroundColor: "#1f2937", borderColor: "#111827" }}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-xs font-semibold tracking-wide uppercase mb-3 text-gray-300">
              Explore
            </p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
              Political Giving
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-200 max-w-xl">
              Support the candidates, parties, and causes that reflect your values.
            </p>
          </div>
        </div>
      </section>

      {/* Filters + grid */}
      <section className="pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category chips (visual only for now) */}
          <div className="flex flex-wrap gap-2 mb-8">
            {["All", "Candidates", "PACs", "Political Parties", "Advocacy Orgs"].map(
              (label, idx) => (
                <button
                  key={label}
                  type="button"
                  className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border bg-white"
                  style={{
                    borderColor: idx === 0 ? "#1a7a4a" : "#e5e1d8",
                    color: idx === 0 ? "#1a7a4a" : "#374151",
                    backgroundColor: idx === 0 ? "#e8f5ee" : "white",
                  }}
                  disabled
                >
                  {label}
                </button>
              )
            )}
          </div>

          {hasOrgs ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <OrgCard
                  key={org.id}
                  org={org}
                  displaySettings={displaySettingsMap[org.id]}
                  politicalNotDeductible
                />
              ))}
            </div>
          ) : (
            <div
              className="bg-white rounded-xl border shadow-sm px-6 py-10 text-center"
              style={{ borderColor: "#e5e1d8" }}
            >
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-2">
                Political organizations coming soon
              </h2>
              <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                Political organizations are not yet available on EasyToGive. Contact us to list your campaign or organization.
              </p>
              <a
                href="mailto:seth@easytogive.online"
                className="text-sm font-semibold underline underline-offset-2"
                style={{ color: "#1a7a4a" }}
              >
                seth@easytogive.online
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Bottom disclaimer */}
      <section className="pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-lg px-5 py-4"
            style={{
              backgroundColor: "#fef2f2",
              borderLeft: "4px solid #dc2626",
            }}
          >
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              Reminder: Political donations made through EasyToGive are not tax deductible.
              EasyToGive is a neutral platform and does not endorse any candidate, party, or
              political organization listed here.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

