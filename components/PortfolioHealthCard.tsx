"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, Lightbulb, Sparkles } from "lucide-react";
import type { PortfolioAnalysis } from "@/app/api/ai/portfolio-analysis/route";

interface Props {
  userId: string | null;
}

function AiBadge() {
  return (
    <span
      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a", borderRadius: "4px" }}
    >
      AI
    </span>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl md:rounded-2xl border bg-white p-4 md:p-5 animate-pulse"
      style={{ borderColor: "#e5e1d8" }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
        <div>
          <div className="h-4 w-48 rounded bg-gray-100 mb-1.5" />
          <div className="h-3 w-32 rounded bg-gray-100" />
        </div>
      </div>
      <div className="h-3 w-full rounded bg-gray-100 mb-1.5" />
      <div className="h-3 w-5/6 rounded bg-gray-100 mb-4" />
      <div className="flex gap-2">
        <div className="h-7 w-32 rounded-full bg-gray-100" />
        <div className="h-7 w-28 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}

export default function PortfolioHealthCard({ userId }: Props) {
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!userId || fetchedRef.current) return;
    fetchedRef.current = true;

    setLoading(true);
    fetch("/api/ai/portfolio-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
      .then((r) => r.json())
      .then(({ analysis: a }) => {
        if (a) setAnalysis(a);
      })
      .catch(() => { /* fail silently */ })
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;
  if (!loading && !analysis) return null;
  if (loading) return <SkeletonCard />;

  const isHealthy = !analysis!.needsRebalancing;

  return (
    <div
      className="rounded-xl md:rounded-2xl border bg-white p-4 md:p-5"
      style={{
        borderColor: isHealthy ? "#bbf7d0" : "#fde68a",
        backgroundColor: isHealthy ? "#f0fdf4" : "#fffbeb",
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isHealthy ? "#dcfce7" : "#fef3c7" }}
        >
          {isHealthy ? (
            <CheckCircle className="w-5 h-5" style={{ color: "#16a34a" }} />
          ) : (
            <Lightbulb className="w-5 h-5" style={{ color: "#d97706" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              {analysis!.headline}
            </p>
            <AiBadge />
          </div>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" style={{ color: "#1a7a4a" }} />
            Portfolio health analysis
          </p>
        </div>
      </div>

      {/* Suggestion text */}
      {analysis!.suggestion && (
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{analysis!.suggestion}</p>
      )}

      {/* Action chips */}
      {analysis!.actions?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {analysis!.actions.map((action, i) => (
            <span
              key={i}
              className="text-xs font-medium px-3 py-1.5 rounded-full border cursor-default"
              style={{
                borderColor: isHealthy ? "#86efac" : "#fcd34d",
                color: isHealthy ? "#166534" : "#92400e",
                backgroundColor: isHealthy ? "#dcfce7" : "#fef3c7",
              }}
            >
              {action}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
