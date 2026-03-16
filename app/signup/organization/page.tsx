"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, Loader2, AlertCircle, CheckCircle, Clock,
  Users, Check,
} from "lucide-react";
import { SUBCATEGORY_OPTIONS, CATEGORY_LABELS } from "@/lib/categories";
import type { TopCategory } from "@/lib/categories";
import { PreviewBanner, AdminNotesPanel } from "@/components/AdminPreviewOverlay";

// ─── Top-level category card definitions ─────────────────────────────────────

const TOP_CATEGORIES: {
  value: TopCategory;
  label: string;
  sublabel: string;
  Icon: React.ElementType;
}[] = [
  {
    value: "community",
    label: "Community",
    sublabel: "Nonprofits, churches, food banks, schools, and more",
    Icon: Users,
  },
];

// ─── EIN visibility logic ─────────────────────────────────────────────────────

function getEinConfig(category: string, subcategory: string) {
  if (category === "politics") return { show: false, required: false, helper: "" };
  if (category === "community" && subcategory === "church") return {
    show: true, required: false,
    helper: "Churches are not required to have an EIN.",
  };
  if (category === "community") return {
    show: true, required: true, helper: "",
  };
  return { show: true, required: false, helper: "" };
}

// ─── Preview success screen ───────────────────────────────────────────────────

function PreviewSuccessScreen({ form }: { form: Record<string, string> }) {
  const router = useRouter();

  const fields: { label: string; value: string }[] = [
    { label: "Organization", value: form.orgName },
    { label: "Contact", value: form.contactName },
    { label: "Email", value: form.email },
    { label: "Website", value: form.website || "—" },
    { label: "Category", value: [CATEGORY_LABELS[form.category] ?? form.category, form.subcategory ? (CATEGORY_LABELS[form.subcategory] ?? form.subcategory) : ""].filter(Boolean).join(" › ") },
    { label: "EIN", value: form.ein || "—" },
    { label: "Description", value: form.description },
  ];

  return (
    <>
      <PreviewBanner />
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "#fef08a" }}
          >
            <CheckCircle className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="font-display text-3xl text-gray-900 mb-1 text-center">
            Preview: Application submitted
          </h1>
          <p className="text-center text-sm text-yellow-700 font-medium mb-6 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
            ⚠️ Preview only — no real Supabase record was created
          </p>

          <div
            className="rounded-xl border divide-y text-sm mb-6"
            style={{ borderColor: "#e5e1d8" }}
          >
            {fields.map(({ label, value }) => (
              <div key={label} className="flex gap-3 px-4 py-3">
                <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
                <span className="text-gray-900 break-all">{value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/profile?tab=admin")}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#dc2626" }}
          >
            Exit Preview → Return to Admin
          </button>
        </div>
      </div>
      <AdminNotesPanel />
    </>
  );
}

// ─── Inner page (uses useSearchParams) ───────────────────────────────────────

