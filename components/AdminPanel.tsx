"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import Toggle from "@/components/Toggle";
import OrgOrderingTab from "@/components/OrgOrderingTab";
import ImageUpload from "@/components/ImageUpload";
import {
  Pencil,
  Trash2,
  Copy,
  Download,
  ChevronUp,
  ChevronDown,
  Check,
  Search,
  Loader2,
  ExternalLink,
  Film,
  Eye,
  PlayCircle,
} from "lucide-react";
import { CATEGORY_LABELS, SUBCATEGORY_OPTIONS, TOP_LEVEL_CATEGORIES } from "@/lib/categories";
import type { TopCategory } from "@/lib/categories";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [...TOP_LEVEL_CATEGORIES];

const EMPTY_FORM = {
  id: "", name: "", tagline: "", description: "",
  category: "community", subcategory: "", location: "", ein: "",
  founded: 2020, website: "", goal: 50000,
  tags: [] as string[], verified: false, featured: false,
  image_url: "", cover_url: "", sort_order: 0,
  recommended_orgs: [] as string[],
  contact_email: "",
  video_url: "", video_type: "", show_video: false,
  our_story: "",
};

const DEFAULT_DISPLAY_SETTINGS = {
  show_goal: false,
  show_donors: false,
  show_raised: false,
  show_recommendations: false,
  show_impact_stats: false,
  show_related_orgs: false,
  show_video: false,
};

