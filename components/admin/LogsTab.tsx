"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface AdminLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  refund_issued:    { label: "Refund",       bg: "bg-red-50",    text: "text-red-700" },
  user_ban:         { label: "Ban",          bg: "bg-red-50",    text: "text-red-700" },
  user_unban:       { label: "Unban",        bg: "bg-[#e8f5ee]", text: "text-[#1a7a4a]" },
  user_suspend:     { label: "Suspend",      bg: "bg-amber-50",  text: "text-amber-700" },
  user_unsuspend:   { label: "Unsuspend",    bg: "bg-[#e8f5ee]", text: "text-[#1a7a4a]" },
  org_suspend:      { label: "Org Suspend",  bg: "bg-amber-50",  text: "text-amber-700" },
  org_unsuspend:    { label: "Org Unsuspend",bg: "bg-[#e8f5ee]", text: "text-[#1a7a4a]" },
  org_verify:       { label: "Verify",       bg: "bg-[#e8f5ee]", text: "text-[#1a7a4a]" },
  org_unverify:     { label: "Unverify",     bg: "bg-amber-50",  text: "text-amber-700" },
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#111827]" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>Admin Logs</h2>
        <button onClick={load} className="flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#111827]">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[#6b7280]">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-[#9b9990] text-center py-16">No admin actions logged yet</div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[#e5e1d8]" />
          <div className="space-y-4">
            {logs.map((log) => {
              const style = ACTION_STYLES[log.action] ?? { label: log.action, bg: "bg-[#faf9f6]", text: "text-[#6b7280]" };
              return (
                <div key={log.id} className="flex gap-4 relative">
                  <div className={`w-10 h-10 rounded-full ${style.bg} border-2 border-white flex items-center justify-center flex-shrink-0 z-10`}>
                    <div className={`w-2 h-2 rounded-full ${style.text.replace("text-", "bg-")}`} />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      {log.entity_type && (
                        <span className="text-xs text-[#9b9990]">on {log.entity_type}</span>
                      )}
                      <span className="text-xs text-[#9b9990] ml-auto">
                        {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="text-xs text-[#6b7280] mt-1 space-y-0.5">
                        {Object.entries(log.details).map(([k, v]) => (
                          <div key={k}><span className="text-[#9b9990]">{k}:</span> {String(v)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
