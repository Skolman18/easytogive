# Org Instant Account Creation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create org accounts at application time so reps can log in and edit their profile immediately, without waiting for admin approval.

**Architecture:** Add password fields to the signup wizard Step 3. The apply API creates an auth user + org row (visible: false) + users row atomically with rollback. Admin approval simply flips visible to true. The org dashboard gains a "pending review" banner for non-visible orgs.

**Tech Stack:** Next.js 16 App Router, Supabase (service role admin API), Resend (email), supabase-browser client for client-side signInWithPassword.

**Spec:** `docs/superpowers/specs/2026-03-21-org-instant-account-design.md`

---

## File Map

| File | Change |
|---|---|
| `lib/email.ts` | Add `sendGoLiveEmail` function |
| `app/api/org/apply/route.ts` | Rewrite: accept password, create auth user + org + users rows, rollback |
| `app/api/org/applications/route.ts` | Replace org creation + invite with visible flip + sendGoLiveEmail |
| `app/signup/organization/page.tsx` | Add password/confirm fields to Step 3, update validation + handleSubmit |
| `app/org/dashboard/page.tsx` | Add pending review banner when visible === false |

---

### Task 1: Add `sendGoLiveEmail` to `lib/email.ts`

**Files:**
- Modify: `lib/email.ts`

- [ ] **Step 1: Add the function at the end of `lib/email.ts`**

Append after the last export in the file:

```typescript
export async function sendGoLiveEmail({
  to,
  orgName,
  orgId,
}: {
  to: string;
  orgName: string;
  orgId: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const dashboardUrl = "https://easytogive.online/org/dashboard";
  const orgUrl = `https://easytogive.online/org/${orgId}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#faf9f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:white;border-radius:16px;border:1px solid #e5e1d8;overflow:hidden;">
        <tr>
          <td style="background:#1a7a4a;padding:28px 32px;text-align:center;">
            <p style="margin:0;color:white;font-size:22px;font-weight:700;">EasyToGive</p>
            <p style="margin:6px 0 0;color:#bbf7d0;font-size:13px;">You're live!</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;">
            <p style="margin:0 0 16px;color:#111827;font-size:16px;font-weight:700;">${orgName} is now live on EasyToGive</p>
            <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.7;">
              Your organization has been approved and is now visible to donors on EasyToGive.
              Donors can find your page and start giving today.
            </p>
            <div style="margin-bottom:24px;">
              <a href="${dashboardUrl}" style="display:inline-block;background:#1a7a4a;color:white;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
                Go to your dashboard →
              </a>
            </div>
            <p style="margin:0;color:#6b7280;font-size:13px;">
              You can also view your public page at:
              <a href="${orgUrl}" style="color:#1a7a4a;text-decoration:none;">${orgUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:14px 32px;border-top:1px solid #e5e1d8;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:11px;">EasyToGive · receipts@easytogive.online</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `${orgName} is now live on EasyToGive`,
      html,
    });
  } catch (err) {
    console.error("Failed to send go-live email:", err);
  }
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts
git commit -m "feat: add sendGoLiveEmail for org approval notification"
```

---

### Task 2: Rewrite the apply API

**Files:**
- Modify: `app/api/org/apply/route.ts`

This is a full rewrite of the route. Replace the entire file contents with the following:

- [ ] **Step 1: Replace the entire file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["community"];

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function generateOrgSlug(orgName: string): string {
  return orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/\d/.test(password)) return "Password must contain at least one number.";
  if (!/[^a-zA-Z0-9]/.test(password)) return "Password must contain at least one special character.";
  return null;
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = checkRateLimit(ip, "org-apply", 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: {
    org_name?: string;
    contact_name?: string;
    email?: string;
    website?: string;
    ein?: string;
    category?: string;
    subcategory?: string;
    description?: string;
    password?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { org_name, contact_name, email, website, ein, category, subcategory, description, password } = body;

  // Validate required fields
  if (!org_name?.trim()) return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  if (!contact_name?.trim()) return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
  if (!email?.trim() || !email.includes("@")) return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "A brief description of your mission is required." }, { status: 400 });
  if (!category?.trim()) return NextResponse.json({ error: "Category is required." }, { status: 400 });
  if (!VALID_CATEGORIES.includes(category.trim())) return NextResponse.json({ error: "Invalid category." }, { status: 400 });

  // Validate password
  const passwordError = validatePassword(password ?? "");
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  // Step 2: Create auth user (email_confirm: true skips verification email)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: password!,
    email_confirm: true,
    user_metadata: { account_type: "organization", org_name: org_name.trim() },
  });

  if (authError) {
    const alreadyExists =
      authError.message.toLowerCase().includes("already registered") ||
      authError.message.toLowerCase().includes("already been registered") ||
      authError.message.toLowerCase().includes("already exists");
    if (alreadyExists) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }
    console.error("Auth user creation failed:", authError.message);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }

  const userId = authData.user.id;

  // Step 3: Insert org_applications
  const { error: appError } = await supabase.from("org_applications").insert({
    org_name: org_name.trim().slice(0, 200),
    contact_name: contact_name.trim().slice(0, 200),
    email: normalizedEmail.slice(0, 200),
    website: (website ?? "").trim().slice(0, 500),
    ein: (ein ?? "").trim().slice(0, 20),
    category: category.trim().slice(0, 50),
    subcategory: (subcategory ?? "").trim().slice(0, 50),
    description: description.trim().slice(0, 2000),
    status: "pending",
  });

  if (appError) {
    console.error("org_applications insert error:", appError);
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Failed to submit application. Please try again." }, { status: 500 });
  }

  // Step 4: Generate org slug (check for collision)
  const baseSlug = generateOrgSlug(org_name.trim());
  let orgSlug = baseSlug;
  const { data: existingSlug } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", baseSlug)
    .maybeSingle();
  if (existingSlug) {
    orgSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Step 5: Insert organizations row (visible: false — hidden until approved)
  const { error: orgError } = await supabase.from("organizations").insert({
    id: orgSlug,
    name: org_name.trim().slice(0, 200),
    tagline: "",
    description: description.trim().slice(0, 2000),
    category: category.trim().slice(0, 50),
    subcategory: (subcategory ?? "").trim().slice(0, 50) || null,
    contact_email: normalizedEmail,
    ein: (ein ?? "").trim().slice(0, 20) || null,
    website: (website ?? "").trim().slice(0, 500) || null,
    visible: false,
    verified: false,
    featured: false,
    raised: 0,
    goal: 0,
    donors: 0,
    owner_user_id: userId,
  });

  if (orgError) {
    console.error("organizations insert error:", orgError);
    await supabase.auth.admin.deleteUser(userId);
    await supabase.from("org_applications").delete().eq("email", normalizedEmail).eq("status", "pending");
    return NextResponse.json({ error: "Failed to create organization profile. Please try again." }, { status: 500 });
  }

  // Step 6: Insert users row (onboarding_complete: true prevents donor onboarding redirect)
  const { error: userError } = await supabase.from("users").insert({
    id: userId,
    email: normalizedEmail,
    full_name: contact_name.trim().slice(0, 200),
    onboarding_complete: true,
  });

  if (userError) {
    console.error("users insert error:", userError);
    await supabase.auth.admin.deleteUser(userId);
    await supabase.from("org_applications").delete().eq("email", normalizedEmail).eq("status", "pending");
    await supabase.from("organizations").delete().eq("id", orgSlug);
    return NextResponse.json({ error: "Failed to set up account. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/org/apply/route.ts
git commit -m "feat: create auth user + org row at apply time"
```

