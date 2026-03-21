"use client";

import React from "react";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { SUBCATEGORY_OPTIONS, CATEGORY_LABELS } from "@/lib/categories";
import type { TopCategory } from "@/lib/categories";
import { PreviewBanner, AdminNotesPanel } from "@/components/AdminPreviewOverlay";

// ─── Top-level category card definitions ─────────────────────────────────────

const TOP_CATEGORIES: {
  value: TopCategory;
  label: string;
  sublabel: string;
}[] = [
  {
    value: "community",
    label: "Community",
    sublabel: "Nonprofits, churches, food banks, schools, and more",
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

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center mb-8">
      {([1, 2, 3] as const).map((n, i) => (
        <React.Fragment key={n}>
          <div
            className="w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 transition-colors"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...(step >= n
                ? { backgroundColor: "#1a7a4a", color: "white" }
                : {
                    border: "1.5px solid #ccc9c0",
                    color: "#aaa",
                    backgroundColor: "transparent",
                  }),
            }}
          >
            {n}
          </div>
          {i < 2 && (
            <div
              className="flex-1 mx-1.5"
              style={{ height: 1, backgroundColor: "#ccc9c0" }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
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
  const router = useRouter();
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
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [einError, setEinError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // GiveButter import
  const [gbApiKey, setGbApiKey] = useState("");
  const [gbImporting, setGbImporting] = useState(false);
  const [gbError, setGbError] = useState<string | null>(null);
  const [gbSuccess, setGbSuccess] = useState(false);

  // AI autofill
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);

  // Step state for 3-step wizard
  const [step, setStep] = useState<1 | 2 | 3>(1);

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

  function selectCategory(cat: string) {
    const subs = SUBCATEGORY_OPTIONS[cat as TopCategory] ?? [];
    setForm((prev) => ({
      ...prev,
      category: cat,
      subcategory: subs.length === 1 ? subs[0] : "",
    }));
  }

  function validateStep(s: 1 | 2 | 3): boolean {
    setError(null);
    setEinError(null);

    if (s === 1) {
      if (!form.orgName.trim()) {
        setError("Organization name is required.");
        return false;
      }
      if (form.website.trim()) {
        try {
          new URL(
            form.website.trim().startsWith("http")
              ? form.website.trim()
              : `https://${form.website.trim()}`
          );
        } catch {
          setError("Please enter a valid website URL (e.g. https://yourorg.org).");
          return false;
        }
      }
      return true;
    }

    if (s === 2) {
      if (!form.category) {
        setError("Please select a category.");
        return false;
      }
      const effectiveSub =
        subOptions.length === 1 ? subOptions[0] : form.subcategory;
      if (subOptions.length > 1 && !effectiveSub) {
        setError("Please select a subcategory.");
        return false;
      }
      if (einConfig.show && form.ein.trim()) {
        const einPattern = /^\d{2}-\d{7}$/;
        if (!einPattern.test(form.ein.trim())) {
          setEinError("EIN must be in the format 12-3456789.");
          return false;
        }
      }
      if (einConfig.required && !form.ein.trim()) {
        setError("EIN is required for this organization type.");
        return false;
      }
      if (!form.description.trim()) {
        setError("Please describe your organization's mission.");
        return false;
      }
      return true;
    }

    if (s === 3) {
      if (!form.contactName.trim()) {
        setError("Contact name is required.");
        return false;
      }
      if (!form.email.trim()) {
        setError("Email address is required.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        setError("Please enter a valid email address.");
        return false;
      }
      if (!form.password) {
        setError("Password is required.");
        return false;
      }
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return false;
      }
      if (!/\d/.test(form.password)) {
        setError("Password must contain at least one number.");
        return false;
      }
      if (!/[^a-zA-Z0-9]/.test(form.password)) {
        setError("Password must contain at least one special character.");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
      return true;
    }

    return true;
  }

  function handleContinue() {
    if (!validateStep(step)) return;
    setStep((s) => (s < 3 ? (s + 1) as 1 | 2 | 3 : s));
  }

  function handleBack() {
    setError(null);
    setEinError(null);
    setStep((s) => (s > 1 ? (s - 1) as 1 | 2 | 3 : s));
  }

  async function handleGbImport() {
    if (!gbApiKey.trim()) return;
    setGbImporting(true);
    setGbError(null);
    setGbSuccess(false);
    try {
      const res = await fetch("/api/givebutter-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: gbApiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGbError(data.error ?? "Import failed. Please check your API key.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        orgName: data.name || prev.orgName,
        website: data.website || prev.website,
        description: data.description || prev.description,
      }));
      setGbSuccess(true);
    } catch {
      setGbError("Failed to connect to GiveButter. Please try again.");
    } finally {
      setGbImporting(false);
    }
  }

  async function handleAutofill() {
    const url = form.website.trim();
    if (!url) return;
    setAutofilling(true);
    setAutofillError(null);
    try {
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      const res = await fetch("/api/org/autofill-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fullUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAutofillError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        orgName: data.name && !prev.orgName ? data.name : prev.orgName,
        description: data.description || prev.description,
      }));
    } catch {
      setAutofillError("Could not reach the server. Please try again.");
    } finally {
      setAutofilling(false);
    }
  }

  async function handleSubmit() {
    if (!validateStep(3)) return;

    setLoading(true);
    setError(null);

    // Preview mode: skip real account creation
    if (isPreview) {
      setLoading(false);
      setSuccess(true);
      return;
    }

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
          subcategory: form.subcategory,
          description: form.description,
          password: form.password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Account created — now sign in and redirect to dashboard
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) {
        setError(
          "Account created! Please sign in at /auth/signin to access your dashboard."
        );
        return;
      }

      router.push("/org/dashboard");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success && isPreview) {
    return <PreviewSuccessScreen form={form} />;
  }

  return (
    <>
      {isPreview && <PreviewBanner />}
      <div
        className="min-h-screen flex items-start justify-center px-4 py-16"
        style={{ backgroundColor: "#faf9f6" }}
      >
        <div className="w-full max-w-lg">
          {/* Brand */}
          <Link href="/" className="block mb-8">
            <span
              className="font-display text-xl"
              style={{ color: "#1a7a4a" }}
            >
              EasyToGive
            </span>
          </Link>

          {/* Wizard card */}
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            style={{ border: "1.5px solid #e5e1d8" }}
          >
            <div className="px-10 pt-10 pb-0">
              <StepIndicator step={step} />
              {/* ── Step 1: Your Organization ─────────────────────── */}
              {step === 1 && (
                <div>
                  <h2
                    className="font-display text-2xl mb-1"
                    style={{ color: "#1a1a18" }}
                  >
                    Your organization
                  </h2>
                  <p className="text-sm mb-7" style={{ color: "#888" }}>
                    Start with the basics.
                  </p>

                  <div className="space-y-5">
                    {/* Org name */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "#444" }}
                      >
                        Organization name
                      </label>
                      <input
                        type="text"
                        value={form.orgName}
                        onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                        required
                        className="w-full px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors"
                        style={{
                          border: "1.5px solid #d8d4cc",
                          borderRadius: 8,
                          height: 42,
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#1a7a4a")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#d8d4cc")
                        }
                        placeholder="Green Future Foundation"
                      />
                    </div>

                    {/* Website */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "#444" }}
                      >
                        Website{" "}
                        <span className="font-normal" style={{ color: "#aaa" }}>
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors"
                        style={{
                          border: "1.5px solid #d8d4cc",
                          borderRadius: 8,
                          height: 42,
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#1a7a4a")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#d8d4cc")
                        }
                        placeholder="https://yourorg.org"
                      />
                    </div>

                    {/* Error */}
                    {error && (
                      <div
                        ref={errorRef}
                        role="alert"
                        className="px-3.5 py-2.5 rounded-lg text-sm"
                        style={{
                          backgroundColor: "#fef2f2",
                          color: "#dc2626",
                          border: "1px solid #fca5a5",
                        }}
                      >
                        {error}
                      </div>
                    )}
                  </div>

                  {/* Review notice */}
                  <p
                    className="text-xs mt-6 mb-2 leading-relaxed"
                    style={{ color: "#aaa" }}
                  >
                    <strong style={{ color: "#777" }}>
                      Applications are reviewed within 2–3 business days.
                    </strong>{" "}
                    We verify 501(c)(3) status before activation.
                  </p>
                </div>
              )}

              {/* ── Step 2: Your Mission ───────────────────────────── */}
              {step === 2 && (
                <div>
                  <h2
                    className="font-display text-2xl mb-1"
                    style={{ color: "#1a1a18" }}
                  >
                    Your mission
                  </h2>
                  <p className="text-sm mb-7" style={{ color: "#888" }}>
                    What you do and who you serve.
                  </p>

                  <div className="space-y-5">
                    {/* Category */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-2"
                        style={{ color: "#444" }}
                      >
                        Category
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {TOP_CATEGORIES.map(({ value, label, sublabel }) => {
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
                              <div
                                className="text-sm font-semibold mb-0.5"
                                style={{ color: selected ? "#1a7a4a" : "#111827" }}
                              >
                                {label}
                              </div>
                              <div className="text-xs text-gray-500 leading-snug">
                                {sublabel}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Subcategory */}
                    {form.category && subOptions.length > 1 && (
                      <div>
                        <label
                          className="block text-xs font-semibold mb-2"
                          style={{ color: "#444" }}
                        >
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

                    {/* EIN — conditional on category */}
                    {form.category && einConfig.show && (
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1.5"
                          style={{ color: "#444" }}
                        >
                          EIN{" "}
                          {einConfig.required ? (
                            <span className="font-normal" style={{ color: "#aaa" }}>
                              (Tax ID, format: 12-3456789)
                            </span>
                          ) : (
                            <span className="font-normal" style={{ color: "#aaa" }}>
                              (optional)
                            </span>
                          )}
                        </label>
                        {einConfig.helper && (
                          <p className="text-xs mb-1.5" style={{ color: "#aaa" }}>
                            {einConfig.helper}
                          </p>
                        )}
                        <input
                          type="text"
                          value={form.ein}
                          onChange={(e) => {
                            setForm({ ...form, ein: e.target.value });
                            setEinError(null);
                          }}
                          required={einConfig.required}
                          className="w-full px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors"
                          style={{
                            border: `1.5px solid ${einError ? "#fca5a5" : "#d8d4cc"}`,
                            borderRadius: 8,
                            height: 42,
                          }}
                          onFocus={(e) =>
                            (e.currentTarget.style.borderColor = einError
                              ? "#fca5a5"
                              : "#1a7a4a")
                          }
                          onBlur={(e) =>
                            (e.currentTarget.style.borderColor = einError
                              ? "#fca5a5"
                              : "#d8d4cc")
                          }
                          placeholder="12-3456789"
                        />
                        {einError && (
                          <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
                            {einError}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          className="block text-xs font-semibold"
                          style={{ color: "#444" }}
                        >
                          Brief description of your mission
                        </label>
                        <div className="flex items-center gap-2">
                          {form.website.trim() && (
                            <button
                              type="button"
                              onClick={handleAutofill}
                              disabled={autofilling}
                              className="text-xs font-semibold transition-opacity hover:opacity-75 disabled:opacity-50"
                              style={{ color: "#1a7a4a" }}
                            >
                              {autofilling ? (
                                <span className="flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Filling…
                                </span>
                              ) : (
                                "Fill with AI"
                              )}
                            </button>
                          )}
                          <span
                            className="text-xs"
                            style={{
                              color:
                                form.description.length > 380 ? "#dc2626" : "#9ca3af",
                            }}
                          >
                            {form.description.length}/400
                          </span>
                        </div>
                      </div>
                      {autofillError && (
                        <p className="text-xs mb-1.5 font-medium" style={{ color: "#dc2626" }}>
                          {autofillError}
                        </p>
                      )}
                      <textarea
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value.slice(0, 400) })
                        }
                        required
                        rows={4}
                        maxLength={400}
                        className="w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 outline-none transition-colors resize-none"
                        style={{ borderColor: "#e5e1d8" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#1a7a4a")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e1d8")}
                        placeholder="Describe what your organization does and who it serves…"
                      />
                    </div>

                    {/* Error */}
                    {error && (
                      <div
                        ref={errorRef}
                        role="alert"
                        className="px-3.5 py-2.5 rounded-lg text-sm"
                        style={{
                          backgroundColor: "#fef2f2",
                          color: "#dc2626",
                          border: "1px solid #fca5a5",
                        }}
                      >
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 3: Contact & Connect ──────────────────────── */}
              {step === 3 && (
                <div>
                  <h2
                    className="font-display text-2xl mb-1"
                    style={{ color: "#1a1a18" }}
                  >
                    Contact & connect
                  </h2>
                  <p className="text-sm mb-7" style={{ color: "#888" }}>
                    Who we&apos;ll be in touch with.
                  </p>

                  <div className="space-y-5">
                    {/* Contact name */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "#444" }}
                      >
                        Your name (primary contact)
                      </label>
                      <input
                        type="text"
                        value={form.contactName}
                        onChange={(e) =>
                          setForm({ ...form, contactName: e.target.value })
                        }
                        required
                        autoComplete="name"
                        className="w-full px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors"
                        style={{
                          border: "1.5px solid #d8d4cc",
                          borderRadius: 8,
                          height: 42,
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#1a7a4a")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#d8d4cc")
                        }
                        placeholder="Jane Smith"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "#444" }}
                      >
                        Email address
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        autoComplete="email"
                        className="w-full px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors"
                        style={{
                          border: "1.5px solid #d8d4cc",
                          borderRadius: 8,
                          height: 42,
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#1a7a4a")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#d8d4cc")
                        }
                        placeholder="jane@yourorg.org"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "#444" }}
                      >
                        Password
                      </label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        autoComplete="new-password"
                        className="w-full px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors"
                        style={{
                          border: "1.5px solid #d8d4cc",
                          borderRadius: 8,
                          height: 42,
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#1a7a4a")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#d8d4cc")}
                        placeholder="8+ characters, number, special char"
                      />
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "#444" }}
                      >
                        Confirm password
                      </label>
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        required
                        autoComplete="new-password"
                        className="w-full px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors"
                        style={{
                          border: "1.5px solid #d8d4cc",
                          borderRadius: 8,
                          height: 42,
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#1a7a4a")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#d8d4cc")}
                        placeholder="Re-enter your password"
                      />
                    </div>

                    {/* GiveButter import */}
                    <div
                      className="rounded-xl p-5"
                      style={{ border: "1px solid #e5e1d8", backgroundColor: "#faf9f6" }}
                    >
                      <p
                        className="text-xs font-semibold mb-0.5"
                        style={{ color: "#444" }}
                      >
                        Import from GiveButter{" "}
                        <span className="font-normal" style={{ color: "#aaa" }}>
                          (optional)
                        </span>
                      </p>
                      <p className="text-xs mb-3" style={{ color: "#888" }}>
                        Already on GiveButter? Paste your API key to auto-fill this
                        form. Find it in GiveButter → Settings → API.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={gbApiKey}
                          onChange={(e) => {
                            setGbApiKey(e.target.value);
                            setGbError(null);
                            setGbSuccess(false);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleGbImport()}
                          disabled={gbImporting}
                          placeholder="Your GiveButter API key"
                          className="flex-1 px-3 py-2 border rounded-lg text-sm text-gray-900 outline-none transition-colors"
                          style={{
                            borderColor: gbError ? "#fca5a5" : "#d8d4cc",
                            height: 42,
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleGbImport}
                          disabled={gbImporting || !gbApiKey.trim()}
                          className="px-4 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                          style={{ backgroundColor: "#1a7a4a", height: 42 }}
                        >
                          {gbImporting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Importing…
                            </>
                          ) : (
                            "Import"
                          )}
                        </button>
                      </div>
                      {gbError && (
                        <p
                          className="text-xs mt-2 px-3 py-2 rounded-lg"
                          style={{
                            backgroundColor: "#fef2f2",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                          }}
                        >
                          {gbError}
                        </p>
                      )}
                      {gbSuccess && (
                        <p
                          className="text-xs mt-2 px-3 py-2 rounded-lg font-medium"
                          style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                        >
                          Imported successfully — review the fields and fill in anything
                          missing.
                        </p>
                      )}
                    </div>

                    {/* Error */}
                    {error && (
                      <div
                        ref={errorRef}
                        role="alert"
                        className="px-3.5 py-2.5 rounded-lg text-sm"
                        style={{
                          backgroundColor: "#fef2f2",
                          color: "#dc2626",
                          border: "1px solid #fca5a5",
                        }}
                      >
                        {error}
                      </div>
                    )}

                    {/* Sign-in link — non-preview only */}
                    {!isPreview && (
                      <p className="text-center text-sm text-gray-500">
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
                </div>
              )}
            </div>

            {/* Footer with Back/Continue/Submit */}
            <div
              className="flex items-center justify-between px-10 py-6 mt-2"
              style={{ borderTop: "1px solid #ece8e0" }}
            >
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm font-medium hover:underline min-h-[44px] flex items-center"
                  style={{ color: "#888" }}
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="h-11 px-7 rounded-lg font-semibold text-white text-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="h-11 px-7 rounded-lg font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    backgroundColor: isPreview ? "#b45309" : "#1a7a4a",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : isPreview ? (
                    "Submit Application (Preview)"
                  ) : (
                    "Create account & submit"
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Legal footer — Step 3 non-preview only */}
          {step === 3 && !isPreview && (
            <p className="text-center text-xs text-gray-400 mt-5">
              By submitting you agree to our{" "}
              <a href="/terms" className="underline hover:text-gray-600">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="underline hover:text-gray-600">
                Privacy Policy
              </a>
              .
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
