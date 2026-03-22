# CauseCard Save Feature — Design Spec

## Problem

Donors browsing organizations have no way to bookmark orgs they're interested in for later. Organization profiles lack a location and some orgs don't have logos uploaded at apply time, leaving them with an initial-letter placeholder.

---

## Changes

### 1. OrgCard — Save Button

Add a Save/bookmark button to `components/OrgCard.tsx`. No structural changes to the card layout — the button slots into the existing bottom action bar alongside "Add to Portfolio".

**New props on `OrgCardProps`:**
```typescript
isSaved?: boolean;
onSaveToggle?: () => void;
```

**Behavior:**
- Renders a bookmark icon button (Lucide `Bookmark`) in the bottom action area alongside the existing "Add to Portfolio" button
- If `onSaveToggle` is not provided, the button is not rendered (backward compatible — existing usages of OrgCard unaffected)
- Optimistic UI: icon fills immediately on click; API call fires in background; reverts on failure with a toast error
- While logged out: clicking Save redirects to `/auth/signin?redirectTo=/discover`
- Saved state: filled bookmark icon (`fill-current`), color `#1a7a4a`; unsaved: outline bookmark, color `#5c5b56`

---

### 2. Database — `saved_orgs` table

New migration:

```sql
create table saved_orgs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id text not null references organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, org_id)
);

alter table saved_orgs enable row level security;

create policy "Users can manage their own saves"
  on saved_orgs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

### 3. API Endpoints

**`POST /api/saved-orgs/[orgId]/route.ts`** — Save an org (upsert; safe to call twice)
- Auth required; return 401 if no session
- Upsert into `saved_orgs` with `onConflict: "user_id,org_id"`
- Return `{ saved: true }`

**`DELETE /api/saved-orgs/[orgId]/route.ts`** — Unsave
- Auth required; return 401 if no session
- Delete row matching `(user_id, org_id)`
- Return `{ saved: false }`

Both endpoints use the Supabase server client (cookie-based auth, not service role).

---

### 4. Discover Page Wire-up

The discover page is currently a server component (`app/discover/page.tsx`) that passes orgs to `DiscoverClient`. Saved state is user-specific so it must be fetched client-side.

**`DiscoverClient`** (already a client component):
- On mount, if user is logged in: fetch `saved_orgs` rows for the current user and build a `Set<string>` of saved org IDs
- Pass `isSaved={savedOrgIds.has(org.id)}` and `onSaveToggle={() => handleSaveToggle(org.id)}` to each OrgCard
- `handleSaveToggle`: optimistically updates local `savedOrgIds` state, calls POST or DELETE, reverts on error

---

### 5. Wallet Page — Saved Section

Add a "Saved Organizations" section to `app/wallet/page.tsx`.

- Positioned below the donations list (or as a new tab — inline section is simpler and doesn't require tab restructuring)
- Fetch saved orgs: join `saved_orgs` with `organizations` to get full org rows
- Render in a responsive grid (same 2-col mobile / 3-col tablet layout as discover page)
- OrgCards here also get `isSaved={true}` and `onSaveToggle` wired up (removing from list optimistically on unsave)
- Empty state: "No saved organizations yet. [Browse organizations →](/discover)"

---

### 6. Org Dashboard — Location Field

`location` already exists in `organizations` table and `database.types.ts` but is not currently editable in the org dashboard.

Add a "Location" text input to the org profile editor in `app/org/dashboard/page.tsx`:
- Label: "Location"
- Placeholder: "City, State" or "City, Country"
- Field name: `location`
- Positioned after the org name / tagline fields
- Saved via the existing profile update mutation (same `organizations` upsert pattern already in the dashboard)

---

### 7. Org Signup Wizard — Logo Upload

`app/signup/organization/page.tsx` currently has no logo upload. Add an optional image upload field to Step 3 (the submission step, after contact info).

**Behavior:**
- Optional — org can skip and upload later from dashboard
- Label: "Organization Logo (optional)"
- Accepts: jpg, png, webp (matches existing `org-images` bucket policy)
- Max size: 5MB (matches bucket policy)
- On select: upload directly from the browser client (using `supabase-browser`) to the `org-images` bucket at path `temp/{timestamp}-{filename}`. The existing `/api/org/upload-image` endpoint requires an `orgId` which doesn't exist yet, so direct client upload is used instead. The returned public URL is passed as `image_url` in the apply API body and stored on the `organizations` row during the Step 5 insert.
- Preview: show thumbnail after upload
- The apply API (`app/api/org/apply/route.ts`) already creates the `organizations` row — add `image_url` to the insert payload if provided

---

## File Map

| File | Change |
|---|---|
| `components/OrgCard.tsx` | Add `isSaved?`, `onSaveToggle?` props; add Save button in bottom action bar |
| `app/discover/DiscoverClient.tsx` | Fetch saved org IDs on mount; wire `isSaved`/`onSaveToggle` to each OrgCard |
| `app/wallet/page.tsx` | Add Saved Organizations section with fetched org rows and OrgCards |
| `app/api/saved-orgs/[orgId]/route.ts` | New file: POST (save) and DELETE (unsave) handlers |
| `supabase/migrations/YYYYMMDD_saved_orgs.sql` | New `saved_orgs` table with RLS |
| `app/org/dashboard/page.tsx` | Add Location text input to profile editor |
| `app/signup/organization/page.tsx` | Add optional logo upload field to Step 3 |
| `app/api/org/apply/route.ts` | Accept `image_url` in body; add to `organizations` insert |
| `lib/database.types.ts` | Add `saved_orgs` table type definition |

---

## Error Cases

| Scenario | Handling |
|---|---|
| Save while logged out | Redirect to `/auth/signin?redirectTo=/discover` |
| Save API fails | Revert optimistic state; show toast error |
| Duplicate save (double-click) | Upsert is idempotent — no error |
| Logo upload > 5MB | Client-side check before upload; show inline error |
| Logo upload fails | Non-blocking; org created without `image_url`; show inline error |

---

## Preserved Behaviors

- All existing OrgCard usages (discover, wallet, org pages) are unaffected — `isSaved` and `onSaveToggle` are optional props
- Portfolio button remains unchanged
- Existing org dashboard profile save logic unchanged — location field is additive
- Org apply flow unchanged except for optional `image_url` field

---

## Out of Scope

- Saved org notifications (e.g., email when a saved org posts an update)
- Sorting/filtering saved orgs
- Sharing saved lists
- `List-Unsubscribe-Post` endpoint (already deferred in email deliverability spec)
