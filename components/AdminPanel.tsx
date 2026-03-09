"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

const CATEGORIES = [
  "nonprofits", "education", "health", "environment",
  "arts", "community", "animals", "international",
  "churches", "animal-rescue", "local",
];

const EMPTY_FORM = {
  id: "", name: "", tagline: "", description: "",
  category: "nonprofits", location: "", ein: "",
  founded: 2020, website: "", goal: 50000,
  tags: [] as string[], verified: false, featured: false,
  image_url: "", sort_order: 0,
  recommended_orgs: [] as string[],
};

export default function AdminPanel() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"ok" | "err">("ok");
  const [autofillUrl, setAutofillUrl] = useState("");
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState("");

  useEffect(() => { loadOrgs(); }, []);

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
      setMsg("Organization updated!");
    } else {
      const { error } = await (supabase as any).from("organizations").insert([payload]);
      if (error) return setMsg("Error: " + error.message, "err");
      setMsg("Organization added!");
    }
    setForm({ ...EMPTY_FORM });
    setEditing(null);
    loadOrgs();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this organization?")) return;
    await createClient().from("organizations").delete().eq("id", id);
    setMsg("Deleted.");
    loadOrgs();
  }

  async function handleToggleFeatured(org: any) {
    await (createClient() as any).from("organizations")
      .update({ featured: !org.featured })
      .eq("id", org.id);
    loadOrgs();
  }

  async function handleSortOrder(org: any, val: number) {
    await (createClient() as any).from("organizations")
      .update({ sort_order: val })
      .eq("id", org.id);
    loadOrgs();
  }

  function handleEdit(org: any) {
    setForm({
      ...org,
      tags: org.tags ?? [],
      recommended_orgs: org.recommended_orgs ?? [],
      sort_order: org.sort_order ?? 0,
    });
    setEditing(org.id);
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

  return (
    <div className="space-y-8">
      {/* Status message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            messageType === "err"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* ── Add / Edit Form ──────────────────────────────────────── */}
      <div
        id="admin-form-top"
        className="bg-gray-950 rounded-2xl p-6 text-white"
      >
        <h2 className="text-lg font-semibold mb-5 text-gray-100">
          {editing ? "✏️ Edit Organization" : "➕ Add Organization"}
        </h2>

        {/* AI Autofill */}
        <div className="mb-5 p-4 rounded-lg bg-gray-800 border border-gray-700">
          <p className="text-sm text-gray-300 font-medium mb-2">✨ Autofill with AI</p>
          <div className="flex gap-2">
            <input
              className="flex-1 p-2 rounded bg-gray-700 text-white text-sm placeholder-gray-500 border border-gray-600 focus:outline-none focus:border-green-500"
              placeholder="https://example-nonprofit.org"
              value={autofillUrl}
              onChange={(e) => setAutofillUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAutofill()}
              disabled={autofilling}
            />
            <button
              onClick={handleAutofill}
              disabled={autofilling || !autofillUrl}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded font-semibold text-sm flex items-center gap-2 whitespace-nowrap"
            >
              {autofilling ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analyzing…
                </>
              ) : "Autofill with AI"}
            </button>
          </div>
          {autofillError && <p className="mt-2 text-sm text-red-400">⚠ {autofillError}</p>}
          {!autofillUrl && (
            <p className="mt-2 text-xs text-gray-500">
              Paste the nonprofit&apos;s homepage URL and click Autofill — Claude will extract all fields automatically.
            </p>
          )}
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-2 gap-4">
          {[
            ["ID (url-slug)", "id"], ["Name", "name"], ["Tagline", "tagline"],
            ["Location", "location"], ["EIN", "ein"], ["Website", "website"],
            ["Image URL", "image_url"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="text-xs text-gray-400 uppercase tracking-wide">{label}</label>
              <input
                className="w-full mt-1 p-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:border-green-500"
                value={form[key] || ""}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                disabled={editing !== null && key === "id"}
              />
            </div>
          ))}

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Founded Year</label>
            <input type="number" className="w-full mt-1 p-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:border-green-500"
              value={form.founded || ""} onChange={(e) => setForm({ ...form, founded: Number(e.target.value) })} />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Goal ($)</label>
            <input type="number" className="w-full mt-1 p-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:border-green-500"
              value={form.goal || ""} onChange={(e) => setForm({ ...form, goal: Number(e.target.value) })} />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Sort Order</label>
            <input type="number" className="w-full mt-1 p-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:border-green-500"
              value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              placeholder="0 = first" />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Category</label>
            <select className="w-full mt-1 p-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:border-green-500"
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Tags (comma separated)</label>
            <input className="w-full mt-1 p-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:border-green-500"
              value={(form.tags || []).join(", ")}
              onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean) })} />
          </div>

          <div className="col-span-2">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Description</label>
            <textarea className="w-full mt-1 p-2 rounded bg-gray-800 text-white text-sm h-24 border border-gray-700 focus:outline-none focus:border-green-500"
              value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Toggles */}
          <div className="flex gap-6 items-center">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-green-500"
                checked={form.verified || false} onChange={(e) => setForm({ ...form, verified: e.target.checked })} />
              Verified
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-green-500"
                checked={form.featured || false} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              Featured on Homepage
            </label>
          </div>

          {/* Recommended orgs */}
          {otherOrgs.length > 0 && (
            <div className="col-span-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">
                We Recommend (select orgs to show on this org&apos;s page)
              </label>
              <div className="max-h-48 overflow-y-auto bg-gray-800 rounded-lg border border-gray-700 p-3 grid grid-cols-2 gap-2">
                {otherOrgs.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-green-400 transition-colors">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 accent-green-500 flex-shrink-0"
                      checked={(form.recommended_orgs ?? []).includes(o.id)}
                      onChange={() => toggleRecommended(o.id)}
                    />
                    <span className="truncate text-gray-300">{o.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(form.recommended_orgs ?? []).length} selected
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold text-sm"
          >
            {editing ? "Save Changes" : "Add Organization"}
          </button>
          {editing && (
            <button
              onClick={() => { setForm({ ...EMPTY_FORM }); setEditing(null); }}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── Org Table ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          All Organizations ({orgs.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "#e5e1d8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-xs uppercase tracking-wide" style={{ backgroundColor: "#faf9f6", borderColor: "#e5e1d8" }}>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-center px-4 py-3">Verified</th>
                <th className="text-center px-4 py-3">Featured</th>
                <th className="text-center px-4 py-3 w-24">Sort</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org, i) => (
                <tr
                  key={org.id}
                  className={`border-b ${i % 2 === 0 ? "bg-white" : ""} hover:bg-gray-50 transition-colors`}
                  style={{ borderColor: "#f0ede6" }}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                  <td className="px-4 py-3 text-gray-500">{org.category}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{org.location}</td>
                  <td className="px-4 py-3 text-center">{org.verified ? "✅" : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleFeatured(org)}
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                        org.featured
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {org.featured ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      className="w-16 text-center border rounded px-1 py-0.5 text-xs outline-none focus:border-green-500"
                      style={{ borderColor: "#e5e1d8" }}
                      defaultValue={org.sort_order ?? 0}
                      onBlur={(e) => handleSortOrder(org, Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(org)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(org.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium"
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
      </div>

      <div
        className="p-4 rounded-xl border text-sm text-amber-700"
        style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}
      >
        <strong>DB migration required</strong> for new columns. Run this in{" "}
        <strong>Supabase Dashboard → SQL Editor</strong>:
        <pre className="mt-2 text-xs bg-amber-50 p-2 rounded overflow-x-auto">
{`ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS recommended_orgs text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;`}
        </pre>
      </div>
    </div>
  );
}
