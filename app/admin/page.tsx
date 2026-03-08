"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "sethmitzel@gmail.com";

const CATEGORIES = [
  "nonprofits", "education", "health", "environment",
  "arts", "community", "animals", "international"
];

type Org = {
  id: string; name: string; tagline: string; description: string;
  category: string; location: string; ein: string; founded: number;
  website: string; goal: number; tags: string[]; verified: boolean;
  featured: boolean; image_url: string;
};

const empty = (): Partial<Org> => ({
  id: "", name: "", tagline: "", description: "", category: "nonprofits",
  location: "", ein: "", founded: 2020, website: "", goal: 50000,
  tags: [], verified: false, featured: false, image_url: ""
});

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [authorized, setAuthorized] = useState(false);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [form, setForm] = useState<Partial<Org>>(empty());
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) {
        setAuthorized(true);
        loadOrgs();
      } else {
        router.push("/");
      }
    });
  }, []);

  async function loadOrgs() {
    const { data } = await supabase.from("organizations").select("*").order("name");
    if (data) setOrgs(data);
  }

  async function handleSubmit() {
    if (!form.name || !form.id) return setMessage("Name and ID are required.");
    if (editing) {
      const { error } = await supabase.from("organizations").update(form as any).eq("id", editing);
      if (error) return setMessage("Error: " + error.message);
      setMessage("Organization updated!");
    } else {
      const { error } = await supabase.from("organizations").insert([form as any]);
      if (error) return setMessage("Error: " + error.message);
      setMessage("Organization added!");
    }
    setForm(empty());
    setEditing(null);
    loadOrgs();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this organization?")) return;
    await supabase.from("organizations").delete().eq("id", id);
    setMessage("Deleted.");
    loadOrgs();
  }

  function handleEdit(org: Org) {
    setForm(org);
    setEditing(org.id);
    window.scrollTo(0, 0);
  }

  if (!authorized) return <div className="p-8 text-white">Checking access...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      {message && <div className="mb-4 p-3 bg-green-800 rounded">{message}</div>}

      <div className="bg-gray-900 rounded-xl p-6 mb-10">
        <h2 className="text-xl font-semibold mb-4">{editing ? "Edit Organization" : "Add Organization"}</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["ID (url-slug, e.g. my-org)", "id"],
            ["Name", "name"],
            ["Tagline", "tagline"],
            ["Location", "location"],
            ["EIN", "ein"],
            ["Website", "website"],
            ["Image URL", "image_url"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="text-sm text-gray-400">{label}</label>
              <input
                className="w-full mt-1 p-2 rounded bg-gray-800 text-white"
                value={(form as any)[key] || ""}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                disabled={editing !== null && key === "id"}
              />
            </div>
          ))}
          <div>
            <label className="text-sm text-gray-400">Founded Year</label>
            <input type="number" className="w-full mt-1 p-2 rounded bg-gray-800 text-white"
              value={form.founded || ""} onChange={e => setForm({ ...form, founded: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm text-gray-400">Goal Amount ($)</label>
            <input type="number" className="w-full mt-1 p-2 rounded bg-gray-800 text-white"
              value={form.goal || ""} onChange={e => setForm({ ...form, goal: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm text-gray-400">Category</label>
            <select className="w-full mt-1 p-2 rounded bg-gray-800 text-white"
              value={form.category || "nonprofits"} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">Tags (comma separated)</label>
            <input className="w-full mt-1 p-2 rounded bg-gray-800 text-white"
              value={(form.tags || []).join(", ")}
              onChange={e => setForm({ ...form, tags: e.target.value.split(",").map(t => t.trim()) })} />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-gray-400">Description</label>
            <textarea className="w-full mt-1 p-2 rounded bg-gray-800 text-white h-24"
              value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.verified || false}
                onChange={e => setForm({ ...form, verified: e.target.checked })} />
              Verified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured || false}
                onChange={e => setForm({ ...form, featured: e.target.checked })} />
              Featured
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded font-semibold">
            {editing ? "Save Changes" : "Add Organization"}
          </button>
          {editing && <button onClick={() => { setForm(empty()); setEditing(null); }}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded">Cancel</button>}
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">All Organizations ({orgs.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Location</th>
              <th className="text-left p-2">Verified</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map(org => (
              <tr key={org.id} className="border-b border-gray-900 hover:bg-gray-900">
                <td className="p-2 font-medium">{org.name}</td>
                <td className="p-2 text-gray-400">{org.category}</td>
                <td className="p-2 text-gray-400">{org.location}</td>
                <td className="p-2">{org.verified ? "✅" : "—"}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={() => handleEdit(org)}
                    className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs">Edit</button>
                  <button onClick={() => handleDelete(org.id)}
                    className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}