function OrgSignupInner() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  const [form, setForm] = useState({
    orgName: "",
    contactName: "",
    email: "",
    website: "",
    ein: "",
    category: "",
    subcategory: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [einError, setEinError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Scroll error into view whenever it changes
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  const einConfig = getEinConfig(form.category, form.subcategory);

  const subOptions =
    form.category
      ? SUBCATEGORY_OPTIONS[form.category as TopCategory] ?? []
      : [];

  // Auto-select when only one subcategory option is available
  const autoSubcategory =
    subOptions.length === 1 ? subOptions[0] : form.subcategory;

  function selectCategory(cat: string) {
    const subs = SUBCATEGORY_OPTIONS[cat as TopCategory] ?? [];
    setForm((prev) => ({
      ...prev,
      category: cat,
      subcategory: subs.length === 1 ? subs[0] : "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category) {
      setError("Please select a category.");
      return;
    }
    const effectiveSubcategory = autoSubcategory;
    if (subOptions.length > 1 && !effectiveSubcategory) {
      setError("Please select a subcategory.");
      return;
    }
    if (einConfig.show && form.ein.trim()) {
      const einPattern = /^\d{2}-\d{7}$/;
      if (!einPattern.test(form.ein.trim())) {
        setEinError("EIN must be in the format 12-3456789.");
        return;
      }
    }
    if (einConfig.required && !form.ein.trim()) {
      setError("EIN is required for this organization type.");
      return;
    }

    // Basic URL format check
    if (form.website.trim()) {
      try {
        new URL(form.website.trim().startsWith("http") ? form.website.trim() : `https://${form.website.trim()}`);
      } catch {
        setError("Please enter a valid website URL (e.g. https://yourorg.org).");
        return;
      }
    }

    // Preview mode: skip real Supabase write
    if (isPreview) {
      setSuccess(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/org/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_name: form.orgName,
          contact_name: form.contactName,
          email: form.email,
          website: form.website,
          ein: form.ein,
          category: form.category,
          subcategory: effectiveSubcategory,
          description: form.description,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success && isPreview) {
    return <PreviewSuccessScreen form={form} />;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "#e8f5ee" }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: "#1a7a4a" }} />
          </div>
          <h1 className="font-display text-3xl text-gray-900 mb-3">
            Application submitted!
          </h1>
          <p className="text-gray-500 mb-3">
            We received your application for{" "}
            <span className="font-semibold text-gray-800">{form.orgName}</span>.
          </p>
          <div
            className="flex items-center justify-center gap-2 text-sm font-medium p-3 rounded-xl mb-4"
            style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}
          >
            <Clock className="w-4 h-4" />
            We&apos;ll review your application and get back to you within 2 business days.
          </div>
          <p className="text-sm text-gray-500 mb-8">
            Once approved, we&apos;ll send an invite to{" "}
            <span className="font-medium text-gray-700">{form.email}</span>{" "}
            so you can set up your account and complete your profile.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/discover"
              className="w-full py-3 rounded-full font-semibold text-white text-center transition-all hover:opacity-90"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Browse Organizations
            </Link>
            <Link
              href="/"
              className="w-full py-3 rounded-full font-semibold text-center transition-all border"
              style={{ color: "#374151", borderColor: "#e5e1d8" }}
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isPreview && <PreviewBanner />}
      <div className="min-h-screen bg-white">
        <div className="max-w-lg mx-auto px-4 py-16">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-xl text-gray-900">
                EasyToGive
              </span>
            </Link>
            <h1 className="font-display text-3xl text-gray-900 mt-6 mb-1">
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
                  className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
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
                  className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
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
                  className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                  style={{ borderColor: "#e5e1d8" }}
                  placeholder="jane@yourorg.org"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Website <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                  style={{ borderColor: "#e5e1d8" }}
                  placeholder="https://yourorg.org"
                />
              </div>

              {/* ── Category — step 1: three cards ──────────────────────────── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {TOP_CATEGORIES.map(({ value, label, sublabel, Icon }) => {
                    const selected = form.category === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => selectCategory(value)}
                        className="relative rounded-xl border p-4 text-left transition-all focus:outline-none"
                        style={{
                          borderColor: selected ? "#1a7a4a" : "#e5e1d8",
                          backgroundColor: selected ? "#e8f5ee" : "white",
                          borderWidth: selected ? 2 : 1,
                        }}
                      >
                        {selected && (
                          <div
                            className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "#1a7a4a" }}
                          >
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <Icon
                          className="w-5 h-5 mb-2"
                          style={{ color: selected ? "#1a7a4a" : "#6b7280" }}
                        />
                        <div
                          className="text-sm font-semibold mb-0.5"
                          style={{ color: selected ? "#1a7a4a" : "#111827" }}
                        >
                          {label}
                        </div>
                        <div className="text-xs text-gray-500 leading-snug">{sublabel}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Subcategory — step 2 ─────────────────────────────────────── */}
              {form.category && subOptions.length > 1 && (
                <div
                  className="space-y-1"
                  style={{
                    animation: "fadeSlideIn 0.2s ease-out",
                  }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Subcategory
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {subOptions.map((sub) => {
                      const selected = form.subcategory === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setForm({ ...form, subcategory: sub })}
                          className="px-3.5 py-2 rounded-lg border text-sm font-medium transition-all"
                          style={{
                            borderColor: selected ? "#1a7a4a" : "#e5e1d8",
                            backgroundColor: selected ? "#e8f5ee" : "white",
                            color: selected ? "#1a7a4a" : "#374151",
                          }}
                        >
                          {CATEGORY_LABELS[sub] ?? sub}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EIN — only show after category is selected */}
              {form.category && einConfig.show && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    EIN{" "}
                    {einConfig.required ? (
                      <span className="text-gray-400 font-normal">(Tax ID, format: 12-3456789)</span>
                    ) : (
                      <span className="text-gray-400 font-normal">(optional)</span>
                    )}
                  </label>
                  {einConfig.helper && (
                    <p className="text-xs text-gray-400 mb-1.5">{einConfig.helper}</p>
                  )}
                  <input
                    type="text"
                    value={form.ein}
                    onChange={(e) => {
                      setForm({ ...form, ein: e.target.value });
                      setEinError(null);
                    }}
                    required={einConfig.required}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                    style={{ borderColor: einError ? "#fca5a5" : "#e5e1d8" }}
                    placeholder="12-3456789"
                  />
                  {einError && (
                    <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{einError}</p>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Brief description of your mission
                  </label>
                  <span
                    className="text-xs"
                    style={{ color: form.description.length > 380 ? "#dc2626" : "#9ca3af" }}
                  >
                    {form.description.length}/400
                  </span>
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 400) })}
                  required
                  rows={4}
                  maxLength={400}
                  className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors resize-none"
                  style={{ borderColor: "#e5e1d8" }}
                  placeholder="Describe what your organization does and who it serves…"
                />
              </div>

              {error && (
                <div
                  ref={errorRef}
                  role="alert"
                  className="flex items-start gap-2.5 p-3 rounded-lg border text-sm"
                  style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#dc2626" }}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: isPreview ? "#b45309" : "#1a7a4a" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting application…
                  </>
                ) : isPreview ? (
                  "Submit Application (Preview)"
                ) : (
                  "Submit Application"
                )}
              </button>
            </form>

            {!isPreview && (
              <p className="text-center text-sm text-gray-500 mt-6">
                Already listed?{" "}
                <Link
                  href="/auth/signin"
                  className="font-medium hover:underline"
                  style={{ color: "#1a7a4a" }}
                >
                  Sign in
                </Link>
              </p>
            )}
          </div>

          {!isPreview && (
            <p className="text-center text-xs text-gray-400 mt-5">
              By submitting you agree to our{" "}
              <a href="/terms" className="underline hover:text-gray-600">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>.
            </p>
          )}
        </div>

      </div>
      {isPreview && <AdminNotesPanel />}
    </>
  );
}

// ─── Page (Suspense wrapper required for useSearchParams) ──────────────────────

export default function OrgSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a7a4a" }} />
        </div>
      }
    >
      <OrgSignupInner />
    </Suspense>
  );
}
