import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import MissionaryDonationCard from "@/components/MissionaryDonationCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("missionaries")
    .select("full_name, bio, photo_url")
    .eq("slug", slug)
    .single();
  if (!data) return { title: "Missionary — EasyToGive" };
  return {
    title: `${data.full_name} — Support on EasyToGive`,
    description: data.bio?.slice(0, 160) || "",
    openGraph: {
      title: data.full_name,
      description: data.bio?.slice(0, 160) || "",
      images: data.photo_url ? [{ url: data.photo_url }] : [],
    },
  };
}

function formatRelativeDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export default async function MissionaryProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: missionary } = await (supabase as any)
    .from("missionaries")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .eq("visible", true)
    .single();

  if (!missionary) notFound();

  const { data: updates } = await (supabase as any)
    .from("missionary_updates")
    .select("id, title, body, photo_url, created_at")
    .eq("missionary_id", missionary.id)
    .eq("visible", true)
    .order("created_at", { ascending: false });

  const defaultType = sp.type === "monthly" ? "monthly" : "one_time";

  return (
    <div style={{ backgroundColor: "#faf9f6" }} className="min-h-screen">
      {/* Cover photo */}
      <div className="relative h-80 overflow-hidden bg-gray-800">
        {missionary.photo_url ? (
          <img
            src={missionary.photo_url}
            alt={missionary.full_name}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: "#374151" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute top-4 left-4">
          <Link
            href="/missionaries"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            All Missionaries
          </Link>
        </div>

        <div className="absolute bottom-5 left-5 md:left-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight mb-1.5">
            {missionary.full_name}
          </h1>
          {missionary.mission_org && (
            <span
              className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              {missionary.mission_org}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-[1fr_400px] gap-10">
          {/* Left column */}
          <div className="space-y-8 order-2 lg:order-none">
            {/* Name + location */}
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h2 className="font-display text-3xl font-bold text-gray-900">
                  {missionary.full_name}
                </h2>
                {missionary.mission_org && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
                  >
                    {missionary.mission_org}
                  </span>
                )}
              </div>
              {(missionary.country || missionary.region) && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {[missionary.country, missionary.region].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Bio */}
            {missionary.bio && (
              <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e1d8" }}>
                <h3 className="font-display text-xl font-semibold text-gray-900 mb-3">About</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {missionary.bio}
                </p>
              </div>
            )}

            {/* About mission org */}
            {missionary.mission_org && (
              <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#e5e1d8" }}>
                <h3 className="font-semibold text-gray-900 mb-1">
                  About {missionary.mission_org}
                </h3>
                <p className="text-sm text-gray-500">
                  Learn more about{" "}
                  <span className="font-medium text-gray-700">{missionary.mission_org}</span>
                </p>
              </div>
            )}

            {/* Updates feed */}
            <div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-4">
                Updates from {missionary.full_name.split(" ")[0]}
              </h3>
              {!updates || updates.length === 0 ? (
                <p className="text-gray-400 text-sm">No updates yet. Check back soon.</p>
              ) : (
                <div className="space-y-5">
                  {updates.map((u: any) => (
                    <div
                      key={u.id}
                      className="bg-white rounded-xl border p-5"
                      style={{ borderColor: "#e5e1d8" }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h4 className="font-semibold text-gray-900 text-base">{u.title}</h4>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatRelativeDate(u.created_at)}
                        </span>
                      </div>
                      {u.photo_url && (
                        <div className="mb-3 rounded-lg overflow-hidden h-48">
                          <img
                            src={u.photo_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">
                        {u.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Donation card (sticky) */}
          <div className="order-1 lg:order-none lg:sticky lg:top-20 h-fit">
            <MissionaryDonationCard
              missionary={{
                id: missionary.id,
                slug: missionary.slug,
                full_name: missionary.full_name,
                photo_url: missionary.photo_url || "",
                mission_org: missionary.mission_org || "",
                monthly_goal_cents: missionary.monthly_goal_cents || 0,
                monthly_raised_cents: missionary.monthly_raised_cents || 0,
              }}
              defaultType={defaultType as "one_time" | "monthly"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
