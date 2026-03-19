"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, ChevronDown, ChevronUp, Shield, Ban, RefreshCw } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  totalDonatedCents: number;
  status: "active" | "suspended" | "banned";
  ban_reason: string;
}

interface DonationRecord {
  id: string;
  org_name: string;
  amount: number;
  donated_at: string;
  status: string;
}

export default function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [userDonations, setUserDonations] = useState<Record<string, DonationRecord[]>>({});
  const [modal, setModal] = useState<{ type: string; user: AdminUser } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const loadUserDonations = async (userId: string) => {
    if (userDonations[userId]) return;
    const res = await fetch(`/api/admin/transactions?search=${userId}`);
    const data = await res.json();
    setUserDonations((prev) => ({ ...prev, [userId]: data.donations ?? [] }));
  };

  const handleAction = async (userId: string, action: string, banReason?: string) => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, banReason }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error ?? "Action failed");
    }
    await load();
  };

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-[#e8f5ee] text-[#1a7a4a]",
      suspended: "bg-amber-50 text-amber-700",
      banned: "bg-red-50 text-red-700",
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? map.active}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#111827]" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>Users</h2>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#111827]">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b9990]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="w-full pl-9 pr-4 py-2.5 border border-[#e5e1d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
        />
      </div>

      {loading ? (
        <div className="text-sm text-[#6b7280]">Loading...</div>
      ) : (
        <div className="border border-[#e5e1d8] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-[#e5e1d8]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Total Given</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#6b7280]">No users found</td></tr>
              )}
              {users.map((user) => (
                <>
                  <tr key={user.id} className="border-b border-[#e5e1d8] last:border-0 hover:bg-[#faf9f6]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#111827]">{user.full_name || "—"}</div>
                      <div className="text-xs text-[#6b7280]">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs">
                      {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#1a7a4a]">{fmt(user.totalDonatedCents)}</td>
                    <td className="px-4 py-3">{statusBadge(user.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            if (expanded === user.id) { setExpanded(null); return; }
                            setExpanded(user.id);
                            loadUserDonations(user.id);
                          }}
                          className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#111827] border border-[#e5e1d8] rounded-lg px-2 py-1.5"
                        >
                          View {expanded === user.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {user.status === "active" && (
                          <button
                            onClick={() => setModal({ type: "suspend", user })}
                            className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 hover:bg-amber-100"
                          >
                            <Shield className="w-3 h-3" /> Suspend
                          </button>
                        )}
                        {user.status === "suspended" && (
                          <button
                            onClick={() => handleAction(user.id, "unsuspend")}
                            className="text-xs text-[#1a7a4a] bg-[#e8f5ee] border border-[#bbf7d0] rounded-lg px-2 py-1.5 hover:bg-[#d1fae5]"
                          >
                            Unsuspend
                          </button>
                        )}
                        {user.status !== "banned" && (
                          <button
                            onClick={() => setModal({ type: "ban", user })}
                            className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-100"
                          >
                            <Ban className="w-3 h-3" /> Ban
                          </button>
                        )}
                        {user.status === "banned" && (
                          <button
                            onClick={() => handleAction(user.id, "unban")}
                            className="text-xs text-[#6b7280] border border-[#e5e1d8] rounded-lg px-2 py-1.5 hover:bg-[#faf9f6]"
                          >
                            Unban
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === user.id && (
                    <tr key={`${user.id}-expanded`} className="bg-[#faf9f6] border-b border-[#e5e1d8]">
                      <td colSpan={5} className="px-6 py-4">
                        {user.ban_reason && (
                          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            <span className="font-medium">Ban reason:</span> {user.ban_reason}
                          </div>
                        )}
                        <div className="text-xs font-medium text-[#6b7280] uppercase tracking-wide mb-2">Giving History</div>
                        {(userDonations[user.id] ?? []).length === 0 ? (
                          <div className="text-sm text-[#9b9990]">No donations found</div>
                        ) : (
                          <div className="space-y-1">
                            {(userDonations[user.id] ?? []).slice(0, 10).map((d) => (
                              <div key={d.id} className="flex justify-between text-sm">
                                <span className="text-[#6b7280]">{d.org_name || "Unknown org"}</span>
                                <span className="font-mono text-[#1a7a4a]">{fmt(d.amount)}</span>
                                <span className="text-xs text-[#9b9990]">{new Date(d.donated_at).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.type === "suspend" && (
        <ConfirmModal
          title={`Suspend ${modal.user.email}?`}
          message="This user will be redirected to a suspended page when they try to log in. You can unsuspend at any time."
          confirmLabel="Suspend User"
          onConfirm={() => handleAction(modal.user.id, "suspend")}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "ban" && (
        <ConfirmModal
          title={`Ban ${modal.user.email}?`}
          message="This is a permanent ban. The user will not be able to access their account."
          confirmLabel="Ban User"
          requireReason
          reasonLabel="Ban reason"
          onConfirm={(reason) => handleAction(modal.user.id, "ban", reason)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
