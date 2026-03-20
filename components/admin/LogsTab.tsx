"use client";
import { useEffect, useState } from "react";

interface AdminLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  refund_issued:  { label: "Refund",       color: "text-red-600" },
  user_ban:       { label: "Ban",          color: "text-red-600" },
  user_unban:     { label: "Unban",        color: "text-[#1a7a4a]" },
  user_suspend:   { label: "Suspend",      color: "text-amber-600" },
  user_unsuspend: { label: "Unsuspend",    color: "text-[#1a7a4a]" },
  org_suspend:    { label: "Org suspend",  color: "text-amber-600" },
  org_unsuspend:  { label: "Org unsuspend",color: "text-[#1a7a4a]" },
  org_verify:     { label: "Verify org",   color: "text-[#1a7a4a]" },
  org_unverify:   { label: "Unverify org", color: "text-amber-600" },
};

export default function LogsTab() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/logs?limit=200");
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl font-semibold text-gray-900">Admin Logs</h2>
        <button onClick={load} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-gray-400 py-16 text-center">No actions logged yet</div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#faf9f6", borderBottom: "1px solid #e5e1d8" }}>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Action</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Target</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Details</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const style = ACTION_LABELS[log.action] ?? { label: log.action, color: "text-gray-500" };
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderTop: i > 0 ? "1px solid #e5e1d8" : undefined }}
                  >
                    <td className={`px-5 py-3.5 font-medium text-sm ${style.color}`}>{style.label}</td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {log.entity_type && <span className="capitalize">{log.entity_type}</span>}
                      {log.entity_id && <span className="font-mono text-xs text-gray-400 ml-1">{log.entity_id.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {log.details && Object.entries(log.details)
                        .filter(([k]) => k !== "performedBy")
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" · ")}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
