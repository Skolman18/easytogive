"use client";

import { useState } from "react";
import { CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2, Link as LinkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

interface Props {
  orgId: string;
  onSubmitted?: () => void;
}

const PERIODS = [
  { value: "this week", label: "This Week" },
  { value: "this month", label: "This Month" },
  { value: "this quarter", label: "This Quarter" },
  { value: "this year", label: "This Year" },
  { value: "all time", label: "All Time" },
];

export default function ImpactUpdateForm({ orgId, onSubmitted }: Props) {
  const [open, setOpen] = useState(false);
  const [statValue, setStatValue] = useState("");
  const [statLabel, setStatLabel] = useState("");
  const [statPeriod, setStatPeriod] = useState("this month");
  const [message, setMessage] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!statValue.trim() || !statLabel.trim() || !message.trim() || !proofUrl.trim()) {
      setError("Please fill in all required fields including a proof link.");
      return;
    }

    // Basic URL validation
    try {
      new URL(proofUrl);
    } catch {
      setError("Please enter a valid proof URL (e.g. https://...)");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();

      const { data: insertedRow, error: insertError } = await supabase
        .from("org_impact_updates")
        .insert({
          org_id: orgId,
          posted_by: user?.id,
          stat_label: statLabel.trim(),
          stat_value: statValue.trim(),
          stat_period: statPeriod,
          message: message.trim(),
          proof_url: proofUrl.trim(),
          proof_note: proofNote.trim(),
          status: "pending",
          visible: false,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Fire-and-forget: generate AI summary in the background
      if (insertedRow?.id) {
        fetch("/api/ai/impact-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updateId: insertedRow.id }),
        }).catch(() => { /* silent */ });
      }

      setSuccess(true);
      setStatValue("");
      setStatLabel("");
      setStatPeriod("this month");
      setMessage("");
      setProofUrl("");
      setProofNote("");
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 3000);

      onSubmitted?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between text-left transition-colors hover:bg-gray-50"
      >
        <div>
          <p className="font-semibold text-gray-900 text-sm">Submit an Impact Update</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Share a verifiable achievement with donors
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-6 pb-6 border-t space-y-4" style={{ borderColor: "#f0ede6" }}>
          <div className="pt-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              Updates are reviewed by the EasyToGive team before appearing on your public page.
              You must provide a link to verifiable proof (e.g. an annual report, press coverage,
              government filing, or published data).
            </p>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Stat Value <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={statValue}
                onChange={(e) => setStatValue(e.target.value)}
                placeholder="1,200"
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Stat Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={statLabel}
                onChange={(e) => setStatLabel(e.target.value)}
                placeholder="meals served"
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
              />
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
            <select
              value={statPeriod}
              onChange={(e) => setStatPeriod(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600 bg-white"
              style={{ borderColor: "#e5e1d8" }}
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Message to donors <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Your generosity helped us serve 1,200 meals this month. Thank you for making this possible."
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600 resize-none transition-colors"
              style={{ borderColor: "#e5e1d8" }}
            />
          </div>

          {/* Proof section */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: "#faf9f6", border: "1px solid #e5e1d8" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <LinkIcon className="w-3.5 h-3.5 text-gray-500" />
              <p className="text-xs font-semibold text-gray-700">Proof of Impact (required for verification)</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Link to documentation that supports this claim — an annual report, government filing,
              published article, audited financial statement, or program data.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Proof URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://your-annual-report.org/2025"
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600 transition-colors bg-white"
                style={{ borderColor: "#e5e1d8" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                What does this link show? <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                placeholder="Page 14 of our 2025 annual report — meals served section"
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600 transition-colors bg-white"
                style={{ borderColor: "#e5e1d8" }}
              />
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg text-sm"
              style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg text-sm"
              style={{ backgroundColor: "#e8f5ee", border: "1px solid #86efac", color: "#166534" }}
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Submitted for review! We'll verify your proof and publish it within 2 business days.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? "Submitting…" : "Submit for Review"}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null); }}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
