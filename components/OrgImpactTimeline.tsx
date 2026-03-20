"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { ShieldCheck, Share2, Check } from "lucide-react";

interface ImpactUpdate {
  id: string;
  stat_label: string;
  stat_value: string;
  stat_period: string;
  message: string;
  created_at: string;
}

const PERIOD_LABELS: Record<string, string> = {
  "this week": "This week",
  "this month": "This month",
  "this quarter": "This quarter",
  "this year": "This year",
  "all time": "All time",
};

function formatRelativeDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export default function OrgImpactTimeline({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const [updates, setUpdates] = useState<ImpactUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function loadUpdates() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { data } = await supabase
        .from("org_impact_updates")
        .select("id, stat_label, stat_value, stat_period, message, created_at")
        .eq("org_id", orgId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(5);
      setUpdates(data || []);
      setLoading(false);
    }
    loadUpdates();
  }, [orgId]);

  if (loading || updates.length === 0) return null;

  async function handleShare(update: ImpactUpdate) {
    const text = `${orgName} — ${PERIOD_LABELS[update.stat_period] ?? update.stat_period}: ${update.stat_value} ${update.stat_label}. ${update.message}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(update.id);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: "#e5e1d8" }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">
        Impact Updates
      </p>
      <div className="space-y-2">
        {updates.map((u) => (
          <div
            key={u.id}
            className="rounded-lg p-3"
            style={{ backgroundColor: "#f9f8f5" }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs text-gray-400">
                {PERIOD_LABELS[u.stat_period] ?? u.stat_period} &middot; {formatRelativeDate(u.created_at)}
              </p>
              <button
                onClick={() => handleShare(u)}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors flex-shrink-0 -mt-0.5"
                aria-label="Share update"
              >
                {copied === u.id ? (
                  <Check className="w-3.5 h-3.5" style={{ color: "#1a7a4a" }} />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-sm font-semibold" style={{ color: "#1a7a4a" }}>
              {u.stat_value} {u.stat_label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{u.message}</p>
            <span
              className="inline-flex items-center gap-1 mt-1.5 text-xs"
              style={{ color: "#1a7a4a" }}
            >
              <ShieldCheck className="w-3 h-3" />
              Verified
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
