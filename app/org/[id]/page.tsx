import type { Metadata } from "next";
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
  Sparkles,
  Quote,
} from "lucide-react";
import {
  ORGANIZATIONS,
  formatCurrency,
  getProgressPercent,
} from "@/lib/placeholder-data";
import OrgDonateSidebar from "@/components/OrgDonateSidebar";
import OrgAdminBar from "@/components/OrgAdminBar";
import EditableField from "@/components/EditableField";
import OrgImpactFeed from "@/components/OrgImpactFeed";
import OrgVideoEmbed from "@/components/OrgVideoEmbed";
import { createClient } from "@/lib/supabase-server";
import { CATEGORY_LABELS } from "@/lib/categories";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("name, tagline, image_url")
    .eq("id", id)
    .single();

  const org = data ?? ORGANIZATIONS.find((o) => o.id === id);
  const name = (org as any)?.name ?? "Organization";
  const tagline = (org as any)?.tagline ?? "";
  const image = (org as any)?.image_url ?? (org as any)?.imageUrl ?? "";
  const url = `https://easytogive.online/org/${id}`;

  return {
    title: `${name} — Donate on EasyToGive`,
    description: tagline,
    openGraph: {
      title: `${name} — Donate on EasyToGive`,
      description: tagline,
      images: image ? [{ url: image }] : [],
      url,
      type: "website",
    },
  };
}

