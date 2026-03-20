"use client";
import { useEffect, useState, useCallback } from "react";
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

const STATUS_STYLES: Record<string, string> = {
  active:    "text-[#1a7a4a] bg-[#e8f5ee]",
  suspended: "text-amber-700 bg-amber-50",
  banned:    "text-red-700 bg-red-50",
};

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

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl font-semibold text-gray-900">Users</h2>
        <button onClick={load} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name"
          className="w-full max-w-sm px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] text-gray-700 placeholder-gray-400"
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
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Joined</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Given</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">No users found</td>
                </tr>
              )}
              {users.map((user, i) => (
                <>
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderTop: i > 0 ? "1px solid #e5e1d8" : undefined }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-800">{user.full_name || "—"}</div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium" style={{ color: "#1a7a4a" }}>
                      {fmt(user.totalDonatedCents)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[user.status] ?? STATUS_STYLES.active}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            if (expanded === user.id) { setExpanded(null); return; }
                            setExpanded(user.id);
                            loadUserDonations(user.id);
                          }}
                          className="text-xs text-gray-500 hover:text-gray-800 underline-offset-2 hover:underline"
                        >
                          {expanded === user.id ? "Hide" : "View"}
                        </button>
                        {user.status === "active" && (
                          <button
                            onClick={() => setModal({ type: "suspend", user })}
                            className="text-xs text-amber-700 hover:text-amber-900"
                          >
                            Suspend
                          </button>
                        )}
                        {user.status === "suspended" && (
                          <button
                            onClick={() => handleAction(user.id, "unsuspend")}
                            className="text-xs text-[#1a7a4a] hover:text-[#155f3a]"
                          >
                            Unsuspend
                          </button>
                        )}
                        {user.status !== "banned" && (
                          <button
                            onClick={() => setModal({ type: "ban", user })}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Ban
                          </button>
                        )}
                        {user.status === "banned" && (
                          <button
                            onClick={() => handleAction(user.id, "unban")}
                            className="text-xs text-gray-500 hover:text-gray-800"
                          >
                            Unban
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === user.id && (
                    <tr key={`${user.id}-exp`} style={{ backgroundColor: "#faf9f6", borderTop: "1px solid #e5e1d8" }}>
                      <td colSpan={5} className="px-6 py-4">
                        {user.ban_reason && (
                          <p className="text-xs text-red-600 mb-3">
                            <span className="font-medium">Ban reason:</span> {user.ban_reason}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Giving history</p>
                        {(userDonations[user.id] ?? []).length === 0 ? (
                          <p className="text-sm text-gray-400">No donations</p>
                        ) : (
                          <div className="space-y-1.5">
                            {(userDonations[user.id] ?? []).slice(0, 10).map((d) => (
                              <div key={d.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">{d.org_name || "Unknown"}</span>
                                <span className="font-medium" style={{ color: "#1a7a4a" }}>${(d.amount / 100).toFixed(2)}</span>
                                <span className="text-xs text-gray-400">{new Date(d.donated_at).toLocaleDateString()}</span>
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
          message="This user will be redirected to a suspended page on next login. You can unsuspend at any time."
          confirmLabel="Suspend"
          onConfirm={() => handleAction(modal.user.id, "suspend")}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "ban" && (
        <ConfirmModal
          title={`Ban ${modal.user.email}?`}
          message="This is permanent. The user will not be able to access their account."
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
