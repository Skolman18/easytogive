"use client";
import { useEffect, useState, useCallback } from "react";
import RefundModal from "./RefundModal";

interface Donation {
  id: string;
  userEmail: string;
  org_name: string;
  amount: number;
  donated_at: string;
  status: string;
  stripe_payment_intent_id: string;
  receipt_id: string | null;
  refund_amount: number;
  refund_reason: string;
}

const STATUS_STYLES: Record<string, string> = {
  completed:     "text-[#1a7a4a] bg-[#e8f5ee]",
  refunded:      "text-blue-700 bg-blue-50",
  partial_refund:"text-purple-700 bg-purple-50",
  pending:       "text-amber-700 bg-amber-50",
  pending_refund:"text-amber-700 bg-amber-50",
};

export default function TransactionsTab() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<Donation | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, status: statusFilter, dateFrom, dateTo });
    const res = await fetch(`/api/admin/transactions?${params}`);
    const data = await res.json();
    setDonations(data.donations ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-xl font-semibold text-gray-900">Transactions</h2>
          <p className="text-xs text-gray-400 mt-0.5">{total} total</p>
        </div>
        <button onClick={load} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email or org"
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] text-gray-700 placeholder-gray-400"
          style={{ borderColor: "#e5e1d8" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] text-gray-500"
          style={{ borderColor: "#e5e1d8" }}
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="partial_refund">Partial refund</option>
          <option value="pending">Pending</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] text-gray-500"
          style={{ borderColor: "#e5e1d8" }}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] text-gray-500"
          style={{ borderColor: "#e5e1d8" }}
        />
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8">Loading...</div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#faf9f6", borderBottom: "1px solid #e5e1d8" }}>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Donor</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Organization</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {donations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">No transactions found</td>
                </tr>
              )}
              {donations.map((d, i) => (
                <>
                  <tr
                    key={d.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderTop: i > 0 ? "1px solid #e5e1d8" : undefined }}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{d.id.slice(0, 8)}…</td>
                    <td className="px-5 py-3.5 text-gray-600">{d.userEmail}</td>
                    <td className="px-5 py-3.5 text-gray-800">{d.org_name || "—"}</td>
                    <td className="px-5 py-3.5 text-right font-semibold" style={{ color: "#1a7a4a" }}>{fmt(d.amount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[d.status] ?? "text-gray-500 bg-gray-100"}`}>
                        {(d.status ?? "completed").replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-gray-400">
                      {new Date(d.donated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                          className="text-xs text-gray-400 hover:text-gray-700 underline-offset-2 hover:underline"
                        >
                          {expanded === d.id ? "Hide" : "Details"}
                        </button>
                        {d.status !== "refunded" && (
                          <button
                            onClick={() => setRefundTarget(d)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === d.id && (
                    <tr key={`${d.id}-exp`} style={{ backgroundColor: "#faf9f6", borderTop: "1px solid #e5e1d8" }}>
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-x-10 gap-y-1 text-sm">
                          <div className="text-gray-400">Full ID: <span className="font-mono text-xs text-gray-600">{d.id}</span></div>
                          <div className="text-gray-400">Stripe PI: <span className="font-mono text-xs text-gray-600">{d.stripe_payment_intent_id || "—"}</span></div>
                          <div className="text-gray-400">Receipt: <span className="font-mono text-xs text-gray-600">{d.receipt_id || "—"}</span></div>
                          {d.refund_amount > 0 && (
                            <div className="text-gray-400">Refunded: <span className="text-red-600 font-medium">{fmt(d.refund_amount)}</span></div>
                          )}
                          {d.refund_reason && (
                            <div className="col-span-2 text-gray-400">Reason: <span className="text-gray-700">{d.refund_reason}</span></div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {refundTarget && (
        <RefundModal
          donation={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
