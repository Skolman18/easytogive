"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import Toggle from "@/components/Toggle";
import OrgOrderingTab from "@/components/OrgOrderingTab";
import ImageUpload from "@/components/ImageUpload";

const CATEGORIES = [
  "nonprofits", "education", "environment",
  "churches", "animal-rescue", "local",
];

const EMPTY_FORM = {
  id: "", name: "", tagline: "", description: "",
  category: "nonprofits", location: "", ein: "",
  founded: 2020, website: "", goal: 50000,
  tags: [] as string[], verified: false, featured: false,
  image_url: "", cover_url: "", sort_order: 0,
  recommended_orgs: [] as string[],
  contact_email: "",
};

const DEFAULT_DISPLAY_SETTINGS = {
  show_goal: false,
  show_donors: false,
  show_raised: false,
  show_recommendations: false,
  show_impact_stats: false,
  show_related_orgs: false,
};

const ADMIN_TABS = [
  { id: "edit", label: "Add / Edit Org" },
  { id: "ordering", label: "Ordering & Visibility" },
];

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
    const payload = {
      ...form,
      tags: Array.isArray(form.tags) ? form.tags : [],
      recommended_orgs: Array.isArray(form.recommended_orgs) ? form.recommended_orgs : [],
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
      <div className="flex gap-1 border-b" style={{ borderColor: "#e5e7eb" }}>
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeAdminTab === tab.id
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Ordering & Visibility tab ── */}
      {activeAdminTab === "ordering" && <OrgOrderingTab />}

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
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
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

          {/* Image upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ImageUpload
              label="Card Image"
              hint="Square/portrait — shown in org cards"
              aspect="aspect-square"
              value={form.image_url || ""}
              onChange={(url) => setForm({ ...form, image_url: url })}
            />
            <ImageUpload
              label="Cover / Banner Image"
              hint="Wide banner shown at top of org page"
              aspect="aspect-video"
              value={form.cover_url || ""}
              onChange={(url) => setForm({ ...form, cover_url: url })}
            />
          </div>

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

          {/* Org Table */}
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
                  {orgs.map((org, i) => (
                    <tr
                      key={org.id}
                      className={`border-b hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
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

          {/* Migration reminder */}
          <div className="p-4 rounded-xl border text-sm" style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}>
            <p className="font-semibold mb-1">DB migrations required</p>
            <p className="text-xs mb-2 text-amber-700">Run in Supabase Dashboard → SQL Editor:</p>
            <pre className="text-xs bg-amber-50 p-2 rounded overflow-x-auto border border-amber-200">
{`-- Organizations columns
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS recommended_orgs text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT '';

-- Display settings (all default false)
CREATE TABLE IF NOT EXISTS org_display_settings (
  org_id text primary key references organizations(id) on delete cascade,
  show_goal boolean DEFAULT false,
  show_donors boolean DEFAULT false,
  show_raised boolean DEFAULT false,
  show_recommendations boolean DEFAULT false,
  show_impact_stats boolean DEFAULT false,
  show_related_orgs boolean DEFAULT false
);

-- User location fields
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS state text DEFAULT '',
  ADD COLUMN IF NOT EXISTS zip text DEFAULT '',
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- Recurring donations
CREATE TABLE IF NOT EXISTS recurring_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  org_id text NOT NULL,
  org_name text NOT NULL,
  amount_cents integer NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly','yearly')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  next_charge_at timestamptz
);

-- Site settings (editable homepage content)
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
