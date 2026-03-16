"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  Mail,
  AlertCircle,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter,
} from "lucide-react";

interface EmailLog {
  id: string;
  received_at: string;
  from_email: string;
  subject: string;
  body_preview: string;
  category: string;
  priority: string;
  summary: string;
  requires_response: boolean;
  draft_reply: string | null;
  action_items: string[];
  responded_at: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  donor_inquiry: "Donor",
  org_application: "Org Application",
  support: "Support",
  partnership: "Partnership",
  press: "Press",
  spam: "Spam",
  other: "Other",
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: "#fef2f2", text: "#dc2626", label: "Urgent" },
  high: { bg: "#fff7ed", text: "#ea580c", label: "High" },
  normal: { bg: "#f0fdf4", text: "#16a34a", label: "Normal" },
  low: { bg: "#f9fafb", text: "#6b7280", label: "Low" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminEmailPage() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = (supabase as any)
      .from("email_log")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(100);

    if (filterCategory !== "all") query = query.eq("category", filterCategory);
    if (filterPriority !== "all") query = query.eq("priority", filterPriority);

    const { data } = await query;
    setEmails(data ?? []);
    setLoading(false);
  }, [filterCategory, filterPriority]);

  useEffect(() => { load(); }, [load]);

  async function markResponded(id: string) {
    setMarkingId(id);
    await (createClient() as any)
      .from("email_log")
      .update({ responded_at: new Date().toISOString() })
      .eq("id", id);
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, responded_at: new Date().toISOString() } : e))
    );
    setMarkingId(null);
  }

  const categories = ["all", ...Object.keys(CATEGORY_LABELS)];
  const priorities = ["all", "urgent", "high", "normal", "low"];
  const unrespondedUrgent = emails.filter(
    (e) => e.priority === "urgent" && e.requires_response && !e.responded_at
  ).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-5 h-5" style={{ color: "#1a7a4a" }} />
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Email Inbox</h1>
              {unrespondedUrgent > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: "#dc2626" }}
                >
                  {unrespondedUrgent} urgent
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">AI-triaged emails for seth@easytogive.online</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-white border transition-colors disabled:opacity-50"
            style={{ borderColor: "#e5e1d8" }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 bg-white outline-none"
              style={{ borderColor: "#e5e1d8" }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All categories" : CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 bg-white outline-none"
              style={{ borderColor: "#e5e1d8" }}
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All priorities" : p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {emails.length > 0 && (
            <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">
              {emails.length} email{emails.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* Email list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-20">
            <Mail className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm">No emails found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {emails.map((email) => {
              const isExpanded = expanded === email.id;
              const pStyle = PRIORITY_STYLES[email.priority] ?? PRIORITY_STYLES.normal;
              const isResponded = !!email.responded_at;

              return (
                <div
                  key={email.id}
                  className="bg-white rounded-xl border overflow-hidden"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  {/* Row */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : email.id)}
                    className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                  >
                    {/* Priority dot */}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: pStyle.text }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {email.from_email}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0"
                          style={{ backgroundColor: pStyle.bg, color: pStyle.text }}
                        >
                          {pStyle.label}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded-md font-medium bg-gray-100 text-gray-600 flex-shrink-0">
                          {CATEGORY_LABELS[email.category] ?? email.category}
                        </span>
                        {isResponded && (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{email.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{email.summary}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{timeAgo(email.received_at)}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t space-y-4" style={{ borderColor: "#f0ede6" }}>
                      {/* Body preview */}
                      {email.body_preview && (
                        <div className="pt-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Preview
                          </p>
                          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
                            {email.body_preview}
                          </p>
                        </div>
                      )}

                      {/* Action items */}
                      {email.action_items?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Action items
                          </p>
                          <ul className="space-y-1">
                            {email.action_items.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <span style={{ color: "#1a7a4a" }} className="flex-shrink-0 mt-0.5">
                                  →
                                </span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Draft reply */}
                      {email.draft_reply && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Draft reply
                          </p>
                          <div
                            className="text-sm text-gray-700 leading-relaxed rounded-lg p-3 border"
                            style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}
                          >
                            <pre className="whitespace-pre-wrap font-sans">{email.draft_reply}</pre>
                          </div>
                        </div>
                      )}

                      {/* Footer actions */}
                      <div className="flex items-center gap-3 pt-1">
                        {email.requires_response && !isResponded && (
                          <button
                            onClick={() => markResponded(email.id)}
                            disabled={markingId === email.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: "#1a7a4a" }}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {markingId === email.id ? "Marking…" : "Mark responded"}
                          </button>
                        )}
                        {isResponded && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            Responded {timeAgo(email.responded_at!)}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                          <Clock className="w-3 h-3" />
                          {new Date(email.received_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Requires response callout at top if any urgent unresponded */}
        {unrespondedUrgent > 0 && (
          <div
            className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium"
            style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#dc2626" }}
          >
            <AlertCircle className="w-4 h-4" />
            {unrespondedUrgent} urgent email{unrespondedUrgent > 1 ? "s" : ""} need a response
          </div>
        )}
      </div>
    </div>
  );
}
