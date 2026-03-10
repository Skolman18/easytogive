import { createClient } from "@/lib/supabase-server";
import MissionariesClient from "./MissionariesClient";

export const dynamic = "force-dynamic";

export default async function MissionariesPage() {
  const supabase = await createClient();
  const { data: missionaries } = await (supabase as any)
    .from("missionaries")
    .select(
      "id, slug, full_name, photo_url, bio, mission_org, country, region, monthly_goal_cents, monthly_raised_cents, featured"
    )
    .eq("status", "approved")
    .eq("visible", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  return <MissionariesClient missionaries={missionaries || []} />;
}
