import { supabase } from "@/lib/supabase";
import { ORGANIZATIONS } from "@/lib/placeholder-data";
import type { Organization, Category } from "@/lib/placeholder-data";
import type { OrganizationRow } from "@/lib/database.types";
import type { OrgDisplaySettings } from "@/components/OrgCard";
import HomeClient from "./HomeClient";

function rowToOrg(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
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
    sort_order: row.sort_order,
  };
}

async function getOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("home_sort_order", { ascending: true })
    .order("name");

  if (error || !data || data.length === 0) {
    return ORGANIZATIONS;
  }

  // Filter hidden orgs if the visible column exists (degrades gracefully without it)
  return data
    .filter((row: any) => row.visible !== false)
    .map(rowToOrg);
}

const DEFAULT_HERO = {
  headline: "The Marketplace for Giving.",
  subtext:
    "Discover thousands of verified organizations, build your giving portfolio, and donate to multiple causes with one simple transaction.",
};

async function getRealStats(): Promise<{ orgCount: number; totalRaised: number; userCount: number }> {
  try {
    const [orgsRes, raisedRes, usersRes] = await Promise.all([
      supabase.from("organizations").select("id", { count: "exact", head: true } as any),
      supabase.from("organizations").select("raised"),
      (supabase as any).from("users").select("id", { count: "exact", head: true }),
    ]);
    const orgCount = (orgsRes as any).count ?? 0;
    const totalRaised = ((raisedRes.data ?? []) as any[]).reduce(
      (s, r) => s + (r.raised ?? 0), 0
    );
    const userCount = (usersRes as any).count ?? 0;
    return { orgCount, totalRaised, userCount };
  } catch {
    return { orgCount: 0, totalRaised: 0, userCount: 0 };
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

async function getSiteSettings(): Promise<{ hero_headline: string; hero_subtext: string }> {
  try {
    const { data } = await (supabase as any)
      .from("site_settings")
      .select("key, value")
      .in("key", ["hero_headline", "hero_subtext"]);
    if (!data) return { hero_headline: DEFAULT_HERO.headline, hero_subtext: DEFAULT_HERO.subtext };
    const map: Record<string, string> = {};
    for (const row of data) map[row.key] = row.value;
    return {
      hero_headline: map.hero_headline ?? DEFAULT_HERO.headline,
      hero_subtext: map.hero_subtext ?? DEFAULT_HERO.subtext,
    };
  } catch {
    return { hero_headline: DEFAULT_HERO.headline, hero_subtext: DEFAULT_HERO.subtext };
  }
}

export default async function HomePage() {
  const [organizations, siteSettings, displaySettingsMap, stats] = await Promise.all([
    getOrganizations(),
    getSiteSettings(),
    getDisplaySettingsMap(),
    getRealStats(),
  ]);
  return (
    <HomeClient
      organizations={organizations}
      siteSettings={siteSettings}
      displaySettingsMap={displaySettingsMap}
      stats={stats}
    />
  );
}
