# EasyToGive — Codebase Audit

Summary of findings and improvements applied.

---

## Security

### Fixed

- **Autofill API (SSRF)**  
  The `/api/autofill-org` endpoint accepted any URL and fetched it server-side. It now allows only `https:` URLs and rejects localhost, `127.0.0.1`, and private IP ranges (`192.168.*`, `10.*`, `172.16.*`).

- **Create Payment Intent**  
  - Returns 503 when `STRIPE_SECRET_KEY` is missing instead of throwing.  
  - Rate limited (30 requests per IP per hour) to reduce abuse.  
  - Request body validated: `amountCents` must be a number; `description` and `metadata` are length‑capped and sanitized.

- **Recurring donations**  
  Starting a recurring donation now requires a logged-in user; no more inserts with `user_id: null`.

- **Env handling**  
  - `lib/supabase.ts` uses `getRequiredEnv()` so missing Supabase env vars produce a clear error.  
  - Layout env audit now includes `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

### Recommended (not yet done)

- **Payment Intent and auth**  
  Consider requiring a signed-in user for creating payment intents and storing `user_id` in Stripe metadata so donations are tied to accounts and abuse is easier to trace.

- **Stripe webhooks**  
  If you record donations or update state via webhooks, add a dedicated webhook route that verifies `Stripe-Signature` and handles idempotency.

- **RLS**  
  Ensure Supabase RLS policies restrict `recurring_donations`, `portfolio_allocations`, and `users` so clients can only read/update their own rows.

---

## Reliability & robustness

### Fixed

- **Autofill**  
  - Returns 503 when `GROQ_API_KEY` is missing.  
  - JSON body is parsed in a try/catch; invalid JSON returns 400.

- **Payment Intent**  
  - JSON body parsed in try/catch.  
  - `description` default when missing or invalid; metadata keys/values length‑limited to match Stripe limits.

- **Rate limiting**  
  `lib/rateLimit.ts` is documented as in-memory and single-instance; for serverless/multi-instance, consider Redis or similar.

---

## Code quality & types

### Current state

- **`(supabase as any)`**  
  Used in many places because generated `database.types.ts` does not include:
  - Tables: `missionaries`, `recurring_donations`, `site_settings`
  - Columns on `users`: e.g. `onboarding_complete`, `city`, `state`, `lat`, `lng`, `causes`

### Recommended

- Regenerate or extend Supabase types (e.g. `supabase gen types`) to include all tables and columns, then remove `as any` and use typed `supabase.from('table')` everywhere.
- Add a shared type for “user profile” (including onboarding and location) and use it in auth callback and profile pages.

---

## Other notes

- **Server Supabase client**  
  `app/page.tsx`, `app/discover/page.tsx`, and `app/sitemap.ts` use `lib/supabase.ts` (anon key, no cookies). For public data this is fine; for any user-scoped data in those routes, switch to `createClient()` from `lib/supabase-server.ts`.

- **Middleware**  
  No `middleware.ts` found. If you add protected routes or need to refresh Supabase session on every request, consider Next.js middleware that calls `createServerClient` and refreshes the session.

- **Edit mode**  
  `EditableField` and admin UI update `site_settings` and `organizations`. Ensure only admin users can access those endpoints (e.g. by checking a role in RLS or in API route handlers).
