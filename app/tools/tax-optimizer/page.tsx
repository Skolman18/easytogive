"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import {
  Sparkles, Calculator, Loader2, AlertCircle, ChevronDown,
  ChevronUp, Heart, ArrowRight, RotateCcw, ShieldCheck,
} from "lucide-react";
import type { TaxOptimizerRequest } from "@/app/api/ai/tax-optimizer/route";

// ── Markdown renderer ──────────────────────────────────────────────────────────
// Converts Claude's markdown output into styled HTML fragments.
function MarkdownLine({ line }: { line: string }) {
  if (line.startsWith("## ")) {
    return (
      <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">
        {line.slice(3)}
      </h2>
    );
  }
  if (line.startsWith("### ")) {
    return (
      <h3 className="text-base font-bold text-gray-900 mt-4 mb-1.5">
        {line.slice(4)}
      </h3>
    );
  }
  if (line.startsWith("# ")) {
    return (
      <h1 className="text-xl font-bold text-gray-900 mt-6 mb-2">
        {line.slice(2)}
      </h1>
    );
  }
  if (line.startsWith("- ") || line.startsWith("* ")) {
    return (
      <li className="ml-5 list-disc text-gray-700 leading-relaxed mb-0.5">
        <InlineMarkdown text={line.slice(2)} />
      </li>
    );
  }
  // Numbered list
  const numMatch = line.match(/^(\d+)\.\s+(.+)/);
  if (numMatch) {
    return (
      <li className="ml-5 list-decimal text-gray-700 leading-relaxed mb-0.5">
        <InlineMarkdown text={numMatch[2]} />
      </li>
    );
  }
  if (line.startsWith("⚠️")) {
    return (
      <div
        className="mt-5 rounded-xl p-4 flex items-start gap-3"
        style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}
      >
        <span className="text-lg flex-shrink-0">⚠️</span>
        <p className="text-sm text-yellow-800 leading-relaxed">
          <InlineMarkdown text={line.slice(2).trim()} />
        </p>
      </div>
    );
  }
  if (line === "" || line === "---") return <div className="h-2" />;
  return (
    <p className="text-gray-700 leading-relaxed mb-1">
      <InlineMarkdown text={line} />
    </p>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function MarkdownResponse({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => (
        <MarkdownLine key={i} line={line} />
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function currency(val: string) {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const TAX_YEAR = new Date().getFullYear();

const FILING_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "mfj", label: "Married Filing Jointly" },
  { value: "mfs", label: "Married Filing Separately" },
  { value: "hoh", label: "Head of Household" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TaxOptimizerPage() {
  // Form state
  const [mode, setMode] = useState<"calculate" | "target">("calculate");
  const [filingStatus, setFilingStatus] = useState<TaxOptimizerRequest["filingStatus"]>("single");
  const [grossIncome, setGrossIncome] = useState("");
  const [otherDeductions, setOtherDeductions] = useState("");
  const [manualDonations, setManualDonations] = useState("");
  const [targetSavings, setTargetSavings] = useState("");

  // Donation data from profile
  const [profileDonations, setProfileDonations] = useState<
    { orgName: string; amount: number; date: string }[]
  >([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [useProfileData, setUseProfileData] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // AI response
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  // Load donation data if logged in
  useEffect(() => {
    async function load() {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setIsLoggedIn(true);
      setLoadingDonations(true);

      const currentYear = new Date().getFullYear();
      const { data } = await supabase
        .from("donations")
        .select("amount, donated_at, organizations(name)")
        .eq("user_id", user.id)
        .gte("donated_at", `${currentYear}-01-01`)
        .order("donated_at", { ascending: false });

      if (data && data.length > 0) {
        const records = (data as any[]).map((d) => ({
          orgName: d.organizations?.name ?? "Unknown org",
          amount: (d.amount ?? 0) / 100, // cents → dollars
          date: new Date(d.donated_at).toLocaleDateString("en-US", {
            month: "short", day: "numeric",
          }),
        }));
        setProfileDonations(records);
        setUseProfileData(true);
      }
      setLoadingDonations(false);
    }
    load();
  }, []);

  // Scroll response into view as it streams
  useEffect(() => {
    if (streaming && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [response, streaming]);

  const totalFromProfile = profileDonations.reduce((s, d) => s + d.amount, 0);
  const effectiveDonations = useProfileData && profileDonations.length > 0
    ? totalFromProfile
    : currency(manualDonations);
  const effectiveBreakdown = useProfileData && profileDonations.length > 0
    ? profileDonations
    : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!grossIncome) return;

    setResponse("");
    setStreamError(null);
    setStreaming(true);

    const body: TaxOptimizerRequest = {
      mode,
      filingStatus,
      grossIncome: currency(grossIncome),
      otherItemizedDeductions: currency(otherDeductions),
      totalDonationsDollars: effectiveDonations,
      donationBreakdown: effectiveBreakdown,
      targetSavings: mode === "target" ? currency(targetSavings) : undefined,
      taxYear: TAX_YEAR,
    };

    try {
      const res = await fetch("/api/ai/tax-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to start analysis");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              setStreamError(parsed.error);
              break;
            }
            if (parsed.text) {
              setResponse((prev) => prev + parsed.text);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setStreaming(false);
    }
  }

  function reset() {
    setResponse("");
    setStreamError(null);
  }

  const hasResponse = response.length > 0 || streaming || streamError;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: "#e5e1d8" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/profile" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Profile
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900 leading-tight">
                AI Tax Optimizer
              </h1>
              <p className="text-sm text-gray-500">
                See how your charitable giving reduces your taxes — or find your giving target.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Form ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Mode toggle */}
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
              <div className="p-1 flex gap-1" style={{ backgroundColor: "#f0ede6" }}>
                <button
                  type="button"
                  onClick={() => { setMode("calculate"); reset(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={mode === "calculate"
                    ? { backgroundColor: "white", color: "#1a7a4a", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                    : { color: "#6b7280" }
                  }
                >
                  <Calculator className="w-3.5 h-3.5 inline mr-1.5" />
                  My Savings
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("target"); reset(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={mode === "target"
                    ? { backgroundColor: "white", color: "#1a7a4a", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                    : { color: "#6b7280" }
                  }
                >
                  <ArrowRight className="w-3.5 h-3.5 inline mr-1.5" />
                  Hit a Target
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Filing status */}
              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#e5e1d8" }}>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Filing Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FILING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilingStatus(opt.value as typeof filingStatus)}
                      className="py-2.5 px-3 rounded-lg border text-sm font-medium text-left transition-all"
                      style={filingStatus === opt.value
                        ? { borderColor: "#1a7a4a", backgroundColor: "#e8f5ee", color: "#1a7a4a", borderWidth: 2 }
                        : { borderColor: "#e5e1d8", color: "#374151" }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Income & deductions */}
              <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: "#e5e1d8" }}>
                <label className="block text-sm font-semibold text-gray-800">
                  Your {TAX_YEAR} Finances
                </label>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Gross Income (AGI estimate)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={grossIncome}
                      onChange={(e) => setGrossIncome(e.target.value)}
                      required
                      placeholder="75,000"
                      className="w-full pl-7 pr-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                      style={{ borderColor: "#e5e1d8" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Other Itemized Deductions
                    <span className="font-normal ml-1 text-gray-400">(mortgage, state taxes, etc.)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otherDeductions}
                      onChange={(e) => setOtherDeductions(e.target.value)}
                      placeholder="0"
                      className="w-full pl-7 pr-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                      style={{ borderColor: "#e5e1d8" }}
                    />
                  </div>
                </div>
              </div>

              {/* Donations */}
              <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: "#e5e1d8" }}>
                <label className="block text-sm font-semibold text-gray-800">
                  Charitable Donations in {TAX_YEAR}
                </label>

                {loadingDonations && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading your donation history…
                  </div>
                )}

                {isLoggedIn && profileDonations.length > 0 && !loadingDonations && (
                  <div>
                    {/* Use profile toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center border-2 transition-all flex-shrink-0"
                        onClick={() => setUseProfileData(!useProfileData)}
                        style={{
                          borderColor: useProfileData ? "#1a7a4a" : "#d1d5db",
                          backgroundColor: useProfileData ? "#1a7a4a" : "white",
                        }}
                      >
                        {useProfileData && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Use my EasyToGive donations
                        </p>
                        <p className="text-xs text-gray-400">
                          {fmt(totalFromProfile)} total · {profileDonations.length} donation{profileDonations.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </label>

                    {useProfileData && (
                      <button
                        type="button"
                        onClick={() => setShowBreakdown(!showBreakdown)}
                        className="mt-2 flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: "#1a7a4a" }}
                      >
                        {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {showBreakdown ? "Hide" : "Show"} breakdown
                      </button>
                    )}

                    {showBreakdown && useProfileData && (
                      <div
                        className="mt-3 rounded-xl border divide-y text-xs"
                        style={{ borderColor: "#e5e1d8" }}
                      >
                        {profileDonations.map((d, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Heart className="w-3 h-3 flex-shrink-0 text-green-600" />
                              <span className="text-gray-700 truncate">{d.orgName}</span>
                              <span className="text-gray-400 flex-shrink-0">{d.date}</span>
                            </div>
                            <span className="font-semibold text-gray-900 flex-shrink-0 ml-2">
                              {fmt(d.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(!useProfileData || profileDonations.length === 0) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Total donations this year
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={manualDonations}
                        onChange={(e) => setManualDonations(e.target.value)}
                        placeholder="0"
                        className="w-full pl-7 pr-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                        style={{ borderColor: "#e5e1d8" }}
                      />
                    </div>
                    {!isLoggedIn && (
                      <p className="mt-1.5 text-xs text-gray-400">
                        <Link href="/auth/signin" style={{ color: "#1a7a4a" }}>Sign in</Link> to auto-fill from your donation history.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Target savings (target mode only) */}
              {mode === "target" && (
                <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#e5e1d8" }}>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    Tax Savings Goal
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    How much do you want to reduce your taxes?
                  </p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={targetSavings}
                      onChange={(e) => setTargetSavings(e.target.value)}
                      required={mode === "target"}
                      placeholder="1,000"
                      className="w-full pl-7 pr-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                      style={{ borderColor: "#e5e1d8" }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={streaming || !grossIncome}
                className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                {streaming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {mode === "calculate" ? "Calculate My Savings" : "Find My Giving Target"}
                  </>
                )}
              </button>
            </form>

            {/* Disclaimer */}
            <div
              className="rounded-xl p-4 flex items-start gap-2.5"
              style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}
            >
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                This tool provides educational estimates based on general US federal tax rules.
                It is <strong>not professional tax advice</strong>. Consult a CPA for your specific situation.
              </p>
            </div>
          </div>

          {/* ── Response ── */}
          <div className="lg:col-span-3" ref={responseRef}>
            {!hasResponse && (
              <div
                className="h-full min-h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center"
                style={{ borderColor: "#e5e1d8" }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: "#e8f5ee" }}
                >
                  <Sparkles className="w-7 h-7" style={{ color: "#1a7a4a" }} />
                </div>
                <p className="font-semibold text-gray-700 mb-1">
                  Your personalized tax analysis
                </p>
                <p className="text-sm text-gray-400 max-w-xs">
                  Fill in the form and click{" "}
                  <span className="font-medium text-gray-600">
                    {mode === "calculate" ? "Calculate My Savings" : "Find My Giving Target"}
                  </span>{" "}
                  to get a detailed breakdown.
                </p>

                {/* Example metrics */}
                <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xs">
                  {[
                    { label: "Itemize or standard?", icon: "⚖️" },
                    { label: "Tax savings estimate", icon: "💰" },
                    { label: "AGI deduction limit", icon: "📊" },
                    { label: "Optimization tips", icon: "✨" },
                  ].map(({ label, icon }) => (
                    <div
                      key={label}
                      className="rounded-xl p-3 text-left"
                      style={{ backgroundColor: "#faf9f6", border: "1px solid #e5e1d8" }}
                    >
                      <div className="text-lg mb-1">{icon}</div>
                      <p className="text-xs text-gray-500 leading-snug">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasResponse && (
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
                {/* Response header */}
                <div
                  className="px-6 py-4 border-b flex items-center justify-between"
                  style={{ borderColor: "#e5e1d8", backgroundColor: "#faf9f6" }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: "#1a7a4a" }} />
                    <span className="text-sm font-semibold text-gray-900">
                      {mode === "calculate" ? "Your Tax Savings Analysis" : "Your Giving Target"}
                    </span>
                    {streaming && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                      >
                        Generating…
                      </span>
                    )}
                  </div>
                  <button
                    onClick={reset}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>

                <div className="px-6 py-5">
                  {streamError && (
                    <div
                      className="flex items-start gap-2.5 p-3 rounded-lg border text-sm mb-4"
                      style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#dc2626" }}
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {streamError}
                    </div>
                  )}

                  {response && <MarkdownResponse text={response} />}

                  {streaming && !response && (
                    <div className="flex items-center gap-3 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                      <span className="text-sm">Thinking…</span>
                    </div>
                  )}

                  {/* Blinking cursor while streaming */}
                  {streaming && response && (
                    <span
                      className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
                      style={{ backgroundColor: "#1a7a4a", verticalAlign: "text-bottom" }}
                    />
                  )}
                </div>

                {!streaming && response && (
                  <div
                    className="px-6 py-4 border-t flex items-center justify-between"
                    style={{ borderColor: "#e5e1d8", backgroundColor: "#faf9f6" }}
                  >
                    <p className="text-xs text-gray-400">
                      Powered by Claude AI · For education only, not tax advice
                    </p>
                    <Link
                      href="/discover"
                      className="flex items-center gap-1.5 text-sm font-semibold"
                      style={{ color: "#1a7a4a" }}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      Find orgs to give to
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
