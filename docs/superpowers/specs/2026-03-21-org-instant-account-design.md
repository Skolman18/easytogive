# Org Instant Account Creation — Design Spec

## Problem

Today, org reps submit an application and then wait for admin approval before receiving an email invite to create their account. They have no way to prepare their profile during the review period. This creates unnecessary friction and drop-off.

## Goal

Orgs create their account at application time. After submitting, they are immediately logged in and land on their dashboard where they can edit their profile freely. Their profile stays hidden from donors (`visible: false`) until admin approves.

---

## Lifecycle Change

| Stage | Before | After |
|---|---|---|
| **Applied** | `org_applications` row only, no auth user | `org_applications` + `organizations` (visible: false) + auth user + `users` row |
| **Pending** | No access | Can log in, edit profile, set up Stripe Connect |
| **Approved** | Org row created, invite email sent | `visible` flipped to `true`, "you're live" email sent |
| **Live** | Same | Same |

---

## Changes

### 1. Org Signup Wizard — Step 3 (`app/signup/organization/page.tsx`)

**New fields added to Step 3** (below email, above GiveButter section):

- **Password** — `type="password"`, same styling as other inputs, `autoComplete="new-password"`
- **Confirm password** — `type="password"`, same styling, `autoComplete="new-password"`

**Validation in `validateStep(3)`** (added after email check):
- Password required
- Password minimum 8 characters
- Password must contain at least one number
- Password must contain at least one special character (`/[^a-zA-Z0-9]/`)
- Confirm password must match password

**`handleSubmit` rewritten** — no longer shows success screen. New flow:
1. Call `validateStep(3)` (already calls on step 3)
2. POST to `/api/org/apply` with all form fields + `password`
3. On success: call `supabase.auth.signInWithPassword({ email, password })` (browser client)
4. On sign-in success: `router.push("/org/dashboard")`
5. On API error: show `setError(data.error)` — same as today
6. On sign-in error after successful apply: show "Account created — please sign in at /auth/signin"

**Success screen removed** — redirect replaces it. Delete ONLY the non-preview `if (success)` block (the one that shows "Application submitted" with Browse/Return links). The `if (success && isPreview)` block that renders `PreviewSuccessScreen` must be kept — preview mode is unaffected.

**Submit button label**: "Create account & submit" (instead of "Submit application")

---

### 2. Apply API (`app/api/org/apply/route.ts`)

Accept `password` in request body. Full new flow (all operations use service role client):

**Step 1 — Validate password server-side**
- Required, 8+ chars, has number, has special char
- Return 400 if invalid

**Step 2 — Create auth user**
```typescript
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: form.email,
  password: form.password,
  email_confirm: true,        // skip email verification
  user_metadata: { account_type: "organization", org_name: form.orgName },
});
```
- If `authError.message` includes "already registered": return `{ error: "An account with this email already exists. Please sign in." }` with status 409
- Any other auth error: return 500

**Step 3 — Insert `org_applications`**
Same as today: `status: "pending"`, all form fields.

**Step 4 — Generate org slug**
Same logic as the current approval handler: lowercase org name, replace non-alphanumeric with `-`, max 60 chars, check for collision and append 5-char suffix if needed.

**Step 5 — Insert `organizations`**
```typescript
{
  id: orgSlug,
  name: form.orgName,
  tagline: "",
  description: form.description,
  category: form.category,
  subcategory: form.subcategory || null,
  contact_email: form.email,
  ein: form.ein || null,
  website: form.website || null,
  visible: false,
  verified: false,
  featured: false,
  raised: 0,
  goal: 0,
  donors: 0,
  owner_user_id: authData.user.id,
}
```

**Step 6 — Insert `users` row**
```typescript
{
  id: authData.user.id,
  email: form.email,
  full_name: form.contactName,
  onboarding_complete: true,   // prevents redirect to donor onboarding on login
}
```

**Rollback on failure:**
- If Step 3 (`org_applications` insert) fails: delete auth user, return 500. No org_applications row was written so nothing else to clean up.
- If Step 5 (`organizations` insert) fails: delete auth user, delete the `org_applications` row (to avoid orphaned pending application with no corresponding account), return 500.
- If Step 6 (`users` insert) fails: delete auth user, delete the `org_applications` row, delete the `organizations` row, return 500.

**Return on success:** `{ success: true }` — no session returned (client calls `signInWithPassword` separately)

---

### 3. Admin Approval (`app/api/org/applications/route.ts`)