const ADMIN_TABS = [
  { id: "edit", label: "Add / Edit Org" },
  { id: "ordering", label: "Ordering" },
  { id: "orgs", label: "Organizations" },
  { id: "users", label: "Users" },
  { id: "waitlist", label: "Waitlist" },
  { id: "applications", label: "Applications" },
  { id: "impact", label: "Impact Reviews" },
  { id: "missionaries", label: "Missionaries" },
  { id: "navigation", label: "Navigation" },
  { id: "roadmap", label: "Roadmap" },
  { id: "audit", label: "Audit Log" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string, email: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-gray-400">
      {message}
    </div>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({
  on, onLabel, offLabel, onClick,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
        on
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}

// ─── SortHeader ───────────────────────────────────────────────────────────────

function SortHeader({
  label, field, sort, setSort,
}: {
  label: string;
  field: string;
  sort: { field: string; dir: "asc" | "desc" };
  setSort: (s: { field: string; dir: "asc" | "desc" }) => void;
}) {
  const active = sort.field === field;
  return (
    <th
      className="text-left px-4 py-3 cursor-pointer select-none group"
      onClick={() => setSort({ field, dir: active && sort.dir === "asc" ? "desc" : "asc" })}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="text-gray-300 group-hover:text-gray-500">
          {active ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronDown className="w-3 h-3 opacity-40" />}
        </span>
      </div>
    </th>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [portfolioCounts, setPortfolioCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ field: string; dir: "asc" | "desc" }>({ field: "created_at", dir: "desc" });

  useEffect(() => {
    async function load() {
      const supabase = createClient() as any;
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (userData) setUsers(userData);

      const { data: portfolioData } = await supabase
        .from("portfolio_orgs")
        .select("user_id");
      if (portfolioData) {
        const counts: Record<string, number> = {};
        for (const row of portfolioData) {
          counts[row.user_id] = (counts[row.user_id] || 0) + 1;
        }
        setPortfolioCounts(counts);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal: any, bVal: any;
    if (sort.field === "created_at") {
      aVal = new Date(a.created_at).getTime();
      bVal = new Date(b.created_at).getTime();
    } else if (sort.field === "portfolio") {
      aVal = portfolioCounts[a.id] || 0;
      bVal = portfolioCounts[b.id] || 0;
    } else {
      return 0;
    }
    return sort.dir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const thCls = "text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{users.length}</span> users registered
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="pl-8 pr-4 py-2 border rounded-lg text-sm outline-none focus:border-green-600 transition-colors bg-white"
            style={{ borderColor: "#e5e7eb", width: 240 }}
          />
        </div>
      </div>

      {loading ? <Spinner /> : sorted.length === 0 ? (
        <EmptyState message={search ? `No users match "${search}"` : "No users yet."} />
      ) : (
        <div className="overflow-x-auto rounded-xl border shadow-sm" style={{ borderColor: "#e5e7eb" }}>
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b text-gray-500 bg-gray-50" style={{ borderColor: "#e5e7eb" }}>
                <th className={thCls}>User</th>
                <th className={thCls}>Email</th>
                <SortHeader label="Member Since" field="created_at" sort={sort} setSort={setSort} />
                <th className={thCls}>Location</th>
                <th className={thCls}>Causes</th>
                <th className={thCls + " text-center"}>Onboarded</th>
                <SortHeader label="Portfolio" field="portfolio" sort={sort} setSort={setSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => {
                const causes: string[] = u.causes ?? [];
                const location = [u.city, u.state].filter(Boolean).join(", ");
                const portfolioCount = portfolioCounts[u.id] || 0;
                return (
                  <tr
                    key={u.id}
                    className="border-b hover:bg-gray-50 transition-colors bg-white"
                    style={{ borderColor: "#f3f4f6" }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: "#1a7a4a" }}
                          >
                            {initials(u.full_name, u.email)}
                          </div>
                        )}
                        <span className="font-medium text-gray-900">
                          {u.full_name || <span className="text-gray-400">No name set</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{location || "—"}</td>
                    <td className="px-4 py-3">
                      {causes.length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {causes.slice(0, 3).map((c) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}
                            >
                              {c.replace(/-/g, " ")}
                            </span>
                          ))}
                          {causes.length > 3 && (
                            <span className="text-xs text-gray-400">+{causes.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.onboarding_complete ? (
                        <Check className="w-4 h-4 mx-auto" style={{ color: "#1a7a4a" }} />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-gray-900">{portfolioCount}</span>
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

// ─── Organizations Tab ────────────────────────────────────────────────────────

function OrgsTab({ onEdit }: { onEdit: (org: any) => void }) {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const load = useCallback(async () => {
    const { data } = await (createClient() as any)
      .from("organizations")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setOrgs(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(id: string, field: "visible" | "featured" | "verified", current: boolean) {
    await (createClient() as any)
      .from("organizations")
      .update({ [field]: !current })
      .eq("id", id);
    setOrgs((prev) => prev.map((o) => o.id === id ? { ...o, [field]: !current } : o));
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete "${orgs.find((o) => o.id === id)?.name}"? This cannot be undone.`)) return;
    await (createClient() as any).from("organizations").delete().eq("id", id);
    setOrgs((prev) => prev.filter((o) => o.id !== id));
  }

  const filtered = orgs.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch = (o.name || "").toLowerCase().includes(q) || (o.location || "").toLowerCase().includes(q);
    const matchCat = categoryFilter === "all" || o.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const thCls = "text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{orgs.length}</span> organizations listed
          </p>
          <a
            href="/signup/organization?preview=true"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all hover:bg-green-50"
            style={{ borderColor: "#1a7a4a", color: "#1a7a4a" }}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Preview Org Onboarding Flow
          </a>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 text-gray-700 outline-none focus:border-green-600 bg-white"
            style={{ borderColor: "#e5e7eb" }}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or location…"
              className="pl-8 pr-4 py-2 border rounded-lg text-sm outline-none focus:border-green-600 transition-colors bg-white"
              style={{ borderColor: "#e5e7eb", width: 240 }}
            />
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState message={search ? `No organizations match "${search}"` : "No organizations yet."} />
      ) : (
        <div className="overflow-x-auto rounded-xl border shadow-sm" style={{ borderColor: "#e5e7eb" }}>
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b bg-gray-50" style={{ borderColor: "#e5e7eb" }}>
                <th className={thCls}>Organization</th>
                <th className={thCls}>Category</th>
                <th className={thCls}>Location</th>
                <th className={thCls}>Added</th>
                <th className={thCls + " text-center"}>Visible</th>
                <th className={thCls + " text-center"}>Featured</th>
                <th className={thCls + " text-center"}>Verified</th>
                <th className={thCls + " text-center"}>Video</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => (
                <tr
                  key={org.id}
                  className="border-b hover:bg-gray-50 transition-colors bg-white"
                  style={{ borderColor: "#f3f4f6" }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {org.image_url ? (
                          <img src={org.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <a
                          href={`/org/${org.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-gray-900 hover:text-green-700 transition-colors flex items-center gap-1"
                        >
                          {org.name}
                          <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-300" />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                      style={{ backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}
                    >
                      {CATEGORY_LABELS[org.category] ?? org.category}
                      {org.subcategory && (
                        <> › {CATEGORY_LABELS[org.subcategory] ?? org.subcategory}</>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{org.location || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(org.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <Pill on={org.visible ?? false} onLabel="Visible" offLabel="Hidden" onClick={() => toggle(org.id, "visible", org.visible ?? false)} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Pill on={org.featured ?? false} onLabel="Featured" offLabel="No" onClick={() => toggle(org.id, "featured", org.featured ?? false)} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Pill on={org.verified ?? false} onLabel="Verified" offLabel="No" onClick={() => toggle(org.id, "verified", org.verified ?? false)} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {org.video_url ? (
                      org.show_video ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Has Video</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Hidden</span>
                      )
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(org)}
                        className="p-1.5 rounded-lg border text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        style={{ borderColor: "#bfdbfe" }}
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={`/org/dashboard?preview=true&orgId=${org.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                        style={{ borderColor: "#fde68a" }}
                        title="Preview as Org"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDelete(org.id)}
                        className="p-1.5 rounded-lg border text-red-400 bg-red-50 hover:bg-red-100 transition-colors"
                        style={{ borderColor: "#fecaca" }}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Waitlist Tab ─────────────────────────────────────────────────────────────

function WaitlistTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await (createClient() as any)
        .from("waitlist")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setEntries(data);
      setLoading(false);
    }
    load();
  }, []);

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email);
    setCopied(email);
    setTimeout(() => setCopied(null), 2000);
  }

  function exportCsv() {
    const header = "email,signed_up\n";
    const rows = entries
      .map((e) => `${e.email},${e.created_at}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "easytogive-waitlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const thCls = "text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{entries.length}</span> people on the waitlist
        </p>
        <button
          onClick={exportCsv}
          disabled={entries.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
          style={{ borderColor: "#e5e7eb" }}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {loading ? <Spinner /> : entries.length === 0 ? (
        <EmptyState message="No waitlist signups yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border shadow-sm" style={{ borderColor: "#e5e7eb" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50" style={{ borderColor: "#e5e7eb" }}>
                <th className={thCls}>Email</th>
                <th className={thCls}>Signed Up</th>
                <th className={thCls + " w-20"}></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className="border-b hover:bg-gray-50 transition-colors bg-white"
                  style={{ borderColor: "#f3f4f6" }}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{e.email}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(e.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copyEmail(e.email)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors hover:bg-gray-100"
                      style={{ borderColor: "#e5e7eb", color: copied === e.email ? "#1a7a4a" : "#6b7280" }}
                    >
                      {copied === e.email ? (
                        <><Check className="w-3 h-3" /> Copied</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copy</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Roadmap Tab ─────────────────────────────────────────────────────────────

const ROADMAP_ITEMS = [
  {
    id: "paycheck-giving",
    status: "coming-soon",
    title: "Paycheck Giving",
    summary: "Allow users to set a percentage of each paycheck to automatically flow into their giving portfolio.",
    details: [
      "Triggers bi-weekly on payday",
      "Requires Plaid integration for bank/payroll connection or employer direct deposit setup",
      "UI is designed and ready — pending payment infrastructure",
    ],
  },
];

// ─── Missionaries Tab ─────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

// ─── Impact Review Tab ────────────────────────────────────────────────────────

function ImpactReviewTab() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const supabase = createClient() as any;

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  async function load() {
    setLoading(true);
    // Admin sees all; join org name via a second query since we can't easily join
    const { data } = await supabase
      .from("org_impact_updates")
      .select("id, org_id, stat_value, stat_label, stat_period, message, proof_url, proof_note, status, rejection_note, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data && data.length > 0) {
      // Fetch org names
      const orgIds = [...new Set(data.map((u: any) => u.org_id))];
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      const orgMap: Record<string, string> = {};
      (orgs ?? []).forEach((o: any) => { orgMap[o.id] = o.name; });
      setUpdates(data.map((u: any) => ({ ...u, org_name: orgMap[u.org_id] ?? u.org_id })));
    } else {
      setUpdates([]);
    }
    setLoading(false);
  }

  async function approve(id: string) {
    setSaving(id);
    const res = await fetch("/api/org/impact-updates/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateId: id }),
    });
    if (res.ok) {
      setUpdates((prev) => prev.map((u) => u.id === id ? { ...u, status: "approved", visible: true } : u));
    }
    setSaving(null);
  }

  async function reject(id: string) {
    const note = rejectionNotes[id] ?? "";
    setSaving(id);
    await supabase
      .from("org_impact_updates")
      .update({ status: "rejected", visible: false, rejection_note: note, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setUpdates((prev) => prev.map((u) => u.id === id ? { ...u, status: "rejected", rejection_note: note } : u));
    setRejectingId(null);
    setSaving(null);
  }

  const filtered = updates.filter((u) => u.status === filter);
  const pendingCount = updates.filter((u) => u.status === "pending").length;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "approved", "rejected"] as const).map((f) => {
          const count = updates.filter((u) => u.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize"
              style={filter === f
                ? { backgroundColor: "#1a7a4a", color: "white" }
                : { backgroundColor: "#f0ede6", color: "#374151" }
              }
            >
              {f === "pending" ? `Pending Review (${count})` : f === "approved" ? `Approved (${count})` : `Rejected (${count})`}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={`No ${filter} impact updates.`} />
      ) : (
        <div className="space-y-4">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl border bg-white overflow-hidden"
              style={{ borderColor: "#e5e1d8" }}
            >
              {/* Header */}
              <div
                className="px-5 py-3 border-b flex items-center justify-between gap-3"
                style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}
              >
                <div>
                  <span className="font-semibold text-sm text-gray-900">{u.org_name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                {u.status === "approved" && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "#e8f5ee", color: "#166534" }}>Approved</span>
                )}
                {u.status === "pending" && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "#fffbeb", color: "#92400e" }}>Pending</span>
                )}
                {u.status === "rejected" && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "#fef2f2", color: "#991b1b" }}>Rejected</span>
                )}
              </div>

              <div className="px-5 py-4 space-y-3">
                {/* Stat */}
                <div>
                  <p
                    className="font-display text-xl font-bold"
                    style={{ color: "#1a7a4a" }}
                  >
                    {u.stat_value} {u.stat_label}
                    <span className="text-sm font-normal text-gray-400 ml-2">· {u.stat_period}</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{u.message}</p>
                </div>

                {/* Proof */}
                <div
                  className="rounded-xl p-3 space-y-1.5"
                  style={{ backgroundColor: "#faf9f6", border: "1px solid #e5e1d8" }}
                >
                  <p className="text-xs font-semibold text-gray-600">Proof Submitted</p>
                  {u.proof_url ? (
                    <a
                      href={u.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium flex items-center gap-1 hover:underline break-all"
                      style={{ color: "#1a7a4a" }}
                    >
                      {u.proof_url}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No proof URL provided</p>
                  )}
                  {u.proof_note && (
                    <p className="text-xs text-gray-500 italic">&ldquo;{u.proof_note}&rdquo;</p>
                  )}
                </div>

                {/* Rejection note (if already rejected) */}
                {u.status === "rejected" && u.rejection_note && (
                  <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#fef2f2", color: "#991b1b" }}>
                    <span className="font-semibold">Rejection note: </span>{u.rejection_note}
                  </div>
                )}

                {/* Actions (only for pending) */}
                {u.status === "pending" && (
                  <div className="space-y-2 pt-1">
                    {rejectingId === u.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={rejectionNotes[u.id] ?? ""}
                          onChange={(e) => setRejectionNotes((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          placeholder="Explain why this update isn't approved (sent to the org)..."
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-red-400 resize-none"
                          style={{ borderColor: "#e5e1d8" }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => reject(u.id)}
                            disabled={saving === u.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: "#dc2626" }}
                          >
                            {saving === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Confirm Rejection
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(u.id)}
                          disabled={saving === u.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                          style={{ backgroundColor: "#1a7a4a" }}
                        >
                          {saving === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Approve & Publish
                        </button>
                        <button
                          onClick={() => setRejectingId(u.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-red-50"
                          style={{ borderColor: "#fca5a5", color: "#dc2626" }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MissionariesAdminTab() {
  const [subTab, setSubTab] = useState<"applications" | "active">("applications");
  const [applications, setApplications] = useState<any[]>([]);
  const [missionaries, setMissionaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBio, setExpandedBio] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const supabase = createClient() as any;
    const [appsRes, msRes] = await Promise.all([
      supabase.from("missionary_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("missionaries").select("*").eq("status", "approved").order("created_at", { ascending: false }),
    ]);
    setApplications(appsRes.data || []);
    setMissionaries(msRes.data || []);
    setLoading(false);
  }

  async function handleApprove(app: any) {
    const supabase = createClient() as any;
    const slug = generateSlug(app.full_name);
    const { error } = await supabase.from("missionaries").insert({
      slug,
      full_name: app.full_name,
      bio: app.bio,
      mission_org: app.mission_org || "",
      country: app.country,
      region: app.region || "",
      photo_url: app.photo_url || "",
      monthly_goal_cents: (app.monthly_goal || 0) * 100,
      monthly_raised_cents: 0,
      status: "approved",
      visible: true,
      featured: false,
    });
    if (!error) {
      await supabase
        .from("missionary_applications")
        .update({ status: "approved", admin_notes: notes[app.id] || "" })
        .eq("id", app.id);
      setMsg(`Approved: ${app.full_name} — profile live at /missionaries/${slug}`);
      loadAll();
    } else {
      setMsg("Error: " + error.message);
    }
  }

  async function handleReject(app: any) {
    if (!confirm(`Reject application from ${app.full_name}?`)) return;
    const supabase = createClient() as any;
    await supabase
      .from("missionary_applications")
      .update({ status: "rejected", admin_notes: notes[app.id] || "" })
      .eq("id", app.id);
    setMsg(`Rejected: ${app.full_name}`);
    loadAll();
  }

  async function toggleMissionaryField(id: string, field: "visible" | "featured", current: boolean) {
    const supabase = createClient() as any;
    await supabase.from("missionaries").update({ [field]: !current }).eq("id", id);
    setMissionaries((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: !current } : m))
    );
  }

  async function handleDeleteMissionary(id: string, name: string) {
    if (!confirm(`Delete missionary ${name}? This cannot be undone.`)) return;
    const supabase = createClient() as any;
    await supabase.from("missionaries").delete().eq("id", id);
    setMsg(`Deleted: ${name}`);
    loadAll();
  }

  const pendingApps = applications.filter((a) => a.status === "pending");

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {msg && (
        <div className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}>
          {msg}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b" style={{ borderColor: "#e5e1d8" }}>
        {(["applications", "active"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${subTab === t ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            style={subTab === t ? { borderColor: "#1a7a4a", color: "#1a7a4a" } : {}}
          >
            {t === "applications" ? `Applications (${pendingApps.length})` : `Active Missionaries (${missionaries.length})`}
          </button>
        ))}
      </div>

      {/* Applications */}
      {subTab === "applications" && (
        <div>
          {pendingApps.length === 0 ? (
            <EmptyState message="No pending applications." />
          ) : (
            <div className="space-y-4">
              {pendingApps.map((app) => (
                <div key={app.id} className="rounded-xl border bg-white p-5" style={{ borderColor: "#e5e1d8" }}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">{app.full_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{app.email}</div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {app.mission_org && (
                          <span className="text-xs text-gray-500">{app.mission_org}</span>
                        )}
                        <span className="text-xs text-gray-500">{app.country}{app.region ? `, ${app.region}` : ""}</span>
                        <span className="text-xs text-gray-400">{formatDate(app.created_at)}</span>
                      </div>
                    </div>
                    {app.photo_url && (
                      <img src={app.photo_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                    )}
                  </div>

                  <div className="mb-3">
                    <p className={`text-sm text-gray-600 leading-relaxed ${expandedBio === app.id ? "" : "line-clamp-3"}`}>
                      {app.bio}
                    </p>
                    {app.bio.length > 200 && (
                      <button
                        onClick={() => setExpandedBio(expandedBio === app.id ? null : app.id)}
                        className="text-xs mt-1 hover:underline"
                        style={{ color: "#1a7a4a" }}
                      >
                        {expandedBio === app.id ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Admin Notes</label>
                    <input
                      type="text"
                      value={notes[app.id] || ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [app.id]: e.target.value }))}
                      placeholder="Internal notes..."
                      className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none focus:border-green-600"
                      style={{ borderColor: "#e5e1d8" }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(app)}
                      className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white"
                      style={{ backgroundColor: "#1a7a4a" }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(app)}
                      className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active missionaries */}
      {subTab === "active" && (
        <div>
          {missionaries.length === 0 ? (
            <EmptyState message="No approved missionaries yet." />
          ) : (
            <div className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: "#e5e1d8" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500 font-medium" style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}>
                    <th className="px-4 py-3">Missionary</th>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Monthly</th>
                    <th className="px-4 py-3">Visible</th>
                    <th className="px-4 py-3">Featured</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {missionaries.map((m, i) => (
                    <tr
                      key={m.id}
                      className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                      style={{ borderColor: "#f5f3ef" }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {m.photo_url ? (
                            <img src={m.photo_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#1a7a4a" }}>
                              {m.full_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 text-xs">{m.full_name}</div>
                            <div className="text-xs text-gray-400 font-mono">{m.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {m.country}{m.region ? `, ${m.region}` : ""}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {m.monthly_goal_cents > 0 ? (
                          <span>
                            ${Math.round(m.monthly_raised_cents / 100)} / ${Math.round(m.monthly_goal_cents / 100)}/mo
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Pill
                          on={m.visible}
                          onLabel="Visible"
                          offLabel="Hidden"
                          onClick={() => toggleMissionaryField(m.id, "visible", m.visible)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Pill
                          on={m.featured}
                          onLabel="Featured"
                          offLabel="—"
                          onClick={() => toggleMissionaryField(m.id, "featured", m.featured)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/missionaries/${m.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium hover:underline"
                            style={{ color: "#1a7a4a" }}
                          >
                            View
                          </a>
                          <button
                            onClick={() => handleDeleteMissionary(m.id, m.full_name)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

function AuditLogTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient() as any;
      const { data } = await supabase
        .from("audit_log")
        .select("id, user_id, action, table_name, record_id, ip_address, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      setEntries(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter
    ? entries.filter((e) => e.action?.toLowerCase().includes(filter.toLowerCase()))
    : entries;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by action..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600"
            style={{ borderColor: "#e5e1d8" }}
          />
        </div>
        <span className="text-xs text-gray-400">{filtered.length} entries</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No audit log entries yet." />
      ) : (
        <div className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: "#e5e1d8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 font-medium" style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`border-b text-xs ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  style={{ borderColor: "#f5f3ef" }}
                >
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap font-mono">
                    {new Date(entry.created_at).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-gray-900">{entry.action}</td>
                  <td className="px-4 py-2.5 text-gray-500">{entry.table_name || "—"}</td>
                  <td className="px-4 py-2.5 text-gray-400 font-mono">
                    {entry.ip_address ? entry.ip_address.slice(0, 15) + (entry.ip_address.length > 15 ? "…" : "") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RoadmapTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Upcoming features planned for EasyToGive.</p>
      {ROADMAP_ITEMS.map((item) => {
        const isOpen = expanded === item.id;
        return (
          <div
            key={item.id}
            className="rounded-xl border bg-white overflow-hidden"
            style={{ borderColor: "#e5e7eb" }}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : item.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                >
                  Coming Soon
                </span>
                <span className="font-semibold text-gray-900">{item.title}</span>
              </div>
              <ChevronDown
                className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 border-t" style={{ borderColor: "#f3f4f6" }}>
                <p className="text-sm text-gray-700 mt-4 mb-3">{item.summary}</p>
                <ul className="space-y-1.5">
                  {item.details.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-sm text-gray-500">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#1a7a4a" }} />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Navigation Tab ───────────────────────────────────────────────────────────

function NavLinksTab() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await (createClient() as any)
      .from("nav_links")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setLinks(data);
    setLoading(false);
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...links];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setLinks(next);
  }

  function toggleVisible(index: number) {
    setLinks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, visible: !l.visible } : l))
    );
  }

  async function save() {
    setSaving(true);
    const supabase = createClient() as any;
    await Promise.all(
      links.map((l, i) =>
        supabase
          .from("nav_links")
          .update({ sort_order: i, visible: l.visible })
          .eq("id", l.id)
      )
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4 max-w-md">
      <p className="text-sm text-gray-500">
        Drag to reorder or use the arrows. Toggle visibility to show/hide a link in the top bar.
      </p>

      <div className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: "#e5e7eb" }}>
        {links
          .filter((l) => l.href !== "/missionaries" && l.href !== "#explore" && l.href !== "/politics")
          .map((link) => {
            const actualIdx = links.findIndex((l) => l.id === link.id);
            return (
              <div key={link.id}>
                <div
                  className="flex items-center gap-3 px-4 py-3 border-b"
                  style={{ borderColor: "#f3f4f6", opacity: link.visible ? 1 : 0.45 }}
                >
                  {/* Up/down */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => move(actualIdx, -1)}
                      disabled={actualIdx === 0}
                      className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 transition-colors"
                      aria-label="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button
                      onClick={() => move(actualIdx, 1)}
                      disabled={actualIdx === links.length - 1}
                      className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 transition-colors"
                      aria-label="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>

                  {/* Order badge */}
                  <span className="w-5 text-xs font-mono text-gray-300 flex-shrink-0">{actualIdx + 1}</span>

                  {/* Label + href */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">{link.label}</div>
                    <div className="text-xs text-gray-400 font-mono">{link.href}</div>
                  </div>

                  {/* Visible toggle */}
                  <button
                    onClick={() => toggleVisible(actualIdx)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors flex-shrink-0 ${
                      link.visible
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {link.visible ? "Visible" : "Hidden"}
                  </button>
                </div>

              </div>
            );
          })}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-colors"
        style={{ backgroundColor: "#1a7a4a" }}
      >
        {saving ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
        ) : saved ? (
          <><Check className="w-3.5 h-3.5" /> Saved</>
        ) : (
          "Save Order"
        )}
      </button>
    </div>
  );
}

// ─── VideoSection ─────────────────────────────────────────────────────────────

function VideoSection({
  videoUrl,
  videoType,
  showVideo,
  onChangeUrl,
  onToggleShow,
  coverUrl,
}: {
  videoUrl: string;
  videoType: string;
  showVideo: boolean;
  onChangeUrl: (url: string, type: string) => void;
  onToggleShow: (v: boolean) => void;
  coverUrl: string;
}) {
  const [mode, setMode] = useState<"link" | "upload">(videoType === "upload" ? "upload" : "link");
  const [linkInput, setLinkInput] = useState(videoType !== "upload" ? videoUrl : "");
  const [linkError, setLinkError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function detectType(url: string): "youtube" | "vimeo" | null {
    if (/youtu\.be\/|youtube\.com/i.test(url)) return "youtube";
    if (/vimeo\.com/i.test(url)) return "vimeo";
    return null;
  }

  function getYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/)([^&\n?#]+)/,
      /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  function handleLinkSave() {
    const trimmed = linkInput.trim();
    if (!trimmed) { onChangeUrl("", ""); setLinkError(""); return; }
    const type = detectType(trimmed);
    if (!type) {
      setLinkError("Please enter a valid YouTube or Vimeo URL");
      return;
    }
    setLinkError("");
    onChangeUrl(trimmed, type);
  }

  async function handleFileUpload(file: File) {
    if (file.size > 100 * 1024 * 1024) {
      alert("File exceeds 100MB limit.");
      return;
    }
    setUploading(true);
    setUploadProgress(10);
    try {
      const supabase = createClient() as any;
      const ext = file.name.split(".").pop() ?? "mp4";
      const path = `org-videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("videos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      setUploadProgress(80);
      if (!error) {
        const { data } = supabase.storage.from("videos").getPublicUrl(path);
        onChangeUrl(data.publicUrl, "upload");
        setUploadProgress(100);
      } else {
        alert("Upload error: " + error.message);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  const ytId = videoType === "youtube" ? getYouTubeId(videoUrl) : null;
  const inputCls = "w-full mt-1 px-3 py-2 rounded-lg border text-sm text-gray-900 outline-none focus:border-green-600 transition-colors bg-white";
  const inputStyle = { borderColor: "#e5e7eb" };

  return (
    <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: "#e5e7eb", backgroundColor: "#f9fafb" }}>
      {/* Heading */}
      <div className="flex items-center gap-2">
        <Film className="w-4 h-4 text-gray-500" />
        <span className="font-display font-bold text-gray-900" style={{ fontSize: 16 }}>Video</span>
      </div>

      {/* Show video toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Toggle
            checked={showVideo}
            onChange={onToggleShow}
            label="Show video on public profile"
          />
          <p className="text-xs text-gray-400 mt-1 ml-0">Turn this on once your video is added and ready to show.</p>
        </div>
      </div>

      {/* Source selector */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Video Source</p>
        <div className="flex gap-2">
          {(["link", "upload"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
              style={
                mode === m
                  ? { backgroundColor: "white", borderColor: "#1a7a4a", color: "#1a7a4a" }
                  : { borderColor: "#e5e7eb", color: "#6b7280" }
              }
            >
              {m === "link" ? "YouTube / Vimeo Link" : "Upload from Computer"}
            </button>
          ))}
        </div>
      </div>

      {/* Link input */}
      {mode === "link" && (
        <div>
          <input
            type="url"
            className={inputCls}
            style={inputStyle}
            placeholder="Paste a YouTube or Vimeo URL..."
            value={linkInput}
            onChange={(e) => { setLinkInput(e.target.value); setLinkError(""); }}
            onBlur={handleLinkSave}
          />
          <p className="text-xs text-gray-400 mt-1">
            e.g. https://www.youtube.com/watch?v=... or https://vimeo.com/...
          </p>
          {linkError && <p className="text-xs text-red-500 mt-1">{linkError}</p>}
          {/* YouTube thumbnail preview */}
          {ytId && !linkError && (
            <div className="mt-2">
              <img
                src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt="YouTube thumbnail"
                className="w-32 h-20 object-cover rounded-lg border"
                style={{ borderColor: "#e5e7eb" }}
              />
            </div>
          )}
          {videoUrl && videoType === "vimeo" && !linkError && (
            <p className="text-xs mt-1" style={{ color: "#1a7a4a" }}>Vimeo video set.</p>
          )}
          <button
            type="button"
            onClick={handleLinkSave}
            className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Save Video
          </button>
        </div>
      )}

      {/* Upload input */}
      {mode === "upload" && (
        <div>
          {videoUrl && videoType === "upload" ? (
            <div className="flex items-center gap-3">
              <video
                src={videoUrl}
                className="w-32 h-20 object-cover rounded-lg border"
                style={{ borderColor: "#e5e7eb" }}
                poster={coverUrl || undefined}
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs font-medium hover:underline"
                  style={{ color: "#1a7a4a" }}
                >
                  Replace Video
                </button>
                <button
                  type="button"
                  onClick={() => onChangeUrl("", "")}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Remove Video
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ borderColor: "#e5e1d8", borderStyle: "dashed" }}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
              {uploading ? `Uploading... ${uploadProgress}%` : "Choose a video file"}
            </button>
          )}
          {uploading && (
            <div className="mt-2 w-full h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%`, backgroundColor: "#1a7a4a" }}
              />
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">MP4, MOV, or WebM recommended · Max 100MB</p>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: videoUrl ? "#1a7a4a" : "#d1d5db" }}
        />
        {videoUrl ? (
          <>
            Video added
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline ml-1"
              style={{ color: "#1a7a4a" }}
            >
              Preview
            </a>
          </>
        ) : (
          "No video added"
        )}
      </div>
    </div>
  );
}

// ─── Org Applications Tab ─────────────────────────────────────────────────────

type AppStatus = "pending" | "approved" | "rejected";

interface OrgApplication {
  id: string;
  org_name: string;
  contact_name: string;
  email: string;
  website: string;
  ein: string;
  category: string;
  subcategory: string;
  description: string;
  status: AppStatus;
  admin_notes: string;
  created_at: string;
  reviewed_at: string | null;
}

function OrgApplicationsTab({ onCreateOrg }: { onCreateOrg?: (app: OrgApplication) => void }) {
  const [apps, setApps] = useState<OrgApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AppStatus | "all">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionWarning, setActionWarning] = useState<string | null>(null);
  // Track which approved applications have their org already made visible
  const [visibleOrgs, setVisibleOrgs] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/org/applications");
    const data = await res.json();
    const list: OrgApplication[] = data.applications ?? [];
    setApps(list);

    // Check which approved apps already have their org visible
    const approvedEmails = list
      .filter((a) => a.status === "approved")
      .map((a) => a.email);
    if (approvedEmails.length > 0) {
      const supabase = createClient() as any;
      const { data: visibleOrgRows } = await supabase
        .from("organizations")
        .select("contact_email, visible")
        .in("contact_email", approvedEmails);
      const vMap: Record<string, boolean> = {};
      for (const row of visibleOrgRows ?? []) {
        if (row.visible) {
          const app = list.find((a) => a.email === row.contact_email);
          if (app) vMap[app.id] = true;
        }
      }
      setVisibleOrgs(vMap);
    }

    // Pre-fill notes textarea with existing admin_notes
    const n: Record<string, string> = {};
    list.forEach((a) => { n[a.id] = a.admin_notes ?? ""; });
    setNotes(n);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: AppStatus) {
    setSaving(id);
    setActionError(null);
    setActionWarning(null);
    const res = await fetch("/api/org/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, admin_notes: notes[id] ?? "" }),
    });
    const json = await res.json();
    if (!res.ok && res.status !== 207) {
      setActionError(json.error ?? "Failed to update application. Please try again.");
    } else {
      if (json.warning) setActionWarning(json.warning);
      setApps((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status, admin_notes: notes[id] ?? "" } : a))
      );
    }
    setSaving(null);
  }

  async function saveNotes(id: string) {
    setSaving(id + "_notes");
    await fetch("/api/org/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, admin_notes: notes[id] ?? "" }),
    });
    setSaving(null);
  }

  async function makeOrgVisible(app: OrgApplication) {
    setSaving(app.id + "_visible");
    const supabase = createClient() as any;
    // Find the org record that was created when this application was approved
    const { data: org } = await supabase
      .from("organizations")
      .select("id, visible")
      .eq("contact_email", app.email)
      .maybeSingle();

    if (!org) {
      alert("No organization found for this application. It may not have been created yet.");
      setSaving(null);
      return;
    }

    const { error } = await supabase
      .from("organizations")
      .update({ visible: true })
      .eq("id", org.id);

    if (error) {
      alert("Failed to make org visible: " + error.message);
    } else {
      setVisibleOrgs((prev) => ({ ...prev, [app.id]: true }));
    }
    setSaving(null);
  }

  const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const counts = {
    all: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  const statusStyle: Record<AppStatus, { bg: string; text: string }> = {
    pending:  { bg: "#eff6ff", text: "#1d4ed8" },
    approved: { bg: "#e8f5ee", text: "#1a7a4a" },
    rejected: { bg: "#fef2f2", text: "#dc2626" },
  };

  if (loading) return <Spinner />;
  if (apps.length === 0) return <EmptyState message="No org applications yet." />;

  return (
    <div className="space-y-4 py-4">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
            style={
              filter === f
                ? { backgroundColor: "#1a7a4a", color: "white", borderColor: "#1a7a4a" }
                : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
            }
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Action error / warning banners */}
      {actionError && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
        </div>
      )}
      {actionWarning && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
          <span className="flex-1">⚠️ {actionWarning}</span>
          <button onClick={() => setActionWarning(null)} className="text-yellow-500 hover:text-yellow-700 flex-shrink-0">✕</button>
        </div>
      )}

      {filtered.length === 0 && (
        <EmptyState message={`No ${filter} applications.`} />
      )}

      {filtered.map((app) => {
        const isExpanded = expanded === app.id;
        const ss = statusStyle[app.status];
        return (
          <div
            key={app.id}
            className="border rounded-xl overflow-hidden"
            style={{ borderColor: "#e5e7eb" }}
          >
            {/* Row header */}
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : app.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: ss.bg, color: ss.text }}
                >
                  {app.status}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{app.org_name}</p>
                  <p className="text-xs text-gray-500 truncate">{app.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400">{formatDate(app.created_at)}</span>
                <ChevronDown
                  className="w-4 h-4 text-gray-400 transition-transform"
                  style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t space-y-4" style={{ borderColor: "#e5e7eb" }}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-3 text-sm">
                  {[
                    ["Contact", app.contact_name],
                    ["Email", app.email],
                    ["Website", app.website || "—"],
                    ["EIN", app.ein || "—"],
                    ["Category", [app.category, app.subcategory].filter(Boolean).join(" › ")],
                    ["Submitted", formatDate(app.created_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="text-xs font-medium text-gray-500 block">{label}</span>
                      <span className="text-gray-900 break-all">{value}</span>
                    </div>
                  ))}
                </div>

                {app.description && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">Description</span>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{app.description}</p>
                  </div>
                )}

                {/* Admin notes */}
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Admin notes</label>
                  <textarea
                    value={notes[app.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-600 resize-none"
                    style={{ borderColor: "#e5e1d8" }}
                    placeholder="Internal notes…"
                  />
                  <button
                    onClick={() => saveNotes(app.id)}
                    disabled={saving === app.id + "_notes"}
                    className="mt-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    {saving === app.id + "_notes" ? "Saving…" : "Save notes"}
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                {app.status !== "approved" && (
                  <button
                    onClick={() => updateStatus(app.id, "approved")}
                    disabled={saving === app.id}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    {saving === app.id ? "Saving…" : "Approve"}
                  </button>
                )}
                {app.status === "approved" && onCreateOrg && (
                  <button
                    onClick={() => onCreateOrg(app)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                  >
                    Create Org →
                  </button>
                )}
                {app.status === "approved" && (
                  visibleOrgs[app.id] ? (
                    <span
                      className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"
                      style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                    >
                      <Check className="w-3.5 h-3.5" /> Live
                    </span>
                  ) : (
                    <button
                      onClick={() => makeOrgVisible(app)}
                      disabled={saving === app.id + "_visible"}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                      style={{ backgroundColor: "#0d1117", color: "white" }}
                    >
                      {saving === app.id + "_visible" ? "Publishing…" : "Make Live →"}
                    </button>
                  )
                )}
                {app.status !== "rejected" && (
                  <button
                    onClick={() => updateStatus(app.id, "rejected")}
                    disabled={saving === app.id}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
                  >
                    {saving === app.id ? "Saving…" : "Reject"}
                  </button>
                )}
                {app.status !== "pending" && (
                  <button
                    onClick={() => updateStatus(app.id, "pending")}
                    disabled={saving === app.id}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50"
                    style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
                  >
                    Reset to Pending
                  </button>
                )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────────

interface Props {
  editOrgId?: string;
}

export default function AdminPanel({ editOrgId }: Props = {}) {
  const [activeAdminTab, setActiveAdminTab] = useState("edit");
  const [orgs, setOrgs] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"ok" | "err">("ok");
  const [autofillUrl, setAutofillUrl] = useState("");
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState("");
  const [displaySettings, setDisplaySettings] = useState({ ...DEFAULT_DISPLAY_SETTINGS });

  useEffect(() => {
    loadOrgs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editOrgId && orgs.length > 0) {
      const target = orgs.find((o) => o.id === editOrgId);
      if (target) handleEdit(target);
    }
  }, [editOrgId, orgs]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadOrgs() {
    const { data } = await createClient()
      .from("organizations")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setOrgs(data);
  }

  function setMsg(text: string, type: "ok" | "err" = "ok") {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4000);
  }

  async function handleSubmit() {
    const supabase = createClient();
    if (!form.name || !form.id) return setMsg("Name and ID are required.", "err");
    const ourStory = typeof form.our_story === "string" ? form.our_story.trim() : "";
    if (ourStory.length > 1000) {
      return setMsg("Our Story must be 1000 characters or less.", "err");
    }
    const payload = {
      ...form,
      tags: Array.isArray(form.tags) ? form.tags : [],
      recommended_orgs: Array.isArray(form.recommended_orgs) ? form.recommended_orgs : [],
      our_story: ourStory || null,
    };
    if (editing) {
      const { error } = await (supabase as any).from("organizations").update(payload).eq("id", editing);
      if (error) return setMsg("Error: " + error.message, "err");
    } else {
      const { error } = await (supabase as any).from("organizations").insert([payload]);
      if (error) return setMsg("Error: " + error.message, "err");
    }
    try {
      await (supabase as any).from("org_display_settings").upsert({ org_id: form.id, ...displaySettings });
    } catch {}
    setMsg(editing ? "Organization updated!" : "Organization added!");
    setForm({ ...EMPTY_FORM });
    setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS });
    setEditing(null);
    loadOrgs();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this organization?")) return;
    await createClient().from("organizations").delete().eq("id", id);
    setMsg("Deleted.");
    loadOrgs();
  }

  async function handleEdit(org: any) {
    setForm({
      ...org,
      tags: org.tags ?? [],
      recommended_orgs: org.recommended_orgs ?? [],
      sort_order: org.sort_order ?? 0,
      contact_email: org.contact_email ?? "",
      video_url: org.video_url ?? "",
      video_type: org.video_type ?? "",
      show_video: org.show_video ?? false,
      our_story: org.our_story ?? "",
    });
    setEditing(org.id);
    setActiveAdminTab("edit");
    try {
      const { data } = await (createClient() as any)
        .from("org_display_settings").select("*").eq("org_id", org.id).single();
      setDisplaySettings(data ? { ...DEFAULT_DISPLAY_SETTINGS, ...data } : { ...DEFAULT_DISPLAY_SETTINGS });
    } catch {
      setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS });
    }
    document.getElementById("admin-form-top")?.scrollIntoView({ behavior: "smooth" });
  }

  function toggleRecommended(orgId: string) {
    setForm((prev: any) => {
      const current: string[] = prev.recommended_orgs ?? [];
      return {
        ...prev,
        recommended_orgs: current.includes(orgId)
          ? current.filter((id: string) => id !== orgId)
          : [...current, orgId],
      };
    });
  }

  async function handleAutofill() {
    if (!autofillUrl) return;
    setAutofilling(true);
    setAutofillError("");
    try {
      const res = await fetch("/api/autofill-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: autofillUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Autofill failed");
      setForm((prev: any) => ({
        ...prev,
        name: data.name ?? prev.name,
        tagline: data.tagline ?? prev.tagline,
        description: data.description ?? prev.description,
        category: data.category ?? prev.category,
        location: data.location ?? prev.location,
        ein: data.ein ?? prev.ein,
        founded: data.founded ?? prev.founded,
        website: data.website ?? prev.website,
        tags: data.tags?.length ? data.tags : prev.tags,
      }));
    } catch (err: any) {
      setAutofillError(err.message ?? "Something went wrong.");
    } finally {
      setAutofilling(false);
    }
  }

  const otherOrgs = orgs.filter((o) => o.id !== editing);
  const inputCls = "w-full mt-1 px-3 py-2 rounded-lg border text-sm text-gray-900 outline-none focus:border-green-600 transition-colors bg-white";
  const inputStyle = { borderColor: "#e5e7eb" };
  const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wide";

  return (
    <div className="space-y-6">
      {/* Status message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium border ${
            messageType === "err"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-0 border-b overflow-x-auto" style={{ borderColor: "#e5e7eb" }}>
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeAdminTab === tab.id
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Ordering tab ── */}
      {activeAdminTab === "ordering" && <OrgOrderingTab />}

      {/* ── Organizations tab ── */}
      {activeAdminTab === "orgs" && <OrgsTab onEdit={handleEdit} />}

      {/* ── Users tab ── */}
      {activeAdminTab === "users" && <UsersTab />}

      {/* ── Waitlist tab ── */}
      {activeAdminTab === "waitlist" && <WaitlistTab />}

      {/* ── Applications tab ── */}
      {activeAdminTab === "applications" && (
        <OrgApplicationsTab
          onCreateOrg={(app) => {
            setForm({
              ...EMPTY_FORM,
              name: app.org_name,
              ein: app.ein ?? "",
              website: app.website ?? "",
              category: app.category ?? "community",
              subcategory: app.subcategory ?? "",
              description: app.description ?? "",
              contact_email: app.email ?? "",
            });
            setEditing(null);
            setActiveAdminTab("edit");
            setTimeout(() => {
              document.getElementById("admin-form-top")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
        />
      )}

      {/* ── Impact Reviews tab ── */}
      {activeAdminTab === "impact" && <ImpactReviewTab />}

      {/* ── Missionaries tab ── */}
      {activeAdminTab === "missionaries" && <MissionariesAdminTab />}

      {/* ── Navigation tab ── */}
      {activeAdminTab === "navigation" && <NavLinksTab />}

      {/* ── Roadmap tab ── */}
      {activeAdminTab === "roadmap" && <RoadmapTab />}

      {/* ── Audit Log tab ── */}
      {activeAdminTab === "audit" && <AuditLogTab />}

      {/* ── Add / Edit Form tab ── */}
      {activeAdminTab === "edit" && (
        <div id="admin-form-top" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              {editing ? "Editing organization" : "Add new organization"}
            </h2>
            {editing && (
              <span className="text-sm text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
                ID: {editing}
              </span>
            )}
          </div>

          {/* AI Autofill */}
          <div className="p-4 rounded-xl border bg-gray-50" style={{ borderColor: "#e5e7eb" }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              ✨ Autofill with AI
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-lg border text-sm text-gray-900 outline-none focus:border-green-600 bg-white"
                style={{ borderColor: "#e5e7eb" }}
                placeholder="https://example-nonprofit.org"
                value={autofillUrl}
                onChange={(e) => setAutofillUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAutofill()}
                disabled={autofilling}
              />
              <button
                onClick={handleAutofill}
                disabled={autofilling || !autofillUrl}
                className="px-4 py-2 rounded-lg font-semibold text-sm text-white flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                {autofilling ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Analyzing…
                  </>
                ) : "Autofill"}
              </button>
            </div>
            {autofillError && <p className="mt-2 text-sm text-red-500">{autofillError}</p>}
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ["ID (url-slug)", "id"], ["Name", "name"], ["Tagline", "tagline"],
              ["Location", "location"], ["EIN", "ein"], ["Website", "website"],
              ["Contact Email", "contact_email"],
            ].map(([label, key]) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form[key] || ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  disabled={editing !== null && key === "id"}
                />
              </div>
            ))}

            <div>
              <label className={labelCls}>Founded Year</label>
              <input type="number" className={inputCls} style={inputStyle}
                value={form.founded || ""} onChange={(e) => setForm({ ...form, founded: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Goal ($)</label>
              <input type="number" className={inputCls} style={inputStyle}
                value={form.goal || ""} onChange={(e) => setForm({ ...form, goal: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input type="number" className={inputCls} style={inputStyle}
                value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} style={inputStyle}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: "" })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                ))}
              </select>
            </div>
            {form.category && (SUBCATEGORY_OPTIONS[form.category as TopCategory] ?? []).length > 0 && (
              <div>
                <label className={labelCls}>Subcategory</label>
                <select className={inputCls} style={inputStyle}
                  value={form.subcategory || ""}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}>
                  <option value="">— select —</option>
                  {(SUBCATEGORY_OPTIONS[form.category as TopCategory] ?? []).map((s) => (
                    <option key={s} value={s}>{CATEGORY_LABELS[s] ?? s}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Tags (comma separated)</label>
              <input className={inputCls} style={inputStyle}
                value={(form.tags || []).join(", ")}
                onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean) })} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} h-28 resize-none`}
              style={inputStyle}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Our Story */}
          <div>
            <label className={labelCls}>Our Story</label>
            <p className="text-xs text-gray-500 -mt-1 mb-2">
              Tell donors who you are, why you exist, and what drives your mission. This appears on your organization card and profile page.
            </p>
            <textarea
              rows={6}
              maxLength={1000}
              placeholder="We started in 2018 when our founder saw a need in the community..."
              className={`${inputCls} resize-none`}
              style={inputStyle}
              value={form.our_story || ""}
              onChange={(e) => setForm({ ...form, our_story: e.target.value })}
            />
            {(() => {
              const len = String(form.our_story || "").length;
              const warn = len > 900;
              return (
                <div
                  className="text-xs mt-2"
                  style={{ color: warn ? "#dc2626" : "#6b7280" }}
                >
                  {len} / 1000 characters
                </div>
              );
            })()}
          </div>

          {/* Image upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ImageUpload
              label="Card Image"
              hint="Square/portrait — shown in org cards"
              aspect="aspect-square"
              maxHeight={180}
              value={form.image_url || ""}
              onChange={(url) => setForm({ ...form, image_url: url })}
            />
            <ImageUpload
              label="Cover / Banner Image"
              hint="Wide banner shown at top of org page"
              aspect="aspect-video"
              maxHeight={120}
              value={form.cover_url || ""}
              onChange={(url) => setForm({ ...form, cover_url: url })}
            />
          </div>

          {/* Video Settings */}
          <VideoSection
            videoUrl={form.video_url || ""}
            videoType={form.video_type || ""}
            showVideo={form.show_video || false}
            onChangeUrl={(url, type) => setForm((f: any) => ({ ...f, video_url: url, video_type: type }))}
            onToggleShow={(v) => setForm((f: any) => ({ ...f, show_video: v }))}
            coverUrl={form.cover_url || ""}
          />

          {/* Toggles */}
          <div className="flex gap-8 items-center py-2">
            <Toggle
              checked={form.verified || false}
              onChange={(v) => setForm({ ...form, verified: v })}
              label="Verified"
            />
            <Toggle
              checked={form.featured || false}
              onChange={(v) => setForm({ ...form, featured: v })}
              label="Featured on Homepage"
            />
          </div>

          {/* Recommended orgs */}
          {otherOrgs.length > 0 && (
            <div>
              <label className={`${labelCls} mb-2`}>
                We Recommend (select orgs to show on this org&apos;s page)
              </label>
              <div
                className="max-h-48 overflow-y-auto rounded-xl border p-3 grid grid-cols-2 gap-2"
                style={{ borderColor: "#e5e7eb", backgroundColor: "#f9fafb" }}
              >
                {otherOrgs.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-green-700 transition-colors">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 accent-green-600 flex-shrink-0"
                      checked={(form.recommended_orgs ?? []).includes(o.id)}
                      onChange={() => toggleRecommended(o.id)}
                    />
                    <span className="truncate text-gray-700">{o.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {(form.recommended_orgs ?? []).length} selected
              </p>
            </div>
          )}

          {/* Display Settings */}
          <div className="rounded-xl border p-4" style={{ borderColor: "#e5e7eb", backgroundColor: "#f9fafb" }}>
            <p className={`${labelCls} mb-3`}>Display Settings — control what appears on the public page</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                ["show_raised", "Show raised amount"],
                ["show_goal", "Show goal & progress bar"],
                ["show_donors", "Show donor count"],
                ["show_impact_stats", "Show impact stats"],
                ["show_recommendations", "Show \"We Recommend\""],
                ["show_related_orgs", "Show related orgs"],
              ] as [keyof typeof DEFAULT_DISPLAY_SETTINGS, string][]).map(([key, label]) => (
                <Toggle
                  key={key}
                  checked={displaySettings[key]}
                  onChange={(v) => setDisplaySettings((prev) => ({ ...prev, [key]: v }))}
                  label={label}
                />
              ))}
              <Toggle
                checked={form.show_video || false}
                onChange={(v) => setForm((f: any) => ({ ...f, show_video: v }))}
                label="Show Video"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              {editing ? "Save Changes" : "Add Organization"}
            </button>
            {editing && (
              <button
                onClick={() => window.open(`/org/${editing}`, "_blank")}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold border text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                style={{ borderColor: "#e5e7eb" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Preview
              </button>
            )}
            {editing && (
              <button
                onClick={() => { setForm({ ...EMPTY_FORM }); setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS }); setEditing(null); }}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Compact org list in edit tab */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              All Organizations ({orgs.length})
            </h2>
            <div className="overflow-x-auto rounded-xl border shadow-sm" style={{ borderColor: "#e5e7eb" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-400 text-xs uppercase tracking-wide bg-gray-50" style={{ borderColor: "#e5e7eb" }}>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Location</th>
                    <th className="text-center px-4 py-3">Verified</th>
                    <th className="text-center px-4 py-3">Featured</th>
                    <th className="text-center px-4 py-3 w-20">Sort</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <tr
                      key={org.id}
                      className="border-b hover:bg-gray-50 transition-colors bg-white"
                      style={{ borderColor: "#f3f4f6" }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {org.image_url ? (
                            <img src={org.image_url} alt=""
                              className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-gray-100 flex-shrink-0" />
                          )}
                          <span className="font-medium text-gray-900">{org.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{org.category}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate hidden md:table-cell">{org.location}</td>
                      <td className="px-4 py-3 text-center">{org.verified ? "✅" : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => (createClient() as any).from("organizations").update({ featured: !org.featured }).eq("id", org.id).then(loadOrgs)}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${org.featured ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                        >
                          {org.featured ? "Yes" : "No"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          className="w-14 text-center border rounded px-1 py-0.5 text-xs outline-none focus:border-green-500"
                          style={{ borderColor: "#e5e7eb" }}
                          defaultValue={org.sort_order ?? 0}
                          onBlur={(e) => (createClient() as any).from("organizations").update({ sort_order: Number(e.target.value) }).eq("id", org.id).then(loadOrgs)}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(org)}
                            className="px-3 py-1.5 border rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                            style={{ borderColor: "#bfdbfe" }}>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(org.id)}
                            className="px-3 py-1.5 border rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            style={{ borderColor: "#fecaca" }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
