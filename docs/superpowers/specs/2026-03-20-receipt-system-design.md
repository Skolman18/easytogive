# Receipt System Design
**Date:** 2026-03-20
**Project:** EasyToGive
**Status:** Approved

---

## Overview

Add server-side PDF receipt generation to EasyToGive's existing donation flow. When a donor completes a payment via Stripe, the system generates a PDF receipt, stores it in Supabase Storage, attaches it to the confirmation email, and makes it downloadable from the donor portfolio.

The existing system already sends HTML receipt emails and has a browser-printable `/receipts/[id]` page. This design extends it — adding a real PDF file — without replacing any working functionality.

---

## Goals

- PDF attached to the receipt email in the donor's inbox
- PDF downloadable from the donor portfolio (no print dialog)
- Combined portfolio summary receipt + individual per-org receipts for split donations
- Donation never blocked by a PDF failure — graceful fallback to existing HTML email

---

## Database

### New table: `receipts`

Migration file: `supabase/migrations/20260320000001_receipts_table.sql`

```sql
CREATE TABLE receipts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id          uuid REFERENCES auth.users(id), -- nullable for guest donors
  payment_intent_id text NOT NULL,
  donation_ids      uuid[],          -- donation row IDs covered by this receipt
  org_id            text REFERENCES organizations(id), -- null for portfolio_summary; is a text slug e.g. 'grace-community-church'
  type              text NOT NULL CHECK (type IN ('individual', 'portfolio_summary')),
  amount            integer NOT NULL, -- cents
  receipt_number    text UNIQUE NOT NULL, -- RCP-{timestamp}-{6-char random}
  pdf_url           text,             -- null until generated; Supabase Storage path
  pdf_status        text NOT NULL DEFAULT 'pending'
                        CHECK (pdf_status IN ('pending', 'generated', 'failed')),
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX receipts_donor_id_idx ON receipts(donor_id);
CREATE INDEX receipts_payment_intent_id_idx ON receipts(payment_intent_id);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Donors can read their own receipts (null donor_id = guest, never matches)
CREATE POLICY "Donors read own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = donor_id);

-- No service_role policy needed: Supabase service role bypasses RLS entirely.
-- Webhook writes use the service role client and are not subject to RLS.
```

### New Storage bucket

Migration file: `supabase/migrations/20260320000002_receipts_storage.sql`

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,       -- private: access via signed URLs only
  5242880,     -- 5 MB
  ARRAY['application/pdf']
);

-- Only service role (webhook) may upload; no public read
CREATE POLICY "Service role upload receipts"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Service role update receipts"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users download own receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### Receipt rows per payment type

| Payment type | Rows created |
|---|---|
| Single-org donation | 1 `individual` row |
| Portfolio donation (N orgs, each > $0) | 1 `portfolio_summary` + N `individual` rows |
| Recurring (per invoice) | Same as single-org or portfolio |

Zero-amount allocations are excluded (the webhook already filters them via `.filter(a => a.amountCents > 0)`), so a 3-org portfolio where one org has 0% receives 2 individual receipts, not 3. This is intentional.

### Receipt number format

`RCP-{unix-timestamp-ms}-{6-char-uppercase-random}`

Example: `RCP-1742476800000-A3F9KX`

### Guest donors

`donor_id` is nullable. Guest donors (no Supabase user) have `donor_id = null`. The RLS policy `auth.uid() = donor_id` will never match null — guest donors cannot retrieve receipts via the API. The PDF email attachment is their only delivery mechanism, which makes the graceful fallback even more critical for this case.

When `donor_id` is null, the webhook should **skip the Supabase Storage upload** (the file would land at a literal `null/{receipt_id}.pdf` path and be unreachable). The PDF buffer is still generated and attached to the email; only the storage step is skipped. `pdf_url` remains null and `pdf_status` is set to `'generated'` to reflect that the PDF was successfully produced and delivered (even though no file is stored).

---

## PDF Generation

### Library

`pdfkit` — pure JavaScript, no binary dependencies, works on Vercel serverless and any VPS. Install: `npm install pdfkit @types/pdfkit`.

### pdfkit streaming note

pdfkit is a Node.js Readable stream, not a promise-based API. The function signature returns `Promise<Buffer>` by manually accumulating stream events:

```ts
function generateReceiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    // ... build document ...
    doc.end();
  });
}
```

### File: `lib/generateReceiptPdf.ts`

```ts
interface ReceiptPdfInput {
  receiptNumber: string;
  donorName: string;
  donorEmail: string;
  createdAt: Date;
  type: 'individual' | 'portfolio_summary';
  orgs: Array<{
    name: string;
    ein: string | null;
    address: string | null; // NOTE: organizations table has no address column — will always be null until one is added
  amount: number; // cents
  }>;
  totalAmount: number; // cents
}
```

The `address` field is included for forward compatibility but will always be `null` with the current schema. The PDF layout must handle `null` gracefully (omit the address line).

### PDF layout (letter size, 8.5×11)

1. **Header** — "EasyToGive" wordmark in #1a7a4a, "Donation Receipt" right-aligned
2. **Divider line** in #1a7a4a
3. **Receipt metadata** — Receipt #, Date, Donor name, Donor email
4. **Donation table** — columns: Organization | EIN | Amount
   - One row for individual receipts
   - Multiple rows + total row for portfolio summaries
5. **Tax statement** — "This donation is tax-deductible to the extent provided by law. [Org Name] is a verified 501(c)(3) nonprofit organization." Lists all orgs for portfolio type.
6. **Footer** — "Thank you for your generosity. Visit easytogive.online for impact updates."

