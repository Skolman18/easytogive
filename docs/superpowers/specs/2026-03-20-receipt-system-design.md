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

```sql
CREATE TABLE receipts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id          uuid REFERENCES auth.users(id),
  payment_intent_id text NOT NULL,
  donation_ids      uuid[],
  org_id            text REFERENCES organizations(id), -- null for portfolio_summary
  type              text NOT NULL CHECK (type IN ('individual', 'portfolio_summary')),
  amount            integer NOT NULL, -- cents
  receipt_number    text UNIQUE NOT NULL, -- RCP-{timestamp}-{6-char random}
  pdf_url           text,             -- null until generated
  pdf_status        text NOT NULL DEFAULT 'pending'
                        CHECK (pdf_status IN ('pending', 'generated', 'failed')),
  created_at        timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX receipts_donor_id_idx ON receipts(donor_id);
CREATE INDEX receipts_payment_intent_id_idx ON receipts(payment_intent_id);

-- RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donors read own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = donor_id);
CREATE POLICY "Service role full access"
  ON receipts FOR ALL
  USING (auth.role() = 'service_role');
```

### Receipt rows per payment type

| Payment type | Rows created |
|---|---|
| Single-org donation | 1 `individual` row |
| Portfolio donation (N orgs) | 1 `portfolio_summary` + N `individual` rows |
| Recurring (per invoice) | Same as single-org or portfolio above |

### Receipt number format

`RCP-{unix-timestamp-ms}-{6-char-uppercase-random}`

Example: `RCP-1742476800000-A3F9KX`

---

## PDF Generation

### Library

`pdfkit` — pure JavaScript, no binary dependencies, works on Vercel serverless and any VPS. Generates a PDF as an in-memory `Buffer`.

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
    address: string | null;
    amount: number; // cents
  }>;
  totalAmount: number; // cents
}

function generateReceiptPdf(input: ReceiptPdfInput): Promise<Buffer>
```

### PDF layout (letter size, 8.5×11)

1. **Header** — "EasyToGive" wordmark in #1a7a4a, "Donation Receipt" right-aligned
2. **Divider line** in #1a7a4a
3. **Receipt metadata** — Receipt #, Date, Donor name, Donor email
4. **Donation table** — columns: Organization | EIN | Amount
   - One row for individual receipts
   - Multiple rows + total row for portfolio summaries
5. **Tax statement** — "This donation is tax-deductible to the extent provided by law. [Org Name] is a verified 501(c)(3) nonprofit organization." Lists all orgs for portfolio type.
6. **Footer** — "Thank you for your generosity. Visit easytogive.online for impact updates."

Design: clean, monochrome, #1a7a4a accents on header and dividers.

---

## Supabase Storage

**Bucket:** `receipts` (private, not public)

**Path structure:** `{donor_id}/{receipt_id}.pdf`

**Access:** Short-lived signed URLs (1-hour expiry) generated on demand. Donors never receive a permanent public link.

---

## Stripe Webhook Changes

Location: `app/api/stripe/webhook/route.ts`

After the existing donation recording logic, add the following to both `payment_intent.succeeded` and `invoice.payment_succeeded` handlers:

```
1. Insert receipt row(s) into receipts table with pdf_status: 'pending'
   - portfolio donation: 1 portfolio_summary + N individual rows
   - single-org: 1 individual row

2. try {
     a. Call generateReceiptPdf() → Buffer
     b. Upload Buffer to Supabase Storage at {donor_id}/{receipt_id}.pdf
     c. Update receipt row: set pdf_url, pdf_status = 'generated'
     d. Call sendReceiptEmail() with pdfBuffer attached
   } catch (err) {
     console.error('receipt generation failed', err)
     // pdf_status remains 'failed'
     // fall back to existing HTML-only email (no change to current behavior)
   }
```

The webhook response is not delayed — PDF generation is fast (sub-second for pdfkit) and the total additional time is well within Stripe's 30-second limit.

---

## API Routes

### `GET /api/receipts`
Returns the authenticated donor's receipts from the `receipts` table, ordered by `created_at DESC`. Auth-gated via Supabase session.

Response:
```json
[{
  "id": "uuid",
  "type": "individual | portfolio_summary",
  "receipt_number": "RCP-...",
  "amount": 5000,
  "org_id": "grace-community-church",
  "org_name": "Grace Community Church",
  "pdf_status": "generated | pending | failed",
  "created_at": "2026-03-20T..."
}]
```

### `GET /api/receipts/[id]/download`
Auth-gated to receipt owner. Generates a 1-hour signed URL from Supabase Storage and redirects the browser to it, triggering a PDF download. Returns 404 if `pdf_status !== 'generated'`.

### `POST /api/receipts/[id]/retry`
Auth-gated to receipt owner. Re-runs PDF generation and upload for receipts with `pdf_status: 'failed'`. Rate-limited: 3 retries per receipt per hour.

---

## Email Changes

`lib/email.ts` — update `sendReceiptEmail()`:

```ts
// Add optional parameter
async function sendReceiptEmail(
  ...,
  pdfBuffer?: Buffer
)
```

When `pdfBuffer` is provided, attach it to the Resend email:
```ts
attachments: pdfBuffer ? [{
  filename: 'receipt.pdf',
  content: pdfBuffer,
}] : undefined
```

Subject: `Your donation receipt from [Org Name]` (unchanged)
Body: Add one sentence — "Your receipt is attached as a PDF."

---

## Donor Portfolio UI

Location: `app/profile/page.tsx` (receipts tab — already exists)

### Changes

1. **Data source** — switch from querying `donations` to `GET /api/receipts`
2. **Download button** — replaces print-dialog button; hits `/api/receipts/[id]/download` which redirects to signed URL → browser saves `.pdf`
3. **Status indicators:**
   - `pending` — grey "Generating…" badge; component polls once after 10 seconds
   - `failed` — amber "Retry" button; calls `POST /api/receipts/[id]/retry`; re-fetches on success
   - `generated` — green "Download PDF" button
4. **Portfolio grouping** — portfolio donations show a "Combined Receipt" card followed by individual per-org receipt cards, grouped by `payment_intent_id`

---

## Error Handling

| Failure point | Behavior |
|---|---|
| PDF generation throws | Log error, set `pdf_status: failed`, fall back to HTML email |
| Supabase Storage upload fails | Log error, set `pdf_status: failed`, fall back to HTML email |
| Email send with attachment fails | Log error (email already went out as HTML fallback or retry) |
| Donor requests retry | `POST /api/receipts/[id]/retry`, rate-limited 3/hr per receipt |

Donations are never blocked. The existing HTML receipt email is the safety net.

---

## Out of Scope

- Admin bulk PDF export
- Year-end tax summary PDFs (separate feature)
- Changing the existing `/receipts/[id]` print page (still works as before)
- PDF watermarking or password protection
