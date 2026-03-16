"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

interface ImpactItem {
  id: string;
  org_id: string;
  org_name: string;
  org_image: string | null;
  ai_stat_highlight: string;
  ai_summary: string;
  stat_value: string | null;
  stat_label: string | null;
  created_at: string;
}

interface Props {
  userId: string | null;
  donatedOrgIds: string[];
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl border bg-white p-4 md:p-5 animate-pulse"
      style={{ borderColor: "#e5e1d8" }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
        <div className="h-3.5 w-36 rounded bg-gray-100" />
      </div>
      <div className="h-7 w-48 rounded bg-gray-100 mb-2" />
      <div className="h-3.5 w-full rounded bg-gray-100 mb-1" />
      <div className="h-3.5 w-4/5 rounded bg-gray-100" />
    </div>
  );
}

function relDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isNew(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function FeedHeader() {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-0.5">
        <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "#1a7a4a" }} />
        <h2 className="font-display text-xl md:text-2xl text-gray-900">
          Where your money went
        </h2>
      </div>
      <p className="text-sm ml-6" style={{ color: "#9b9990" }}>
        Real updates from the organizations you support
      </p>
    </div>
  );
}

export default function ImpactFeed({ userId, donatedOrgIds }: Props) {
  const [items, setItems] = useState<ImpactItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!userId || donatedOrgIds.length === 0 || fetchedRef.current) return;
    fetchedRef.current = true;

    setLoading(true);
    const supabase = createClient() as any;
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    supabase
      .from("org_impact_updates")
      .select("id, org_id, ai_summary, ai_stat_highlight, stat_value, stat_label, created_at")
      .in("org_id", donatedOrgIds)
      .eq("status", "approved")
      .not("ai_summary", "is", null)
      .gte("created_at", sixMonthsAgo)
      .order("created_at", { ascending: false })
      .limit(12)
      .then(async ({ data: updates }: any) => {
        if (!updates?.length) { setItems([]); setLoading(false); return; }

        const orgIds = [...new Set(updates.map((u: any) => u.org_id))];
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name, image_url")
          .in("id", orgIds);

        const orgMap: Record<string, any> = {};
        for (const o of orgs ?? []) orgMap[o.id] = o;

        setItems(
          updates.map((u: any) => ({
            id: u.id,
            org_id: u.org_id,
            org_name: orgMap[u.org_id]?.name ?? "Organization",
            org_image: orgMap[u.org_id]?.image_url ?? null,
            ai_stat_highlight: u.ai_stat_highlight ?? "",
            ai_summary: u.ai_summary ?? "",
            stat_value: u.stat_value ?? null,
            stat_label: u.stat_label ?? null,
            created_at: u.created_at,
          }))
        );
        setLoading(false);
      })
      .catch(() => { setItems([]); setLoading(false); });
  }, [userId, donatedOrgIds]);

  if (!userId || donatedOrgIds.length === 0) return null;

  if (loading || items === null) {
    return (
      <div>
        <FeedHeader />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <FeedHeader />
        <div
          className="rounded-xl md:rounded-2xl border bg-white p-6 text-center"
          style={{ borderColor: "#e5e1d8" }}
        >
          <Sparkles
            className="w-8 h-8 mx-auto mb-3"
            style={{ color: "#1a7a4a", opacity: 0.35 }}
          />
          <p className="text-sm leading-relaxed" style={{ color: "#9b9990" }}>
            The organizations you support will share their impact here.<br />
            The more you give, the more you will see.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FeedHeader />
      <div className="space-y-3">
        {items.map((item) => {
          const statDisplay =
            item.ai_stat_highlight ||
            (item.stat_value && item.stat_label
              ? `${item.stat_value} ${item.stat_label}`
              : null);

          return (
            <div
              key={item.id}
              className="rounded-xl border bg-white p-4 md:p-5"
              style={{ borderColor: "#e5e1d8" }}
            >
              {/* Org row */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.org_image ? (
                    <Image src={item.org_image} alt="" fill sizes="32px" className="object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: "#e8f5ee" }}
                    >
                      <Building2 className="w-4 h-4" style={{ color: "#1a7a4a" }} />
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-800 flex-1 min-w-0 truncate">
                  {item.org_name}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isNew(item.created_at) && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                    >
                      New
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{relDate(item.created_at)}</span>
                </div>
              </div>

              {/* Stat */}
              {statDisplay && (
                <p
                  className="font-display text-xl md:text-2xl mb-1.5 leading-tight"
                  style={{ color: "#1a7a4a" }}
                >
                  {statDisplay}
                </p>
              )}

              {/* AI summary */}
              {item.ai_summary && (
                <p className="text-sm text-gray-600 leading-relaxed mb-2.5">
                  {item.ai_summary}
                </p>
              )}

              <Link
                href={`/org/${item.org_id}`}
                className="text-xs font-medium hover:underline"
                style={{ color: "#1a7a4a" }}
              >
                See full update →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
