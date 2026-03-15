import { supabase } from "@/lib/supabase";
import { ORGANIZATIONS, CATEGORIES } from "@/lib/placeholder-data";
import type { Organization, Category } from "@/lib/placeholder-data";
import type { OrganizationRow } from "@/lib/database.types";
import type { OrgDisplaySettings } from "@/components/OrgCard";
import DiscoverClient from "./DiscoverClient";

// Map a Supabase organizations row → the shared Organization shape
function rowToOrg(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    ourStory: row.our_story,
    category: row.category,
    subcategory: (row as any).subcategory ?? null,
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

async function getOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .neq("visible", false)
    .order("sort_order", { ascending: true })
    .order("name");

  if (error || !data || data.length === 0) {
    return ORGANIZATIONS;
  }

  return data.map(rowToOrg);
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

export default async function DiscoverPage() {
  const [organizations, displaySettingsMap] = await Promise.all([
    getOrganizations(),
    getDisplaySettingsMap(),
  ]);

  return <DiscoverClient organizations={organizations} displaySettingsMap={displaySettingsMap} />;
}
