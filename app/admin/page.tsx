"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
// eslint-disable-next-line @typescript-eslint/no-explicit-any

const ADMIN_EMAIL = "sethmitzel@gmail.com";
const CATEGORIES = ["nonprofits","education","environment","churches","animal-rescue","local"];

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ id:"", name:"", tagline:"", description:"", category:"nonprofits", location:"", ein:"", founded:2020, website:"", goal:50000, tags:[], verified:false, featured:false, image_url:"" });
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [autofillUrl, setAutofillUrl] = useState("");
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) { setAuthorized(true); loadOrgs(); }
      else router.push("/");
    });
  }, []);

  async function loadOrgs() {
    const supabase = createClient();
    const { data } = await supabase.from("organizations").select("*").order("name");
    if (data) setOrgs(data);
  }

  async function handleSubmit() {
    const supabase = createClient();
    if (!form.name || !form.id) return setMessage("Name and ID are required.");
    if (editing) {
    const db = supabase as any;
      const { error } = await db.from("organizations").update(form).eq("id", editing);
      if (error) return setMessage("Error: " + error.message);
      setMessage("Organization updated!");
    } else {
     const { error } = await (supabase as any).from("organizations").insert([form]);
      if (error) return setMessage("Error: " + error.message);
      setMessage("Organization added!");
    }
    setForm({ id:"", name:"", tagline:"", description:"", category:"nonprofits", location:"", ein:"", founded:2020, website:"", goal:50000, tags:[], verified:false, featured:false, image_url:"" });
    setEditing(null);
    loadOrgs();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    if (!confirm("Delete this organization?")) return;
    await supabase.from("organizations").delete().eq("id", id);
    setMessage("Deleted.");
    loadOrgs();
  }

  function handleEdit(org: any) { setForm(org); setEditing(org.id); window.scrollTo(0,0); }

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
      setAutofillError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setAutofilling(false);
    }
  }

  if (!authorized) return <div className="p-8 text-white">Checking access...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      {message && <div className="mb-4 p-3 bg-green-800 rounded">{message}</div>}
      <div className="bg-gray-900 rounded-xl p-6 mb-10">
        <h2 className="text-xl font-semibold mb-4">{editing ? "Edit Organization" : "Add Organization"}</h2>

        {/* AI Autofill */}
        <div className="mb-6 p-4 rounded-lg bg-gray-800 border border-gray-700">
          <p className="text-sm text-gray-300 font-medium mb-2">✨ Autofill with AI</p>
          <div className="flex gap-2">
            <input
              className="flex-1 p-2 rounded bg-gray-700 text-white text-sm placeholder-gray-500 border border-gray-600 focus:outline-none focus:border-green-500"
              placeholder="https://example-nonprofit.org"
              value={autofillUrl}
              onChange={e => setAutofillUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAutofill()}
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Analyzing…
                </>
              ) : "Autofill with AI"}
            </button>
          </div>
          {autofillError && (
            <p className="mt-2 text-sm text-red-400">⚠ {autofillError}</p>
          )}
          {!autofilling && !autofillError && autofillUrl && (
            <p className="mt-2 text-xs text-gray-500">Paste the nonprofit&apos;s homepage URL and click Autofill — Claude will extract all fields automatically.</p>
          )}
          {!autofillUrl && (
            <p className="mt-2 text-xs text-gray-500">Paste the nonprofit&apos;s homepage URL and click Autofill — Claude will extract all fields automatically.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[["ID (url-slug)","id"],["Name","name"],["Tagline","tagline"],["Location","location"],["EIN","ein"],["Website","website"],["Image URL","image_url"]].map(([label,key]) => (
            <div key={key}>
              <label className="text-sm text-gray-400">{label}</label>
              <input className="w-full mt-1 p-2 rounded bg-gray-800 text-white" value={form[key]||""} onChange={e=>setForm({...form,[key]:e.target.value})} disabled={editing!==null&&key==="id"} />
            </div>
          ))}
          <div><label className="text-sm text-gray-400">Founded Year</label><input type="number" className="w-full mt-1 p-2 rounded bg-gray-800 text-white" value={form.founded||""} onChange={e=>setForm({...form,founded:Number(e.target.value)})} /></div>
          <div><label className="text-sm text-gray-400">Goal ($)</label><input type="number" className="w-full mt-1 p-2 rounded bg-gray-800 text-white" value={form.goal||""} onChange={e=>setForm({...form,goal:Number(e.target.value)})} /></div>
          <div><label className="text-sm text-gray-400">Category</label><select className="w-full mt-1 p-2 rounded bg-gray-800 text-white" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="text-sm text-gray-400">Tags (comma separated)</label><input className="w-full mt-1 p-2 rounded bg-gray-800 text-white" value={(form.tags||[]).join(", ")} onChange={e=>setForm({...form,tags:e.target.value.split(",").map((t:string)=>t.trim())})} /></div>
          <div className="col-span-2"><label className="text-sm text-gray-400">Description</label><textarea className="w-full mt-1 p-2 rounded bg-gray-800 text-white h-24" value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} /></div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.verified||false} onChange={e=>setForm({...form,verified:e.target.checked})} />Verified</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured||false} onChange={e=>setForm({...form,featured:e.target.checked})} />Featured</label>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={handleSubmit} className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded font-semibold">{editing ? "Save Changes" : "Add Organization"}</button>
          {editing && <button onClick={()=>{setForm({id:"",name:"",tagline:"",description:"",category:"nonprofits",location:"",ein:"",founded:2020,website:"",goal:50000,tags:[],verified:false,featured:false,image_url:""});setEditing(null);}} className="px-6 py-2 bg-gray-700 rounded">Cancel</button>}
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-4">All Organizations ({orgs.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-800"><th className="text-left p-2">Name</th><th className="text-left p-2">Category</th><th className="text-left p-2">Location</th><th className="text-left p-2">Verified</th><th className="text-left p-2">Actions</th></tr></thead>
          <tbody>{orgs.map(org=>(
            <tr key={org.id} className="border-b border-gray-900 hover:bg-gray-900">
              <td className="p-2 font-medium">{org.name}</td>
              <td className="p-2 text-gray-400">{org.category}</td>
              <td className="p-2 text-gray-400">{org.location}</td>
              <td className="p-2">{org.verified?"✅":"—"}</td>
              <td className="p-2 flex gap-2">
                <button onClick={()=>handleEdit(org)} className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs">Edit</button>
                <button onClick={()=>handleDelete(org.id)} className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-xs">Delete</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
