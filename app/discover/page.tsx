import { supabase } from "@/lib/supabase";
import { ORGANIZATIONS, CATEGORIES } from "@/lib/placeholder-data";
import type { Organization, Category } from "@/lib/placeholder-data";
import type { OrganizationRow } from "@/lib/database.types";
import DiscoverClient from "./DiscoverClient";

// Map a Supabase organizations row → the shared Organization shape
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
  };
}

async function getOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("visible", true)
    .order("sort_order", { ascending: true })
    .order("name");

  if (error || !data || data.length === 0) {
    // Graceful fallback: return placeholder data so the UI never breaks
    return ORGANIZATIONS;
  }

  return data.map(rowToOrg);
}

export default async function DiscoverPage() {
  const organizations = await getOrganizations();

  return <DiscoverClient organizations={organizations} />;
}
