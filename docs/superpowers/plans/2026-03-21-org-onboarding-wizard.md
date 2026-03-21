# Org Onboarding Wizard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `app/signup/organization/page.tsx` into a 3-step wizard with a warm, professional look and no decorative icons.

**Architecture:** Single file rewrite. All existing logic (API calls, validation, preview mode, GiveButter import, AI autofill) preserved. Add `step: 1 | 2 | 3` state and per-step validation.

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS, lucide-react (Loader2 only)

**Spec:** `docs/superpowers/specs/2026-03-21-org-onboarding-wizard-design.md`

---

## File Map

- **Modify:** `app/signup/organization/page.tsx` — full rewrite of `OrgSignupInner` and success screen; `PreviewSuccessScreen` and `OrgSignupPage` (Suspense wrapper) unchanged

---

### Task 1: Remove icon imports, add step state

**Files:**
- Modify: `app/signup/organization/page.tsx`

- [ ] **Step 1: Update lucide-react import**

Replace the existing icon import block. Keep only `Loader2`:

```tsx
import { Loader2 } from "lucide-react";
```

Remove: `Building2, AlertCircle, CheckCircle, Clock, Users, Check, Download, Sparkles`

- [ ] **Step 2: Add step state inside OrgSignupInner**

After the existing state declarations (around line 119 in current file), add:

```tsx
const [step, setStep] = useState<1 | 2 | 3>(1);
```

- [ ] **Step 3: Check for TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: errors about removed icon references — these will be fixed in subsequent tasks. Note them down.

---

### Task 2: Add per-step validation helper

**Files:**
- Modify: `app/signup/organization/page.tsx`

- [ ] **Step 1: Add `validateStep` function** after the `autoSubcategory` and `selectCategory` declarations

```tsx
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
    return true;
  }

  return true;
}
```

- [ ] **Step 2: Add `handleContinue` and `handleBack`**

```tsx
function handleContinue() {
  if (!validateStep(step)) return;
  setStep((s) => (s < 3 ? (s + 1) as 1 | 2 | 3 : s));
}

function handleBack() {
  setError(null);
  setEinError(null);
  setStep((s) => (s > 1 ? (s - 1) as 1 | 2 | 3 : s));
}
```

- [ ] **Step 3: Simplify `handleSubmit`**

The submit handler (called from Step 3 only) no longer needs to re-validate fields covered by step validation. Replace existing `handleSubmit` with:

```tsx
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!validateStep(3)) return;

  const effectiveSubcategory =
    subOptions.length === 1 ? subOptions[0] : form.subcategory;

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
```

- [ ] **Step 4: Check TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: remaining errors about removed icon references in JSX — those are fixed in the next task.

---

### Task 3: Rewrite the JSX — shell, step indicator, success screen

**Files:**
- Modify: `app/signup/organization/page.tsx`

This is the main visual rewrite. Replace the entire JSX return block of `OrgSignupInner` (from `if (success && isPreview)` through the end of the function).

- [ ] **Step 1: Replace success screen**

Replace the non-preview success screen (currently lines ~296–343):

```tsx
if (success) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: "#faf9f6" }}
    >
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-3xl text-gray-900 mb-4">
          Application submitted
        </h1>
        <p className="text-gray-500 mb-3">
          We received your application for{" "}
          <span className="font-semibold text-gray-800">{form.orgName}</span>.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          We&apos;ll review it and reach out within 2 business days. Once
          approved, we&apos;ll send an invite to{" "}
          <span className="font-medium text-gray-700">{form.email}</span> so
          you can complete your profile.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/discover"
            className="w-full py-3 rounded-xl font-semibold text-white text-center transition-all hover:opacity-90"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Browse Organizations
          </Link>
          <Link
            href="/"
            className="w-full py-3 rounded-xl font-semibold text-center transition-all border"
            style={{ color: "#374151", borderColor: "#e5e1d8" }}
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add shared step indicator component**

Add this helper just before the main return (inside `OrgSignupInner`, after `handleSubmit`):

```tsx
const StepIndicator = () => (
  <div className="flex items-center mb-8">
    {([1, 2, 3] as const).map((n, i) => (
      <React.Fragment key={n}>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors"
          style={
            step >= n
              ? { backgroundColor: "#1a7a4a", color: "white" }
              : {
                  border: "1.5px solid #ccc9c0",
                  color: "#aaa",
                  backgroundColor: "transparent",
                }
          }
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
```

Note: requires `import React from "react"` — confirm it's already present (it is, via "use client").

- [ ] **Step 3: Write the shell return**

Replace the entire main return JSX with the new wizard shell:

```tsx
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
            <StepIndicator />
            {/* Steps rendered here in subsequent tasks */}
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
                className="text-sm font-medium hover:underline"
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
                onClick={handleSubmit as unknown as React.MouseEventHandler}
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
                  "Submit application"
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
```

- [ ] **Step 4: Verify TS + build compiles**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: errors about missing step content inside the card — these are added in Tasks 4–6.

---

### Task 4: Step 1 JSX — Your Organization

**Files:**
- Modify: `app/signup/organization/page.tsx`

- [ ] **Step 1: Replace the `{/* Steps rendered here */}` comment with conditional step content**

Inside the `<div className="px-10 pt-10 pb-0">` block, replace the comment with:

```tsx
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
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: reduced errors — Step 1 content is clean.

---

### Task 5: Step 2 JSX — Your Mission

**Files:**
- Modify: `app/signup/organization/page.tsx`

- [ ] **Step 1: Add Step 2 content after the Step 1 block**

```tsx
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
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: Step 2 errors resolved.

---

### Task 6: Step 3 JSX — Contact & Connect

**Files:**
- Modify: `app/signup/organization/page.tsx`

- [ ] **Step 1: Add Step 3 content after the Step 2 block**

```tsx
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
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: zero errors.

---

### Task 7: Final cleanup and build verification

**Files:**
- Modify: `app/signup/organization/page.tsx`

- [ ] **Step 1: Remove unused TOP_CATEGORIES `Icon` field**

The `TOP_CATEGORIES` array still has `Icon: React.ElementType` and `Icon: Users` which will cause TypeScript errors since `Users` was removed. Update the array:

```tsx
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
```

- [ ] **Step 2: Remove React import if needed**

Check if `React` needs to be explicitly imported for `React.Fragment` in `StepIndicator`. If you see "React is not defined" errors, add `import React from "react"` at the top (below the `"use client"` directive).

- [ ] **Step 3: Full build**

Run: `npm run build 2>&1 | tail -30`

Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 4: Smoke test on dev server**

Run: `npm run dev` and visit `http://localhost:3000/signup/organization`

Verify:
- Step 1 shows: brand name, step dots (1 filled), org name field, website field, review notice, Continue button
- Continue without org name shows inline error
- Continue with valid org name advances to Step 2
- Step 2 shows: category card (no icon), subcategory pills after category selected, EIN field (if applicable), description with "Fill with AI" text button
- Back button on Step 2 returns to Step 1 preserving values
- Step 3 shows: contact name, email, GiveButter section
- Submit without contact name shows inline error
- Submit with all fields proceeds to success screen
- Success screen has no icon circle — just text headings and two CTA buttons

- [ ] **Step 5: Commit**

```bash
git add app/signup/organization/page.tsx docs/superpowers/specs/2026-03-21-org-onboarding-wizard-design.md docs/superpowers/plans/2026-03-21-org-onboarding-wizard.md
git commit -m "redesign org signup as 3-step wizard with clean professional UI"
```