**Remove:**
- Org slug generation logic
- Collision check
- `organizations` INSERT
- `supabase.auth.admin.inviteUserByEmail` call

**Replace with:**
```typescript
// Find the org row by owner_user_id (set at apply time)
// First, look up the auth user id for this email
const { data: authUser } = await supabase.auth.admin.getUserByEmail(data.email);
const ownerId = authUser?.user?.id ?? null;

const { data: orgRows, error: visibleError } = await supabase
  .from("organizations")
  .update({ visible: true })
  .eq(ownerId ? "owner_user_id" : "contact_email", ownerId ?? data.email)
  .select("id");

if (visibleError || !orgRows || orgRows.length === 0) {
  // revert application status to pending
  await supabase.from("org_applications").update({ status: "pending" }).eq("id", data.id);
  return NextResponse.json({ error: "Could not activate organization — org record not found." }, { status: 500 });
}

const orgId = orgRows[0].id;
```

This uses `owner_user_id` as the match key (set at apply time) to avoid a non-unique `contact_email` collision. Falls back to `contact_email` only if the auth user lookup fails. Checks that exactly one row was updated and reverts on zero matches.

**Remove:** all existing org slug generation, collision check, `existingOrg` guard (the `select("id").eq("contact_email", ...)` block), `organizations` INSERT, and `inviteUserByEmail` call — these are no longer needed since the org row is created at apply time.

**Email:** Call new `sendGoLiveEmail({ to: data.email, orgName: data.org_name, orgId })` instead of `sendApprovalEmail`. Non-critical — continue on failure.

---

### 4. Go-Live Email (`lib/email.ts`)

Add `sendGoLiveEmail` function:

```typescript
export async function sendGoLiveEmail({
  to,
  orgName,
  orgId,
}: {
  to: string;
  orgName: string;
  orgId: string;
}): Promise<void>
```

Subject: `"${orgName} is now live on EasyToGive"`

Content (same HTML template system as existing emails):
- Heading: "You're live!"
- Body: "${orgName} has been approved and is now visible to donors on EasyToGive."
- CTA button: "Go to your dashboard →" linking to `https://easytogive.online/org/dashboard`
- No "create account" instructions — they already have one

---

### 5. Org Dashboard — Pending Banner (`app/org/dashboard/page.tsx`)

When `selectedOrg.visible === false` and the user is not an admin, show a banner below the page header (above the stats/edit section):

```
┌──────────────────────────────────────────────────────────┐
│  Your application is under review                        │
│  Your profile won't appear publicly until we approve it. │
│  You can set up everything now — we'll let you know      │
│  when you're live.                                        │
└──────────────────────────────────────────────────────────┘
```

Styled: `#faf9f6` background, `#e5e1d8` border, `#1a1a18` text, `border-radius: 12px`, `padding: 16px 20px`. No icon. Disappears automatically once `visible: true`.

---

## Error Cases

| Scenario | Handling |
|---|---|
| Email already has an account | 409 from API → "An account with this email already exists. Please sign in." |
| Password too weak (client-side) | validateStep(3) blocks advance, shows inline error |
| Password too weak (server-side) | 400 → error shown in form |
| Org name generates duplicate slug | Auto-append 5-char suffix (same as current approval logic) |
| API succeeds but signInWithPassword fails | Show "Account created — please sign in" with link to /auth/signin |
| Org table insert fails | Auth user deleted, 500 returned, user sees error in form |
| Admin approves but visible update fails | Application reverted to pending, admin sees error |

---

## Preserved Behaviors

- Preview mode (`?preview=true`) in org signup: unchanged — still shows PreviewSuccessScreen, no account created
- Rate limiting on `/api/org/apply`: unchanged (5 per IP per hour)
- Rejection flow in admin: unchanged — org row now exists but stays `visible: false`
- GiveButter import in Step 3: unchanged
- AI autofill for description: unchanged
- Org dashboard Stripe Connect: works immediately after account creation
- Auth callback (`/auth/callback`): org reps have `onboarding_complete: true` in `users` table so they bypass the donor onboarding redirect on any future magic-link or OAuth login. The initial `signInWithPassword` flow goes directly to `/org/dashboard` and does not hit `/auth/callback`.

## Out of Scope

- Changing the rejection email or rejection flow
- Changing how `visible` is set to `true` (admin-only, no change)
- Self-serve re-application if rejected
- Password reset flow (Supabase built-in handles this)
