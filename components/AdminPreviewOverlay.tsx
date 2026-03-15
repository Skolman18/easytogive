"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, StickyNote, Copy, Check } from "lucide-react";

const EXIT_URL = "/profile?tab=admin";

// ── Preview banner ─────────────────────────────────────────────────────────────
export function PreviewBanner({ label }: { label?: string }) {
  const router = useRouter();

  return (
    <div
      className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold sticky top-0 z-50"
      style={{ backgroundColor: "#fef08a", color: "#713f12", borderBottom: "2px solid #facc15" }}
    >
      <span>
        ⚠️ Admin Preview Mode{label ? ` — ${label}` : " — No real data will be saved"}
      </span>
      <button
        onClick={() => router.push(EXIT_URL)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
        style={{ backgroundColor: "#dc2626" }}
      >
        <X className="w-3.5 h-3.5" />
        Exit Preview
      </button>
    </div>
  );
}

// ── Admin Notes Panel (floating) ───────────────────────────────────────────────
export function AdminNotesPanel() {
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  function copyNotes() {
    navigator.clipboard.writeText(notes).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-72 rounded-xl shadow-xl border overflow-hidden"
      style={{ borderColor: "#e5e1d8", backgroundColor: "white" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        style={{ backgroundColor: "#fef08a", borderBottom: "1px solid #fde68a" }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#713f12" }}>
          <StickyNote className="w-3.5 h-3.5" />
          Admin Notes
        </div>
        <span className="text-xs text-yellow-700">{collapsed ? "▲ expand" : "▼ collapse"}</span>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type your observations here…"
            rows={5}
            className="w-full px-3 py-2 border rounded-lg text-xs text-gray-700 outline-none resize-none focus:border-yellow-400 transition-colors"
            style={{ borderColor: "#e5e1d8" }}
          />
          <button
            onClick={copyNotes}
            disabled={!notes.trim()}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: copied ? "#e8f5ee" : "#f0ede6",
              color: copied ? "#1a7a4a" : "#374151",
            }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy Notes"}
          </button>
        </div>
      )}
    </div>
  );
}