Design: clean, monochrome with #1a7a4a accents on header and dividers.

---

## Supabase Storage

**Bucket:** `receipts` (private)

**Path structure:** `{donor_id}/{receipt_id}.pdf`

**Access:** Short-lived signed URLs (1-hour expiry). The download API route generates and redirects to the signed URL:

```ts
const { data, error } = await supabaseServiceRole
  .storage
  .from('receipts')
  .createSignedUrl(`${receipt.donor_id}/${receipt.id}.pdf`, 3600);

if (error || !data?.signedUrl) {
  return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 });
}
return NextResponse.redirect(data.signedUrl);
```

No existing code in the codebase uses `createSignedUrl` — the above is the reference pattern.

---

## Stripe Webhook Changes

Location: `app/api/stripe/webhook/route.ts`

**Idempotency note:** Receipt generation must be placed inside the `if (!existing)` guard (after the donation is recorded for the first time). On a duplicate webhook delivery, `existing` is truthy, the outer block is skipped, and no receipt rows are created — this is correct. Recovery from a first-delivery PDF failure is handled by the donor-facing retry endpoint, not by a repeat webhook.

After the existing donation recording logic, inside `if (!existing)`:

```
1. Insert receipt row(s) with pdf_status: 'pending'
   - portfolio: 1 portfolio_summary + N individual rows (one per org with amount > 0)
   - single-org: 1 individual row

2. try {
     a. generateReceiptPdf() → Buffer  (pdfkit stream accumulation)
     b. supabaseServiceRole.storage.from('receipts').upload(path, buffer)
     c. Update receipt row(s): pdf_url = path, pdf_status = 'generated'
     d. sendReceiptEmail(..., pdfBuffer: buffer)
   } catch (err) {
     console.error('[receipt] generation failed', err)
     // pdf_status remains 'failed' — donor can retry from portfolio
     // fall back to existing HTML-only email (sendReceiptEmail without buffer)
   }
```

---

## API Routes

### `GET /api/receipts`

Returns authenticated donor's receipts, ordered by `created_at DESC`. JOINs to `organizations` for `org_name` (since `receipts` stores only `org_id`):

```ts
// Supabase query
supabase
  .from('receipts')
  .select('*, organizations(name)')
  .eq('donor_id', userId)
  .order('created_at', { ascending: false })
```

Response shape:
```json
[{
  "id": "uuid",
  "type": "individual | portfolio_summary",
  "receipt_number": "RCP-...",
  "amount": 5000,
  "org_id": "grace-community-church",   // text slug, use for /org/[org_id] links
  "org_name": "Grace Community Church",  // from JOIN
  "pdf_status": "generated | pending | failed",
  "created_at": "2026-03-20T..."
}]
```

### `GET /api/receipts/[id]/download`

Auth-gated to receipt owner (`donor_id = auth.uid()`). Generates a 1-hour signed URL via `createSignedUrl` (see pattern above) and redirects. Returns 404 if receipt not found or not owned by requester. Returns 400 if `pdf_status !== 'generated'`.

### `POST /api/receipts/[id]/retry`

Auth-gated to receipt owner. Re-runs PDF generation and upload for `pdf_status: 'failed'` receipts. Rate-limited: 3 retries per receipt per hour (using existing `checkRateLimit` utility in `lib/rateLimit.ts`). Returns 409 if `pdf_status === 'generated'` (no retry needed).

---

## Email Changes

`lib/email.ts` — update `sendReceiptEmail()` signature:

```ts
async function sendReceiptEmail(
  // ... existing params ...
  pdfBuffer?: Buffer
)
```

When `pdfBuffer` is provided, attach to Resend:
```ts
attachments: pdfBuffer ? [{
  filename: 'receipt.pdf',
  content: pdfBuffer,
  content_type: 'application/pdf',  // required for correct email client rendering
}] : undefined
```

Body: add one sentence — "Your receipt is attached as a PDF."

---

## Donor Portfolio UI

Location: `app/profile/page.tsx` (receipts tab — already exists)

### Changes

1. **Data source** — switch from querying `donations` to `GET /api/receipts`
2. **Download button** — replaces print-dialog button; hits `GET /api/receipts/[id]/download`; browser follows the signed-URL redirect and saves `.pdf`
3. **Status indicators:**
   - `pending` — grey "Generating…" badge; component polls once after 10 seconds
   - `failed` — amber "Retry" button; calls `POST /api/receipts/[id]/retry`; re-fetches on success
   - `generated` — green "Download PDF" button
4. **Portfolio grouping** — portfolio donations show a "Combined Receipt" card followed by individual per-org cards, grouped by `payment_intent_id`

---

## Error Handling

| Failure point | Behavior |
|---|---|
| PDF generation throws | Log error, `pdf_status = 'failed'`, fall back to HTML email |
| Supabase Storage upload fails | Log error, `pdf_status = 'failed'`, fall back to HTML email |
| Email send with attachment fails | Log error; HTML email is fallback if attachment caused failure |
| Guest donor (no account) | PDF only via email attachment; no portfolio access |
| Duplicate webhook delivery | Receipt rows already exist; outer block skipped; no duplicate PDFs |
| Donor retry | `POST /api/receipts/[id]/retry`, rate-limited 3/hr per receipt |

---

## Out of Scope

- Admin bulk PDF export
- Year-end tax summary PDFs (separate feature)
- Changing the existing `/receipts/[id]` print page (still works as before)
- Adding a structured `address` column to `organizations` (org_id slug used instead)