---

### Task 3: Rewrite the admin approval handler

**Files:**
- Modify: `app/api/org/applications/route.ts`

Replace only the `if (status === "approved" && data.email)` block (lines 112–208 in the current file). The GET handler, `requireAdmin`, and surrounding PATCH boilerplate stay unchanged.

- [ ] **Step 1: Update the import at the top**

Change line 4 from:
```typescript
import { sendApprovalEmail } from "@/lib/email";
```
To:
```typescript
import { sendGoLiveEmail } from "@/lib/email";
```

- [ ] **Step 2: Replace the approval block**

Find and replace the entire block:
```typescript
// On approval: create org record, send email, invite org rep
if (status === "approved" && data.email) {
  // ... everything through the closing `}` of this block ...
}
```

Replace with:

```typescript
// On approval: flip org to visible and send go-live email
if (status === "approved" && data.email) {
  // Look up the auth user to match by owner_user_id (more reliable than contact_email)
  const { data: authUser } = await supabase.auth.admin.getUserByEmail(data.email);
  const ownerId = authUser?.user?.id ?? null;

  const { data: orgRows, error: visibleError } = await supabase
    .from("organizations")
    .update({ visible: true })
    .eq(ownerId ? "owner_user_id" : "contact_email", ownerId ?? data.email)
    .select("id");

  if (visibleError || !orgRows || orgRows.length === 0) {
    console.error("Failed to activate org:", visibleError?.message ?? "no rows matched");
    // Revert the status change so admin can retry
    await supabase
      .from("org_applications")
      .update({ status: "pending", reviewed_at: null })
      .eq("id", id);
    return NextResponse.json(
      { error: "Could not activate organization — org record not found. Was the application submitted through the new wizard?" },
      { status: 500 }
    );
  }

  const orgId = orgRows[0].id;

  // Send go-live email (non-critical — continue even if it fails)
  await sendGoLiveEmail({
    to: data.email,
    orgName: data.org_name,
    orgId,
  });
}
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/org/applications/route.ts
git commit -m "feat: approval now flips visible=true instead of creating org row"
```

