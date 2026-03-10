"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Repeat, CheckCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function relDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type FilterTab = "all" | "missionaries" | "one_time" | "recurring";

export default function WalletPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "#faf9f6" }}
        >
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a7a4a" }} />
        </div>
      }
    >
      <WalletPageInner />
    </Suspense>
  );
}

function WalletPageInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [missionaryDonations, setMissionaryDonations] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  useEffect(() => {
    const supabase = createClient() as any;
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (!user) {
        router.push("/auth/signin?redirectTo=/wallet");
        return;
      }
      loadDonations(user.id);
    });
  }, [router]);

  async function loadDonations(userId: string) {
    const supabase = createClient() as any;

    // Step 1: get missionary donations
    const { data: donations } = await supabase
      .from("missionary_donations")
      .select("id, amount_cents, type, status, created_at, missionary_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!donations || donations.length === 0) {
      setLoading(false);
      return;
    }

    // Step 2: get missionary details
    const missionaryIds = [...new Set(donations.map((d: any) => d.missionary_id))];
    const { data: missionaries } = await supabase
      .from("missionaries")
      .select("id, slug, full_name, photo_url, mission_org")
      .in("id", missionaryIds);

    const mMap: Record<string, any> = {};
    for (const m of missionaries || []) mMap[m.id] = m;

    const enriched = donations.map((d: any) => ({
      ...d,
      missionary: mMap[d.missionary_id] || null,
    }));
    setMissionaryDonations(enriched);
    setLoading(false);
  }

  const filtered = missionaryDonations.filter((d) => {
    if (activeFilter === "missionaries") return true;
    if (activeFilter === "one_time") return d.type === "one_time";
    if (activeFilter === "recurring") return d.type === "monthly";
    return true;
  });

  const missionaryTotal = missionaryDonations.reduce((s, d) => s + d.amount_cents, 0);
  const uniqueMissionaries = new Set(missionaryDonations.map((d) => d.missionary_id)).size;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#faf9f6" }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a7a4a" }} />
      </div>
    );
  }

  const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "missionaries", label: "Missionaries" },
    { id: "one_time", label: "One-Time" },
    { id: "recurring", label: "Recurring" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: "#e5e1d8" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-1">My Wallet</h1>
          <p className="text-sm text-gray-500">Your giving history and transaction records</p>
        </div>
        {/* Filter tabs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto">
            {FILTER_TABS.map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? "border-green-600 text-green-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  style={active ? { borderColor: "#1a7a4a", color: "#1a7a4a" } : {}}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary card */}
        {missionaryTotal > 0 && (
          <div
            className="bg-white rounded-2xl border shadow-sm p-5"
            style={{ borderColor: "#e5e1d8" }}
          >
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Where Your Money Goes
            </h2>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Missionaries
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {missionaryDonations.length} donation
                  {missionaryDonations.length !== 1 ? "s" : ""} to {uniqueMissionaries} missionary
                  {uniqueMissionaries !== 1 ? "/missionaries" : ""}
                </span>
                <span className="font-display text-lg font-bold" style={{ color: "#1a7a4a" }}>
                  {fmt(missionaryTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Transaction list */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Transactions
          </h2>

          {filtered.length === 0 ? (
            <div
              className="bg-white rounded-2xl border shadow-sm p-10 text-center"
              style={{ borderColor: "#e5e1d8" }}
            >
              <p className="text-gray-400 text-sm mb-3">No transactions found.</p>
              <Link
                href="/missionaries"
                className="text-sm font-medium hover:underline"
                style={{ color: "#1a7a4a" }}
              >
                Support a missionary →
              </Link>
            </div>
          ) : (
            <div
              className="bg-white rounded-2xl border shadow-sm overflow-hidden"
              style={{ borderColor: "#e5e1d8" }}
            >
              {/* Missionaries section heading if showing all */}
              {activeFilter === "all" && filtered.some((d) => d.missionary) && (
                <div
                  className="px-5 py-2.5 border-b text-xs font-semibold text-gray-400 uppercase tracking-wide"
                  style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}
                >
                  Missionaries
                </div>
              )}
              {filtered.map((d, i) => {
                const m = d.missionary;
                return (
                  <div
                    key={d.id}
                    className={`px-5 py-4 flex items-center gap-4 ${
                      i < filtered.length - 1 ? "border-b" : ""
                    }`}
                    style={{ borderColor: "#f5f3ef" }}
                  >
                    {/* Missionary photo */}
                    {m?.photo_url ? (
                      <img
                        src={m.photo_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                        style={{ backgroundColor: "#1a7a4a" }}
                      >
                        {m?.full_name?.charAt(0) || "M"}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {m?.full_name || "Missionary"}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
                        >
                          Missionary Support
                        </span>
                        {d.type === "monthly" && (
                          <Repeat className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{relDate(d.created_at)}</div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-gray-900 text-sm">
                        {fmt(d.amount_cents)}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 justify-end">
                        {d.status === "pending" ? (
                          <Clock className="w-3 h-3 text-gray-400" />
                        ) : (
                          <CheckCircle className="w-3 h-3" style={{ color: "#1a7a4a" }} />
                        )}
                        <span className="text-xs text-gray-400 capitalize">{d.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
