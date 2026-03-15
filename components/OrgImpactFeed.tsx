"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { ShieldCheck } from "lucide-react";

interface ImpactUpdate {
  id: string;
  stat_label: string;
  stat_value: string;
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
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

const PERIOD_LABELS: Record<string, string> = {
  "this week": "This Week",
  "this month": "This Month",
  "this quarter": "This Quarter",
  "this year": "This Year",
  "all time": "All Time",
};

export default function OrgImpactFeed({ orgId }: { orgId: string }) {
  const [updates, setUpdates] = useState<ImpactUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUpdates() {
      const supabase = createClient() as any;
      const { data } = await supabase
        .from("org_impact_updates")
        .select("id, stat_label, stat_value, stat_period, message, created_at")
        .eq("org_id", orgId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(10);
      setUpdates(data || []);
      setLoading(false);
    }
    loadUpdates();
  }, [orgId]);

  if (loading || updates.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e5e1d8" }}>
      <h2 className="font-display text-lg font-semibold text-gray-900 mb-5">Impact Updates</h2>

      <div className="space-y-4">
        {updates.map((u) => (
          <div key={u.id} className="rounded-xl border p-4" style={{ borderColor: "#e5e1d8" }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div
                className="font-display text-2xl font-bold leading-tight"
                style={{ color: "#1a7a4a" }}
              >
                {u.stat_value} {u.stat_label}
              </div>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
              >
                {PERIOD_LABELS[u.stat_period] || u.stat_period}
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "#6b7280" }}>
              {u.message}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{formatRelativeDate(u.created_at)}</p>
              {/* Verified badge */}
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
              >
                <ShieldCheck className="w-3 h-3" />
                Verified by EasyToGive
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
