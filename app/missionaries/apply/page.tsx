"use client";

import { useState, useRef } from "react";
import { CheckCircle, Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function MissionaryApplyPage() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    mission_org: "",
    country: "",
    region: "",
    bio: "",
    monthly_goal: "",
    photo_url: "",
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;
    setUploading(true);
    try {
      const supabase = createClient() as any;
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `missionaries/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (!uploadErr) {
        const { data } = supabase.storage.from("images").getPublicUrl(path);
        setForm((f) => ({ ...f, photo_url: data.publicUrl }));
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.country || !form.bio) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    setError("");
    const supabase = createClient() as any;
    const { error: err } = await supabase.from("missionary_applications").insert({
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      mission_org: form.mission_org.trim(),
      country: form.country.trim(),
      region: form.region.trim(),
      bio: form.bio.trim(),
      monthly_goal: form.monthly_goal ? Number(form.monthly_goal) : 0,
      photo_url: form.photo_url,
      status: "pending",
    });
    setSubmitting(false);
    if (err) {
      setError("Error submitting: " + err.message);
    } else {
      setSubmitted(true);
    }
  }

  const inputCls =
    "w-full px-4 py-3 border rounded-xl text-sm text-gray-900 outline-none focus:border-green-600 transition-colors bg-white";
  const inputStyle = { borderColor: "#e5e1d8" };
  const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "#faf9f6" }}
      >
        <div
          className="bg-white rounded-2xl border shadow-sm p-10 max-w-md w-full text-center"
          style={{ borderColor: "#e5e1d8" }}
        >
          <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#1a7a4a" }} />
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
            Application submitted!
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            We&apos;ll be in touch at{" "}
            <span className="font-medium text-gray-700">{form.email}</span> within 2–3 business
            days.
          </p>
          <Link
            href="/missionaries"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Browse Missionaries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: "#faf9f6" }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/missionaries"
            className="text-sm font-medium hover:underline"
            style={{ color: "#1a7a4a" }}
          >
            ← Back to Missionaries
          </Link>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-8" style={{ borderColor: "#e5e1d8" }}>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">
            Apply to Join EasyToGive as a Missionary
          </h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Tell us about your mission. Applications are reviewed by our team and approved within
            2–3 business days.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="jane@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Mission Organization</label>
              <input
                type="text"
                value={form.mission_org}
                onChange={(e) => setForm((f) => ({ ...f, mission_org: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                placeholder="e.g. YWAM, IMB, Assemblies of God World Missions"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>
                  Country Serving In <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="Uganda"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>
                  Region{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="e.g. East Africa, Southeast Asia"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Your Story / Bio <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={5}
                className={inputCls + " resize-none"}
                style={inputStyle}
                placeholder="Tell supporters who you are, what you do, and why you serve..."
                required
              />
            </div>

            <div>
              <label className={labelCls}>
                Monthly Support Goal{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.monthly_goal}
                  onChange={(e) => setForm((f) => ({ ...f, monthly_goal: e.target.value }))}
                  className={inputCls}
                  style={{ ...inputStyle, paddingLeft: "1.75rem" }}
                  placeholder="e.g. 2000"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Profile Photo{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              {form.photo_url ? (
                <div className="flex items-center gap-3">
                  <img
                    src={form.photo_url}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, photo_url: "" }))}
                    className="text-sm text-gray-400 hover:text-gray-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  style={{ borderColor: "#e5e1d8", borderStyle: "dashed" }}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? "Uploading..." : "Upload photo"}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhoto(f);
                  e.target.value = "";
                }}
              />
            </div>

            {/* What happens next */}
            <div
              className="rounded-xl border p-4 text-sm"
              style={{ backgroundColor: "#e8f5ee", borderColor: "rgba(26,122,74,0.2)" }}
            >
              <p className="font-semibold text-gray-900 mb-1">What happens next?</p>
              <p className="text-gray-600 leading-relaxed">
                Our team will review your application within 2–3 business days. If approved, your
                profile will go live and you can start receiving support. You&apos;ll receive an
                email at the address you provided.
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#1a7a4a", height: "52px" }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Submit Application →"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
