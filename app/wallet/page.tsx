"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, Building2, ExternalLink } from "lucide-react";
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

type FilterTab = "all" | "one_time" | "recurring";

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
  const [donations, setDonations] = useState<any[]>([]);
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

    const { data } = await supabase
      .from("donations")
      .select("id, amount, org_id, donated_at, receipt_id")
      .eq("user_id", userId)
      .order("donated_at", { ascending: false })
      .limit(200);

    const rows = data || [];
    if (rows.length > 0) {
      const orgIds = [...new Set(rows.map((d: any) => d.org_id).filter(Boolean))];
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, image_url, category")
        .in("id", orgIds);

      const orgMap: Record<string, any> = {};
      for (const org of orgs || []) orgMap[org.id] = org;

      setDonations(rows.map((d: any) => ({
        ...d,
        org: orgMap[d.org_id] || null,
        // Recurring donations have receipt IDs starting with "ETG-REC-"
        recurring: (d.receipt_id as string | null)?.startsWith("ETG-REC-") ?? false,
      })));
    } else {
      setDonations([]);
    }

    setLoading(false);
  }

  const filtered = donations.filter((d) => {
    if (activeFilter === "recurring") return !!d.recurring;
    if (activeFilter === "one_time") return !d.recurring;
    return true;
  });

  const total = filtered.reduce((s, d) => s + d.amount, 0);
  const uniqueOrgs = new Set(filtered.map((d) => d.org_id)).size;

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
    { id: "one_time", label: "One-Time" },
    { id: "recurring", label: "Recurring" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: "#e5e1d8" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          <h1 className="font-display text-xl md:text-3xl font-bold text-gray-900 mb-1">My Wallet</h1>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 space-y-4 md:space-y-8">
        {/* Summary card */}
        {donations.length > 0 && (
          <div
            className="bg-white rounded-xl md:rounded-2xl border shadow-sm p-4 md:p-5"
            style={{ borderColor: "#e5e1d8" }}
          >
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Your Giving Summary
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {filtered.length} donation{filtered.length !== 1 ? "s" : ""}
                {uniqueOrgs > 0 && ` to ${uniqueOrgs} org${uniqueOrgs !== 1 ? "s" : ""}`}
              </span>
              <span className="font-display text-xl font-bold" style={{ color: "#1a7a4a" }}>
                {fmt(total)}
              </span>
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
              className="bg-white rounded-xl md:rounded-2xl border shadow-sm p-8 md:p-10 text-center"
              style={{ borderColor: "#e5e1d8" }}
            >
              <p className="text-gray-400 text-sm mb-3">No transactions found.</p>
              <Link
                href="/discover"
                className="text-sm font-medium hover:underline"
                style={{ color: "#1a7a4a" }}
              >
                Discover organizations →
              </Link>
            </div>
          ) : (
            <div
              className="bg-white rounded-xl md:rounded-2xl border shadow-sm overflow-hidden"
              style={{ borderColor: "#e5e1d8" }}
            >
              {filtered.map((d, i) => {
                const name = d.org?.name || "Organization";
                const photoUrl = d.org?.image_url;
                const dateStr = d.donated_at;

                return (
                  <div
                    key={d.id}
                    className={`px-4 py-3 md:px-5 md:py-4 flex items-center gap-3 md:gap-4 ${
                      i < filtered.length - 1 ? "border-b" : ""
                    }`}
                    style={{ borderColor: "#f5f3ef" }}
                  >
                    {/* Avatar */}
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                        style={{ backgroundColor: "#1a7a4a" }}
                      >
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{name}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
                        >
                          {d.org?.category || "Donation"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{relDate(dateStr)}</div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-gray-900 text-sm">{fmt(d.amount)}</div>
                      {d.receipt_id ? (
                        <Link
                          href={`/receipts/${encodeURIComponent(d.receipt_id)}`}
                          className="flex items-center gap-1 mt-0.5 justify-end hover:underline"
                          style={{ color: "#1a7a4a" }}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="text-xs">receipt</span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-1 mt-0.5 justify-end">
                          <CheckCircle className="w-3 h-3" style={{ color: "#1a7a4a" }} />
                          <span className="text-xs text-gray-400">completed</span>
                        </div>
                      )}
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
