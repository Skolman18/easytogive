"use client";
import { useEffect, useState } from "react";
import { Users, Building2, DollarSign, TrendingUp, RefreshCw, Activity } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalOrgs: number;
  totalDonations: number;
  totalVolumeCents: number;
  pendingRefunds: number;
  donationsToday: number;
  donationsWeek: number;
  donationsMonth: number;
}

interface ActivityItem {
  id: string;
  userEmail: string;
  org_name: string;
  amount: number;
  donated_at: string;
  status: string;
}

export default function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/overview");
      const data = await res.json();
      setStats(data.stats);
      setActivity(data.recentActivity ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const statCards = stats ? [
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Organizations", value: stats.totalOrgs.toLocaleString(), icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Donations", value: stats.totalDonations.toLocaleString(), icon: Activity, color: "text-[#1a7a4a]", bg: "bg-[#e8f5ee]" },
    { label: "Total Volume", value: fmt(stats.totalVolumeCents), icon: DollarSign, color: "text-[#1a7a4a]", bg: "bg-[#e8f5ee]" },
    { label: "Pending Refunds", value: stats.pendingRefunds.toLocaleString(), icon: RefreshCw, color: "text-amber-600", bg: "bg-amber-50" },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#111827]" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>Overview</h2>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#111827]">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[#6b7280]">Loading...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white border border-[#e5e1d8] rounded-xl p-4">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="text-2xl font-bold text-[#111827] font-mono">{s.value}</div>
                <div className="text-xs text-[#6b7280] mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Donations today", value: stats.donationsToday },
                { label: "This week", value: stats.donationsWeek },
                { label: "This month", value: stats.donationsMonth },
              ].map((s) => (
                <div key={s.label} className="bg-[#faf9f6] border border-[#e5e1d8] rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-[#1a7a4a] font-mono">{s.value}</div>
                  <div className="text-xs text-[#6b7280] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recent activity */}
          <div>
            <h3 className="text-base font-semibold text-[#111827] mb-3">Recent Activity</h3>
            <div className="border border-[#e5e1d8] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#faf9f6] border-b border-[#e5e1d8]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Organization</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[#6b7280] text-sm">No recent activity</td></tr>
                  )}
                  {activity.map((a) => (
                    <tr key={a.id} className="border-b border-[#e5e1d8] last:border-0 hover:bg-[#faf9f6]">
                      <td className="px-4 py-3 text-[#111827]">{a.userEmail}</td>
                      <td className="px-4 py-3 text-[#6b7280]">{a.org_name || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#1a7a4a]">{fmt(a.amount)}</td>
                      <td className="px-4 py-3 text-right text-[#9b9990] text-xs">
                        {new Date(a.donated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