export default async function OrgPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Try Supabase first, fall back to placeholder data
  const supabaseMain = await createClient();
  const { data: supabaseOrg }: { data: any } = await supabaseMain
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  // Normalize Supabase org fields to match placeholder shape
  const org = supabaseOrg
    ? {
        id: supabaseOrg.id,
        name: supabaseOrg.name,
        tagline: supabaseOrg.tagline ?? "",
        description: supabaseOrg.description ?? "",
        ourStory: (supabaseOrg.our_story ?? "") as string,
        category: supabaseOrg.category ?? "community",
        subcategory: supabaseOrg.subcategory ?? null,
        location: supabaseOrg.location ?? "",
        founded: supabaseOrg.founded ?? "",
        website: supabaseOrg.website ?? "",
        imageUrl: supabaseOrg.image_url ?? supabaseOrg.imageUrl ?? "",
        coverUrl: supabaseOrg.cover_url ?? supabaseOrg.coverUrl ?? supabaseOrg.image_url ?? "",
        verified: supabaseOrg.verified ?? false,
        ein: supabaseOrg.ein ?? "Pending",
        donors: supabaseOrg.donors ?? 0,
        raised: supabaseOrg.raised ?? 0,
        goal: supabaseOrg.goal ?? 0,
        tags: supabaseOrg.tags ?? [],
        impactStats: supabaseOrg.impact_stats ?? supabaseOrg.impactStats ?? [],
        featured: supabaseOrg.featured ?? false,
        videoUrl: supabaseOrg.video_url ?? "",
        videoType: supabaseOrg.video_type ?? "",
        showVideo: supabaseOrg.show_video ?? false,
        videoSizePercent: supabaseOrg.video_size_percent ?? 100,
      }
    : ORGANIZATIONS.find((o) => o.id === id);

  if (!org) notFound();

  const subcategory = (org as any).subcategory;
  const categoryLabel =
    (subcategory && CATEGORY_LABELS[subcategory]) ||
    CATEGORY_LABELS[org.category] ||
    org.category;

  // Normalized shape for recommended + related org cards
  interface CardOrg {
    id: string;
    name: string;
    location: string;
    category: string;
    imageUrl: string;
    raised: number;
    goal: number;
  }

  function normalizeCardOrg(o: any): CardOrg {
    return {
      id: o.id,
      name: o.name ?? "",
      location: o.location ?? "",
      category: o.category ?? "",
      imageUrl: o.image_url ?? o.imageUrl ?? "",
      raised: o.raised ?? 0,
      goal: o.goal ?? 0,
    };
  }

  let recommendedOrgs: CardOrg[] = [];
  let related: CardOrg[] = [];
  let displaySettings = {
    show_goal: false,
    show_donors: false,
    show_raised: false,
    show_recommendations: false,
    show_impact_stats: false,
    show_related_orgs: false,
  };
  let secondaryDisplayMap: Record<string, { show_raised: boolean; show_donors: boolean; show_goal: boolean }> = {};

  try {
    const supabase = await createClient();
    const [orgData, settingsData, relatedData] = await Promise.all([
      supabase.from("organizations").select("recommended_orgs").eq("id", id).single(),
      (supabase as any).from("org_display_settings").select("*").eq("org_id", id).single(),
      // Fetch related orgs by same category from Supabase
      (supabase as any)
        .from("organizations")
        .select("id, name, location, category, image_url, raised, goal")
        .eq("category", org.category)
        .neq("id", id)
        .eq("visible", true)
        .limit(3),
    ]);

    if (settingsData.data) {
      displaySettings = { ...displaySettings, ...settingsData.data };
    }

    if (relatedData.data) {
      related = relatedData.data.map(normalizeCardOrg);
    } else {
      // Fall back to placeholder data if Supabase returns nothing
      related = ORGANIZATIONS
        .filter((o) => o.category === org.category && o.id !== org.id)
        .slice(0, 3)
        .map((o) => ({ id: o.id, name: o.name, location: o.location, category: o.category, imageUrl: o.imageUrl, raised: o.raised, goal: o.goal }));
    }

    // Fetch recommended orgs from Supabase by their IDs
    const recIds: string[] = (orgData.data as any)?.recommended_orgs ?? [];
    if (recIds.length > 0) {
      const { data: recData } = await (supabase as any)
        .from("organizations")
        .select("id, name, location, category, image_url, raised, goal")
        .in("id", recIds);
      if (recData) {
        // Preserve the order from recommended_orgs array
        const recMap = new Map(recData.map((o: any) => [o.id, o]));
        recommendedOrgs = recIds
          .filter((rid) => recMap.has(rid))
          .map((rid) => normalizeCardOrg(recMap.get(rid)));
      }
    }

    // Fetch display settings for secondary org cards
    const secondaryIds = [
      ...related.map((r) => r.id),
      ...recommendedOrgs.map((r) => r.id),
    ];
    if (secondaryIds.length > 0) {
      const { data: secData } = await (supabase as any)
        .from("org_display_settings")
        .select("org_id, show_raised, show_donors, show_goal")
        .in("org_id", secondaryIds);
      if (secData) {
        for (const row of secData) secondaryDisplayMap[row.org_id] = row;
      }
    }
  } catch {
    // Silently fall back
  }

  return (
    <div style={{ backgroundColor: "#faf9f6" }}>
      {/* Admin edit bar — only visible to sethmitzel@gmail.com */}
      <OrgAdminBar orgId={id} orgName={org.name} />

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
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: "rgba(255,255,255,0.92)", color: "#374151", border: "1px solid rgba(255,255,255,0.5)" }}
          >
            {categoryLabel}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8 py-10">
          {/* Main content — order-1 so sidebar goes below on mobile */}
          <div className="lg:col-span-2 space-y-8 order-1 lg:order-none">
            <div>
              <div className="flex items-start gap-3 mb-2 flex-wrap">
                <EditableField
                  orgId={supabaseOrg ? id : undefined}
                  field="name"
                  value={org.name}
                  as="h1"
                  className="font-display text-3xl md:text-4xl font-bold text-gray-900"
                />
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
              <EditableField
                orgId={supabaseOrg ? id : undefined}
                field="tagline"
                value={org.tagline}
                as="p"
                className="text-xl text-gray-600 mb-4 italic font-display"
              />

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {org.location?.trim() && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <EditableField
                      orgId={supabaseOrg ? id : undefined}
                      field="location"
                      value={org.location}
                      as="span"
                    />
                  </span>
                )}
                {org.founded && String(org.founded) !== "0" && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Founded{" "}
                    <EditableField
                      orgId={supabaseOrg ? id : undefined}
                      field="founded"
                      value={String(org.founded)}
                      as="span"
                    />
                  </span>
                )}
                {displaySettings.show_donors && org.donors > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {org.donors.toLocaleString()} donors
                  </span>
                )}
                {org.website?.trim() && (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-green-700 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    <EditableField
                      orgId={supabaseOrg ? id : undefined}
                      field="website"
                      value={org.website}
                      as="span"
                    />
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
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
              <EditableField
                orgId={supabaseOrg ? id : undefined}
                field="description"
                value={org.description}
                as="p"
                className="text-gray-700 leading-relaxed"
                multiline
              />
            </div>

            {/* Our Story */}
            {(org as any).ourStory?.trim() && (
              <div
                className="rounded-xl p-6 border"
                style={{ backgroundColor: "#e8f5ee", borderColor: "#bbf7d0" }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    <Quote className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-semibold text-gray-900 mb-2">
                      Our Story
                    </h2>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {(org as any).ourStory}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Video */}
            {(org as any).showVideo && (org as any).videoUrl && (
              <OrgVideoEmbed
                orgId={id}
                videoUrl={(org as any).videoUrl}
                videoType={(org as any).videoType}
                coverUrl={(org as any).coverUrl || ""}
                initialSize={(org as any).videoSizePercent ?? 100}
              />
            )}

            {/* Dynamic Impact Updates */}
            <OrgImpactFeed orgId={id} />

            {/* Impact Stats */}
            {displaySettings.show_impact_stats && org.impactStats && org.impactStats.length > 0 && (
            <div
              className="rounded-2xl border bg-white p-6"
              style={{ borderColor: "#e5e1d8" }}
            >
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-5">
                Impact by the numbers
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {org.impactStats.map((stat: any) => (
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
            )}

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
                  {org.ein && org.ein !== "Pending" && (
                    <p className="text-sm text-gray-500 mt-2">
                      <span className="font-medium">EIN:</span> {org.ein}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            {org.tags && org.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {org.tags.map((tag: any) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-sm text-gray-600"
                  style={{ backgroundColor: "#e5e1d8" }}
                >
                  #{tag}
                </span>
              ))}
            </div>
            )}
          </div>

          {/* Sidebar — appears below content on mobile, right column on desktop */}
          <div className="order-2 lg:order-none">
            <OrgDonateSidebar org={org} displaySettings={displaySettings} />
          </div>
        </div>

        {/* ── We Recommend ──────────────────────────────────────────── */}
        {displaySettings.show_recommendations && recommendedOrgs.length > 0 && (
          <div className="pb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5" style={{ color: "#1a7a4a" }} />
              <h2 className="font-display text-2xl font-bold text-gray-900">
                We Recommend
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedOrgs.map((r) => {
                const rProgress = getProgressPercent(r.raised, r.goal);
                const rLabel = CATEGORY_LABELS[r.category] || r.category;
                return (
                  <Link
                    key={r.id}
                    href={`/org/${r.id}`}
                    className="block group rounded-2xl border bg-white overflow-hidden card-hover"
                    style={{ borderColor: "#e5e1d8" }}
                  >
                    <div className="relative h-36 overflow-hidden bg-gray-100">
                      <img
                        src={r.imageUrl}
                        alt={r.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span
                        className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}
                      >
                        {rLabel}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-display font-semibold text-gray-900 group-hover:text-green-700 transition-colors mb-1 leading-tight">
                        {r.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">{r.location}</p>
                      {(() => {
                        const ds = secondaryDisplayMap[r.id];
                        const showRaised = ds ? (ds.show_raised ?? false) : true;
                        if (!showRaised) return null;
                        return (
                          <>
                            <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "#e5e1d8" }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${rProgress}%`, backgroundColor: "#1a7a4a" }} />
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5">
                              {formatCurrency(r.raised)} raised · {rProgress}%
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Related organizations */}
        {displaySettings.show_related_orgs && related.length > 0 && (
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
                      {(() => {
                        const ds = secondaryDisplayMap[r.id];
                        const showRaised = ds ? (ds.show_raised ?? false) : true;
                        if (!showRaised) return null;
                        return (
                          <>
                            <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "#e5e1d8" }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${rProgress}%`, backgroundColor: "#1a7a4a" }} />
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5">
                              {formatCurrency(r.raised)} raised · {rProgress}%
                            </p>
                          </>
                        );
                      })()}
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
