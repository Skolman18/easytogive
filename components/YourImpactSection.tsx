"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

interface ImpactCard {
  id: string;
  org_id: string;
  org_name: string;
  org_image_url: string | null;
  stat_value: string;
  stat_label: string;
  stat_period: string;
  message: string;
  created_at: string;
}

function formatRelativeDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export default function YourImpactSection({ userId }: { userId: string }) {
  const [cards, setCards] = useState<ImpactCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient() as any;

      // Get user's portfolio org IDs
      const { data: portfolioOrgs } = await supabase
        .from("portfolio_orgs")
        .select("org_id")
        .eq("user_id", userId);

      if (!portfolioOrgs || portfolioOrgs.length === 0) {
        setLoaded(true);
        return;
      }

      const orgIds = portfolioOrgs.map((p: any) => p.org_id);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Get recent impact updates
      const { data: updates } = await supabase
        .from("org_impact_updates")
        .select("id, org_id, stat_label, stat_value, stat_period, message, created_at")
        .in("org_id", orgIds)
        .eq("visible", true)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!updates || updates.length === 0) {
        setLoaded(true);
        return;
      }

      // Fetch org details separately
      const uniqueOrgIds = [...new Set(updates.map((u: any) => u.org_id))];
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, image_url")
        .in("id", uniqueOrgIds);

      const orgMap: Record<string, { name: string; image_url: string | null }> = {};
      for (const o of orgs || []) {
        orgMap[o.id] = { name: o.name, image_url: o.image_url };
      }

      const enriched: ImpactCard[] = updates.map((u: any) => ({
        id: u.id,
        org_id: u.org_id,
        org_name: orgMap[u.org_id]?.name || "Unknown Org",
        org_image_url: orgMap[u.org_id]?.image_url || null,
        stat_value: u.stat_value,
        stat_label: u.stat_label,
        stat_period: u.stat_period,
        message: u.message,
        created_at: u.created_at,
      }));

      setCards(enriched);
      setLoaded(true);
    }
    load();
  }, [userId]);

  if (!loaded || cards.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Your Impact</h2>
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-white rounded-2xl border shadow-sm overflow-hidden"
          style={{ borderColor: "#e5e1d8", borderLeft: "3px solid #1a7a4a" }}
        >
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              {card.org_image_url ? (
                <img
                  src={card.org_image_url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "#e8f5ee" }}
                />
              )}
              <span className="text-xs text-gray-500">{card.org_name}</span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed mb-2">
              Your contribution helped {card.org_name} {card.stat_value} {card.stat_label}{" "}
              {card.stat_period}.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {formatRelativeDate(card.created_at)}
              </span>
              <Link
                href={`/org/${card.org_id}`}
                className="text-xs font-medium hover:underline"
                style={{ color: "#1a7a4a" }}
              >
                View Org →
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
