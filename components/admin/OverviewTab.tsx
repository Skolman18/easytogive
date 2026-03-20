"use client";
import { useEffect, useState } from "react";

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

  const fmt = (cents: number) =>
    "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (loading) {
    return <div className="text-sm text-gray-400 py-8">Loading...</div>;
  }

  return (
    <div className="space-y-10">

      {/* Stats — editorial row, no cards, no icons */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold text-gray-900">Overview</h2>
          <button
            onClick={load}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {stats && (
          <>
            <div
              className="grid grid-cols-3 md:grid-cols-5"
              style={{ borderTop: "1px solid #e5e1d8", borderBottom: "1px solid #e5e1d8" }}
            >
              {[
                { label: "Users",          value: stats.totalUsers.toLocaleString() },
                { label: "Organizations",  value: stats.totalOrgs.toLocaleString() },
                { label: "Donations",      value: stats.totalDonations.toLocaleString() },
                { label: "Total volume",   value: fmt(stats.totalVolumeCents) },
                { label: "Pending refunds",value: stats.pendingRefunds.toLocaleString() },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="py-5 pr-6"
                  style={{ paddingLeft: i === 0 ? 0 : "1.5rem", borderLeft: i > 0 ? "1px solid #e5e1d8" : "none" }}
                >
                  <div className="font-display text-2xl font-semibold text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-6 mt-4 text-sm text-gray-500">
              <span><span className="font-semibold text-gray-800">{stats.donationsToday}</span> today</span>
              <span><span className="font-semibold text-gray-800">{stats.donationsWeek}</span> this week</span>
              <span><span className="font-semibold text-gray-800">{stats.donationsMonth}</span> this month</span>
            </div>
          </>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <h3 className="font-display text-base font-semibold text-gray-900 mb-4">Recent Donations</h3>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#faf9f6", borderBottom: "1px solid #e5e1d8" }}>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Donor</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Organization</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Amount</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-gray-400">No donations yet</td>
                </tr>
              )}
              {activity.map((a, i) => (
                <tr
                  key={a.id}
                  className="hover:bg-gray-50 transition-colors"
                  style={{ borderTop: i > 0 ? "1px solid #e5e1d8" : undefined }}
                >
                  <td className="px-5 py-3.5 text-gray-700">{a.userEmail}</td>
                  <td className="px-5 py-3.5 text-gray-400">{a.org_name || "—"}</td>
                  <td className="px-5 py-3.5 text-right font-semibold" style={{ color: "#1a7a4a" }}>
                    {fmt(a.amount)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-400 text-xs">
                    {new Date(a.donated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