---

### Task 4: Add password fields to the org signup wizard

**Files:**
- Modify: `app/signup/organization/page.tsx`

- [ ] **Step 1: Add password/confirmPassword to form state**

Find the `useState` for `form` (has `orgName`, `contactName`, `email`, etc.). Add two new fields:

```tsx
const [form, setForm] = useState({
  orgName: "",
  contactName: "",
  email: "",
  website: "",
  ein: "",
  category: "",
  subcategory: "",
  description: "",
  password: "",        // ADD
  confirmPassword: "", // ADD
});
```

- [ ] **Step 2: Add password validation to `validateStep(3)`**

In `validateStep`, after the email format check in the `s === 3` branch, add:

```tsx
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
```

- [ ] **Step 3: Rewrite `handleSubmit`**

Replace the current `handleSubmit` function with:

```tsx
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
```

Note: this requires `createClient` from `@/lib/supabase-browser` and `useRouter` from `next/navigation` — both are already imported in this file. Verify the import: `import { createClient } from "@/lib/supabase-browser";`

- [ ] **Step 4: Add password + confirm fields to the Step 3 JSX**

In the Step 3 JSX block (`{step === 3 && (...)}` inside `OrgSignupInner`), add these two field divs **between the email field and the GiveButter section**:

```tsx
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
```

- [ ] **Step 5: Delete the non-preview success screen**

Find and delete the `if (success)` block that renders the "Application submitted" screen with "Browse Organizations" and "Return to Home" links. This is the block that comes AFTER `if (success && isPreview) { return <PreviewSuccessScreen ... />; }`. The preview block must remain.

- [ ] **Step 6: Update the submit button label**

Find the submit button text (currently "Submit application" / "Submit Application (Preview)"). Change non-preview label to:
```tsx
"Create account & submit"
```
Preview label stays as "Submit Application (Preview)".

- [ ] **Step 7: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: zero errors. If you see `createClient` not found, check the import — it should be `import { createClient } from "@/lib/supabase-browser"`.

- [ ] **Step 8: Commit**

```bash
git add app/signup/organization/page.tsx
git commit -m "feat: add password fields to org signup, redirect to dashboard on submit"
```

---

### Task 5: Add pending review banner to org dashboard

**Files:**
- Modify: `app/org/dashboard/page.tsx`

- [ ] **Step 1: Find where to insert the banner**

In `OrgDashboardInner`, find where `selectedOrg` is rendered — specifically, find the section just after the org is selected and the main content begins. Look for a heading or the stats display area. The banner should appear above the main org content, below any page header.

Search for a JSX block like:
```tsx
{selectedOrg && (
```
or the section where `selectedOrg.name` is first displayed.

- [ ] **Step 2: Insert the banner**

Add this immediately inside the `{selectedOrg && (...)}` rendering section, as the first child element, before any stats/edit content:

```tsx
{/* Pending review banner — shown when org is not yet visible to donors */}
{!selectedOrg.visible && !isAdmin && (
  <div
    className="mb-6 px-5 py-4 rounded-xl text-sm leading-relaxed"
    style={{
      backgroundColor: "#faf9f6",
      border: "1px solid #e5e1d8",
      color: "#1a1a18",
    }}
  >
    <p className="font-semibold mb-1">Your application is under review</p>
    <p style={{ color: "#5c5b56" }}>
      Your profile won&apos;t appear publicly until we approve it. You can set
      up everything now — we&apos;ll let you know when you&apos;re live.
    </p>
  </div>
)}
```

`isAdmin` is already computed in the component as `user.email === ADMIN_EMAIL`.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/org/dashboard/page.tsx
git commit -m "feat: show pending review banner on org dashboard when not yet visible"
```

---

### Task 6: Build verification and smoke test

**Files:** none

- [ ] **Step 1: Full build**

Run: `npm run build 2>&1 | tail -20`

Expected: `ok (no errors)` or clean route table with no TypeScript errors.

- [ ] **Step 2: Manual smoke test checklist**

Start dev server: `npm run dev`

1. Visit `http://localhost:3000/signup/organization`
2. Complete Steps 1 and 2 with valid data
3. On Step 3: verify password and confirm password fields appear below email, above GiveButter section
4. Try clicking "Create account & submit" with a weak password (e.g. "password") — verify error appears
5. Try mismatched confirm — verify "Passwords do not match" error
6. Fill a strong password (e.g. "Test1234!") and valid email — verify form submits and redirects to `/org/dashboard`
7. On the dashboard: verify the pending review banner is visible ("Your application is under review")
8. The org should be accessible but the banner should be gone once `visible = true` in DB

- [ ] **Step 3: Push to origin**

```bash
git push origin main
```
