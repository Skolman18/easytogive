"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
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

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: "bg-[#e8f5ee] text-[#1a7a4a]",
      refunded: "bg-blue-50 text-blue-700",
      partial_refund: "bg-purple-50 text-purple-700",
      pending: "bg-amber-50 text-amber-700",
      pending_refund: "bg-amber-50 text-amber-700",
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-[#faf9f6] text-[#6b7280]"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#111827]" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>Transactions</h2>
          <p className="text-sm text-[#6b7280] mt-0.5">{total} total donations</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#111827]">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b9990]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email or org..."
            className="w-full pl-9 pr-3 py-2.5 border border-[#e5e1d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-[#e5e1d8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] text-[#6b7280]"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="partial_refund">Partial refund</option>
          <option value="pending">Pending</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="border border-[#e5e1d8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] text-[#6b7280]" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="border border-[#e5e1d8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] text-[#6b7280]" />
      </div>

      {loading ? (
        <div className="text-sm text-[#6b7280]">Loading...</div>
      ) : (
        <div className="border border-[#e5e1d8] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-[#e5e1d8]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Organization</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {donations.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6b7280]">No transactions found</td></tr>
              )}
              {donations.map((d) => (
                <>
                  <tr key={d.id} className="border-b border-[#e5e1d8] last:border-0 hover:bg-[#faf9f6]">
                    <td className="px-4 py-3 font-mono text-xs text-[#9b9990]">{d.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-[#6b7280]">{d.userEmail}</td>
                    <td className="px-4 py-3 text-[#111827]">{d.org_name || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-[#1a7a4a]">{fmt(d.amount)}</td>
                    <td className="px-4 py-3">{statusBadge(d.status ?? "completed")}</td>
                    <td className="px-4 py-3 text-right text-xs text-[#9b9990]">
                      {new Date(d.donated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                          className="flex items-center gap-1 text-xs text-[#6b7280] border border-[#e5e1d8] rounded-lg px-2 py-1.5 hover:bg-[#faf9f6]"
                        >
                          Details {expanded === d.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {d.status !== "refunded" && (
                          <button
                            onClick={() => setRefundTarget(d)}
                            className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-100"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === d.id && (
                    <tr key={`${d.id}-expanded`} className="bg-[#faf9f6] border-b border-[#e5e1d8]">
                      <td colSpan={7} className="px-6 py-4 text-sm space-y-1">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                          <div><span className="text-[#6b7280]">Full ID:</span> <span className="font-mono text-xs">{d.id}</span></div>
                          <div><span className="text-[#6b7280]">Stripe PI:</span> <span className="font-mono text-xs">{d.stripe_payment_intent_id || "—"}</span></div>
                          <div><span className="text-[#6b7280]">Receipt ID:</span> <span className="font-mono text-xs">{d.receipt_id || "—"}</span></div>
                          {d.refund_amount > 0 && (
                            <div><span className="text-[#6b7280]">Refunded:</span> <span className="text-red-600">{fmt(d.refund_amount)}</span></div>
                          )}
                          {d.refund_reason && (
                            <div className="col-span-2"><span className="text-[#6b7280]">Refund reason:</span> {d.refund_reason}</div>
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
