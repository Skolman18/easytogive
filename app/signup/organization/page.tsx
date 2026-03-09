"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

const CATEGORIES = [
  { value: "nonprofits", label: "Nonprofit (501c3)" },
  { value: "churches", label: "Church / Faith Organization" },
  { value: "animal-rescue", label: "Animal Rescue" },
  { value: "education", label: "Education" },
  { value: "environment", label: "Environment" },
  { value: "local", label: "Local Cause / Community Group" },
];

export default function OrgSignupPage() {
  const [form, setForm] = useState({
    orgName: "",
    contactName: "",
    email: "",
    password: "",
    website: "",
    ein: "",
    category: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: form.contactName,
          org_name: form.orgName,
          website: form.website,
          ein: form.ein,
          category: form.category,
          description: form.description,
          account_type: "organization",
          status: "pending_review",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "#eff6ff" }}
          >
            <CheckCircle className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-3">
            Application submitted!
          </h1>
          <p className="text-gray-500 mb-3">
            We received your application for{" "}
            <span className="font-semibold text-gray-800">{form.orgName}</span>.
          </p>
          <div
            className="flex items-center justify-center gap-2 text-sm font-medium p-3 rounded-xl mb-8"
            style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}
          >
            <Clock className="w-4 h-4" />
            We&apos;ll review your application and get back to you within 2 business days.
          </div>
          <p className="text-sm text-gray-400">
            A confirmation email has been sent to{" "}
            <span className="text-gray-600">{form.email}</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-16">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-600">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-semibold text-gray-900">
              EasyToGive
            </span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-gray-900 mt-6 mb-1">
            List your organization
          </h1>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Reach thousands of motivated donors. All organizations are reviewed
            before going live.
          </p>
        </div>

        {/* Review notice */}
        <div
          className="flex items-center gap-3 p-4 rounded-xl mb-6 text-sm"
          style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}
        >
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>
            We&apos;ll review your application and get back to you within{" "}
            <strong>2 business days</strong>.
          </span>
        </div>

        <div
          className="bg-white rounded-2xl border p-8 shadow-sm"
          style={{ borderColor: "#e5e1d8" }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Org name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Organization name
              </label>
              <input
                type="text"
                value={form.orgName}
                onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                required
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-blue-500 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="Green Future Foundation"
              />
            </div>

            {/* Contact name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your name (primary contact)
              </label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                required
                autoComplete="name"
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-blue-500 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="Jane Smith"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-blue-500 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="jane@yourorg.org"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password{" "}
                <span className="text-gray-400 font-normal">(min. 6 characters)</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-blue-500 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="••••••••"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Website
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-blue-500 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="https://yourorg.org"
              />
            </div>

            {/* EIN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                EIN{" "}
                <span className="text-gray-400 font-normal">(Tax ID, format: 12-3456789)</span>
              </label>
              <input
                type="text"
                value={form.ein}
                onChange={(e) => setForm({ ...form, ein: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-blue-500 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="12-3456789"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-blue-500 transition-colors bg-white"
                style={{ borderColor: "#e5e1d8" }}
              >
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Brief description of your mission
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                rows={4}
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-blue-500 transition-colors resize-none"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="Describe what your organization does and who it serves…"
              />
            </div>

            {error && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-lg border text-sm"
                style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#dc2626" }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-blue-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting application…
                </>
              ) : (
                "Submit Application"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already listed?{" "}
            <Link href="/auth/signin" className="font-medium hover:underline text-blue-600">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          By submitting you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
