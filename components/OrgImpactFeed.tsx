"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { ChevronDown, ChevronUp } from "lucide-react";

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
};

export default function OrgImpactFeed({ orgId }: { orgId: string }) {
  const [updates, setUpdates] = useState<ImpactUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Form state
  const [statValue, setStatValue] = useState("");
  const [statLabel, setStatLabel] = useState("");
  const [statPeriod, setStatPeriod] = useState("this month");
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadUpdates();
    checkAuth();
  }, [orgId]);

  // Auto-populate message
  useEffect(() => {
    if (statValue && statLabel && statPeriod) {
      setMessage(
        `Your generosity helped us ${statValue} ${statLabel} ${statPeriod}. Thank you.`
      );
    }
  }, [statValue, statLabel, statPeriod]);

  async function checkAuth() {
    const supabase = createClient() as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
  }

  async function loadUpdates() {
    const supabase = createClient() as any;
    const { data } = await supabase
      .from("org_impact_updates")
      .select("id, stat_label, stat_value, stat_period, message, created_at")
      .eq("org_id", orgId)
      .eq("visible", true)
      .order("created_at", { ascending: false })
      .limit(10);
    setUpdates(data || []);
    setLoading(false);
  }

  async function handlePost() {
    if (!statValue || !statLabel || !message) return;
    setPosting(true);
    const supabase = createClient() as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("org_impact_updates").insert({
      org_id: orgId,
      posted_by: user?.id,
      stat_label: statLabel,
      stat_value: statValue,
      stat_period: statPeriod,
      message,
      visible: true,
    });
    setPosting(false);
    if (!error) {
      setFormOpen(false);
      setStatValue("");
      setStatLabel("");
      setStatPeriod("this month");
      setMessage("");
      loadUpdates();
    }
  }

  if (loading) return null;

  return (
    <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e5e1d8" }}>
      <h2 className="font-display text-xl font-semibold text-gray-900 mb-5">Impact</h2>

      {updates.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">No impact updates yet.</p>
      ) : (
        <div className="space-y-4 mb-5">
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
              <p className="text-sm leading-relaxed mb-2" style={{ color: "#6b7280" }}>
                {u.message}
              </p>
              <p className="text-xs text-gray-400">{formatRelativeDate(u.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {isLoggedIn && (
        <div>
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: "#1a7a4a" }}
          >
            {formOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Post an Impact Update
          </button>

          {formOpen && (
            <div
              className="mt-4 space-y-3 p-4 rounded-xl"
              style={{ backgroundColor: "#faf9f6" }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Stat Value
                  </label>
                  <input
                    type="text"
                    value={statValue}
                    onChange={(e) => setStatValue(e.target.value)}
                    placeholder="47"
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600"
                    style={{ borderColor: "#e5e1d8" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Stat Label
                  </label>
                  <input
                    type="text"
                    value={statLabel}
                    onChange={(e) => setStatLabel(e.target.value)}
                    placeholder="dogs rescued"
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600"
                    style={{ borderColor: "#e5e1d8" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                <select
                  value={statPeriod}
                  onChange={(e) => setStatPeriod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600 bg-white"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  <option value="this week">This Week</option>
                  <option value="this month">This Month</option>
                  <option value="this quarter">This Quarter</option>
                  <option value="this year">This Year</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Tell donors how their generosity made a difference..."
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600 resize-none"
                  style={{ borderColor: "#e5e1d8" }}
                />
              </div>
              <button
                onClick={handlePost}
                disabled={posting || !statValue || !statLabel || !message}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                {posting ? "Posting..." : "Post Update"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
