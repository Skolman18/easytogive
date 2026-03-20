# Receipt System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate server-side PDF receipts on every successful Stripe payment, store them in Supabase Storage, attach them to receipt emails, and surface a real "Download PDF" button in the donor portfolio.

**Architecture:** `pdfkit` generates PDFs as in-memory Buffers inside the Stripe webhook handler (inside the existing idempotency guard). Buffers are uploaded to a private Supabase Storage `receipts` bucket, tracked in a new `receipts` table, and attached to the Resend email. The donor portfolio receipts tab fetches receipt status from a new API route and renders status-aware download buttons — falling back to the existing browser-print flow for old donations.

**Tech Stack:** pdfkit (PDF generation), Supabase Storage (file storage), Resend (email with PDF attachment), Next.js App Router API routes, Supabase PostgreSQL RLS

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `package.json` | Modify | Add pdfkit + @types/pdfkit |
| `supabase/migrations/20260320000001_receipts_table.sql` | Create | receipts table + RLS |
| `supabase/migrations/20260320000002_receipts_storage.sql` | Create | receipts storage bucket + policies |
| `lib/generateReceiptPdf.ts` | Create | pdfkit PDF generation |
| `lib/email.ts` | Modify | Add optional pdfBuffer param to sendReceiptEmail |
| `app/api/receipts/route.ts` | Create | GET — list donor's receipts |
| `app/api/receipts/[id]/download/route.ts` | Create | GET — signed URL redirect |
| `app/api/receipts/[id]/retry/route.ts` | Create | POST — re-generate failed PDF |
| `app/api/stripe/webhook/route.ts` | Modify | Generate + store PDF + attach to email |
| `app/profile/page.tsx` | Modify | Load receipt status, status-aware download buttons |

---

## Task 1: Install pdfkit

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the library**

```bash
npm install pdfkit
npm install --save-dev @types/pdfkit
```

- [ ] **Step 2: Verify it's in package.json**

```bash
grep pdfkit package.json
```

Expected: both `pdfkit` in dependencies and `@types/pdfkit` in devDependencies.

- [ ] **Step 3: Confirm build still passes**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

---

## Task 2: Create database migrations

**Files:**
- Create: `supabase/migrations/20260320000001_receipts_table.sql`
- Create: `supabase/migrations/20260320000002_receipts_storage.sql`

- [ ] **Step 1: Create receipts table migration**

Create `supabase/migrations/20260320000001_receipts_table.sql`:

```sql
-- receipts table: one row per PDF document
-- For portfolio donations: 1 portfolio_summary + N individual rows per payment
CREATE TABLE IF NOT EXISTS receipts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_intent_id text NOT NULL,
  donation_ids      uuid[],          -- donation row IDs covered by this receipt
  org_id            text REFERENCES organizations(id) ON DELETE SET NULL,
  type              text NOT NULL CHECK (type IN ('individual', 'portfolio_summary')),
  amount            integer NOT NULL CHECK (amount > 0), -- cents
  receipt_number    text UNIQUE NOT NULL,
  pdf_url           text,            -- Supabase Storage path: {donor_id}/{receipt_id}.pdf
  pdf_status        text NOT NULL DEFAULT 'pending'
                        CHECK (pdf_status IN ('pending', 'generated', 'failed')),
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receipts_donor_id_idx ON receipts(donor_id);
CREATE INDEX IF NOT EXISTS receipts_payment_intent_id_idx ON receipts(payment_intent_id);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Donors can only read their own receipts
-- NULL donor_id (guest donors) never matches auth.uid(), so guests get no API access
CREATE POLICY "Donors read own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = donor_id);

-- No service_role RLS policy needed — service role bypasses RLS entirely in Supabase
```

- [ ] **Step 2: Create receipts storage migration**

Create `supabase/migrations/20260320000002_receipts_storage.sql`:

```sql
-- Private storage bucket for PDF receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,       -- private: access via signed URLs only
  5242880,     -- 5 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Only authenticated users can read objects in their own folder
-- Path structure: {donor_id}/{receipt_id}.pdf
CREATE POLICY "Users read own receipt PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role handles uploads (webhook).
-- NOTE: The Supabase service role bypasses RLS entirely on application tables,
-- but Storage object policies ARE enforced even for the service role.
-- These explicit policies allow the webhook's service-role client to upload PDFs.
CREATE POLICY "Service role upload receipt PDFs"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Service role update receipt PDFs"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'receipts');
```

---

## Task 3: Create lib/generateReceiptPdf.ts

**Files:**
- Create: `lib/generateReceiptPdf.ts`

- [ ] **Step 1: Write the PDF generator**

Create `lib/generateReceiptPdf.ts`:

```typescript
import PDFDocument from "pdfkit";

export interface ReceiptOrg {
  name: string;
  ein: string | null;
  amount: number; // cents
}

export interface ReceiptPdfInput {
  receiptNumber: string;
  donorName: string | null;
  donorEmail: string;
  createdAt: Date;
  type: "individual" | "portfolio_summary";
  orgs: ReceiptOrg[];
  totalAmount: number; // cents
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function generateReceiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 60 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const GREEN = "#1a7a4a";
    const GRAY = "#6b7280";
    const DARK = "#111827";
    const pageWidth = doc.page.width - 120; // margins on each side

    // ── Header ──────────────────────────────────────────────────────────────
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor(GREEN)
      .text("EasyToGive", 60, 60);

    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor(GRAY)
      .text("Donation Receipt", doc.page.width - 180, 68, {
        width: 120,
        align: "right",
      });

    // Divider
    doc.moveDown(0.5);
    doc
      .moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .strokeColor(GREEN)
      .lineWidth(1.5)
      .stroke();
    doc.moveDown(1);

    // ── Receipt metadata ─────────────────────────────────────────────────────
    const metaY = doc.y;
    const col1 = 60;
    const col2 = 200;
    const lineH = 20;

    function metaRow(label: string, value: string, y: number) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(GRAY)
        .text(label, col1, y, { width: 130 });
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(DARK)
        .text(value, col2, y, { width: pageWidth - 140 });
    }

    const dateStr = input.createdAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    metaRow("Receipt Number", input.receiptNumber, metaY);
    metaRow("Date", dateStr, metaY + lineH);
    metaRow("Donor", input.donorName ?? "Anonymous", metaY + lineH * 2);
    metaRow("Email", input.donorEmail, metaY + lineH * 3);

    doc.moveDown(4.5);

    // ── Donation table ───────────────────────────────────────────────────────
    doc.moveDown(0.5);
    const tableTop = doc.y;
    const colOrg = 60;
    const colEin = 280;
    const colAmt = doc.page.width - 120;

    // Table header
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(GRAY)
      .text("ORGANIZATION", colOrg, tableTop)
      .text("EIN", colEin, tableTop)
      .text("AMOUNT", colAmt, tableTop, { align: "right", width: 60 });

    doc.moveDown(0.4);
    doc
      .moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .strokeColor("#e5e1d8")
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.4);

    // Table rows
    for (const org of input.orgs) {
      const rowY = doc.y;
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(DARK)
        .text(org.name, colOrg, rowY, { width: 200 });
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(GRAY)
        .text(org.ein ?? "—", colEin, rowY, { width: 100 });
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(GREEN)
        .text(formatCents(org.amount), colAmt, rowY, {
          align: "right",
          width: 60,
        });
      doc.moveDown(0.8);
    }

    // Total row (portfolio only)
    if (input.type === "portfolio_summary" && input.orgs.length > 1) {
      doc
        .moveTo(60, doc.y)
        .lineTo(doc.page.width - 60, doc.y)
        .strokeColor("#e5e1d8")
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.4);
      const totalY = doc.y;
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(DARK)
        .text("Total", colOrg, totalY);
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(GREEN)
        .text(formatCents(input.totalAmount), colAmt, totalY, {
          align: "right",
          width: 60,
        });
      doc.moveDown(1.2);
    } else {
      doc.moveDown(0.5);
    }

    // ── Tax statement ────────────────────────────────────────────────────────
    doc
      .moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .strokeColor(GREEN)
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.8);

    const taxY = doc.y;
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(DARK)
      .text("Tax Deductibility Notice", 60, taxY);
    doc.moveDown(0.4);

    const orgList =
      input.orgs.length === 1
        ? input.orgs[0].name
        : input.orgs.map((o) => o.name).join(", ");

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(GRAY)
      .text(
        `This donation is tax-deductible to the extent provided by law. ${orgList} ${input.orgs.length === 1 ? "is" : "are"} verified 501(c)(3) nonprofit organization${input.orgs.length === 1 ? "" : "s"}. No goods or services were provided in exchange for this contribution. Please retain this receipt for your tax records.`,
        60,
        doc.y,
        { width: pageWidth, lineGap: 2 }
      );

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.moveDown(2);
    doc
      .moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .strokeColor("#e5e1d8")
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.6);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(GRAY)
      .text(
        "Thank you for your generosity. Visit easytogive.online for impact updates from the organizations you support.",
        60,
        doc.y,
        { width: pageWidth, align: "center" }
      );

    doc.end();
  });
}
```

- [ ] **Step 2: Confirm build passes with new file**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

---

## Task 4: Update lib/email.ts to accept pdfBuffer

**Files:**
- Modify: `lib/email.ts:232-289`

- [ ] **Step 1: Add pdfBuffer parameter to sendReceiptEmail**

In `lib/email.ts`, update the `sendReceiptEmail` function signature and the Resend call. Find the function starting at line 232 and make these two changes:

**Change 1 — add parameter to the destructured object:**
```typescript
// Before (line 244 area):
export async function sendReceiptEmail({
  to,
  donorName,
  orgName,
  orgEin,
  amountCents,
  receiptId,
  donatedAt,
  isRecurring,
  frequency,
  receiptUrl,
  allocations,
}: {
  to: string;
  donorName?: string | null;
  orgName: string;
  orgEin?: string | null;
  amountCents: number;
  receiptId: string;
  donatedAt: string;
  isRecurring?: boolean;
  frequency?: string;
  receiptUrl?: string | null;
  allocations?: ReceiptAllocation[] | null;
}): Promise<void> {

// After:
export async function sendReceiptEmail({
  to,
  donorName,
  orgName,
  orgEin,
  amountCents,
  receiptId,
  donatedAt,
  isRecurring,
  frequency,
  receiptUrl,
  allocations,
  pdfBuffer,
}: {
  to: string;
  donorName?: string | null;
  orgName: string;
  orgEin?: string | null;
  amountCents: number;
  receiptId: string;
  donatedAt: string;
  isRecurring?: boolean;
  frequency?: string;
  receiptUrl?: string | null;
  allocations?: ReceiptAllocation[] | null;
  pdfBuffer?: Buffer | null;
}): Promise<void> {
```

**Change 2 — update the resend.emails.send call to include attachment:**
```typescript
// Before:
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html: receiptHtml({ ... }),
    });

// After:
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html: receiptHtml({ ... }),
      attachments: pdfBuffer
        ? [
            {
              filename: "receipt.pdf",
              content: pdfBuffer,
              contentType: "application/pdf",  // camelCase — Resend SDK field name
            },
          ]
        : undefined,
    });
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

---

## Task 5: Create GET /api/receipts

**Files:**
- Create: `app/api/receipts/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/receipts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  // Auth check via server session (createClient is async — must await)
  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("receipts")
    .select(
      `id, type, receipt_number, amount, org_id, pdf_status, donation_ids, payment_intent_id, created_at,
       organizations(name)`
    )
    .eq("donor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const receipts = (data ?? []).map((r: any) => ({
    id: r.id,
    type: r.type,
    receipt_number: r.receipt_number,
    amount: r.amount,
    org_id: r.org_id,
    org_name: r.organizations?.name ?? null,
    pdf_status: r.pdf_status,
    donation_ids: r.donation_ids ?? [],
    payment_intent_id: r.payment_intent_id,
    created_at: r.created_at,
  }));

  return NextResponse.json(receipts);
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

---

## Task 6: Create GET /api/receipts/[id]/download

**Files:**
- Create: `app/api/receipts/[id]/download/route.ts`

- [ ] **Step 1: Create the route file**

```bash
mkdir -p app/api/receipts/\[id\]/download
```

- [ ] **Step 2: Write the route**

Create `app/api/receipts/[id]/download/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await params — required in Next.js 15+
  const { id } = await params;

  // Auth check via server session (createClient is async — must await)
  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Fetch receipt, verify ownership
  const { data: receipt, error } = await supabase
    .from("receipts")
    .select("id, donor_id, pdf_status, pdf_url, receipt_number")
    .eq("id", id)
    .maybeSingle();

  if (error || !receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }
  if (receipt.donor_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (receipt.pdf_status !== "generated" || !receipt.pdf_url) {
    return NextResponse.json(
      { error: "PDF not yet available" },
      { status: 400 }
    );
  }

  // Generate 1-hour signed URL
  const { data: signedData, error: signedError } = await supabase.storage
    .from("receipts")
    .createSignedUrl(receipt.pdf_url, 3600);

  if (signedError || !signedData?.signedUrl) {
    console.error("createSignedUrl failed:", signedError);
    return NextResponse.json(
      { error: "Could not generate download link" },
      { status: 500 }
    );
  }

  // Redirect browser to signed URL — triggers download
  return NextResponse.redirect(signedData.signedUrl);
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

---

## Task 7: Create POST /api/receipts/[id]/retry

**Files:**
- Create: `app/api/receipts/[id]/retry/route.ts`

- [ ] **Step 1: Create route file**

```bash
mkdir -p app/api/receipts/\[id\]/retry
```

- [ ] **Step 2: Write the route**

Create `app/api/receipts/[id]/retry/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { generateReceiptPdf } from "@/lib/generateReceiptPdf";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await params — required in Next.js 15+
  const { id } = await params;

  // Auth check via server session (createClient is async — must await)
  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 retries per receipt per hour
  const { allowed } = checkRateLimit(
    `retry-${id}-${user.id}`,
    "receipt-retry",
    3,
    60 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many retries. Please try again later." },
      { status: 429 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Fetch receipt with org data
  const { data: receipt, error } = await supabase
    .from("receipts")
    .select(
      `id, donor_id, pdf_status, type, amount, receipt_number, org_id, donation_ids, created_at,
       organizations(name, ein)`
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }
  if (receipt.donor_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (receipt.pdf_status === "generated") {
    return NextResponse.json({ error: "PDF already generated" }, { status: 409 });
  }

  // Get donor info
  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user.id);
  const donorEmail = authUser?.email ?? "";
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const donorName = (profile as any)?.full_name ?? null;

  try {
    const orgData = receipt.organizations as any;
    const pdfBuffer = await generateReceiptPdf({
      receiptNumber: receipt.receipt_number,
      donorName,
      donorEmail,
      createdAt: new Date(receipt.created_at),
      type: receipt.type as "individual" | "portfolio_summary",
      orgs: [
        {
          name: orgData?.name ?? "Organization",
          ein: orgData?.ein ?? null,
          amount: receipt.amount,
        },
      ],
      totalAmount: receipt.amount,
    });

    const storagePath = `${user.id}/${receipt.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    await supabase
      .from("receipts")
      .update({ pdf_url: storagePath, pdf_status: "generated" })
      .eq("id", receipt.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Receipt retry failed:", err);
    await supabase
      .from("receipts")
      .update({ pdf_status: "failed" })
      .eq("id", receipt.id);
    return NextResponse.json(
      { error: "PDF generation failed. Please try again." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

---

## Task 8: Update Stripe webhook

**Files:**
- Modify: `app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Add imports at top of webhook file**

Add to existing imports at the top of `app/api/stripe/webhook/route.ts`:

```typescript
import { generateReceiptPdf } from "@/lib/generateReceiptPdf";
```

- [ ] **Step 2: Add receipt number generator helper function**

Add this helper function after the existing `getOrgInfo` function (around line 49):

```typescript
function generateReceiptNumber(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RCP-${ts}-${rand}`;
}
```

- [ ] **Step 3: Add receipt generation helper function**

Add this function after `generateReceiptNumber`:

```typescript
async function generateAndStoreReceipt(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  receiptRow: {
    id: string;
    donor_id: string | null;
    receipt_number: string;
    type: "individual" | "portfolio_summary";
    amount: number;
    created_at: string;
  },
  orgs: Array<{ name: string; ein: string | null; amount: number }>,
  donorEmail: string,
  donorName: string | null
): Promise<Buffer | null> {
  // Guest donors: generate PDF but skip storage upload
  const pdfBuffer = await generateReceiptPdf({
    receiptNumber: receiptRow.receipt_number,
    donorName,
    donorEmail,
    createdAt: new Date(receiptRow.created_at),
    type: receiptRow.type,
    orgs,
    totalAmount: receiptRow.amount,
  });

  if (!receiptRow.donor_id) {
    // Guest: no storage, mark generated (PDF only delivered via email)
    await supabase
      .from("receipts")
      .update({ pdf_status: "generated" })
      .eq("id", receiptRow.id);
    return pdfBuffer;
  }

  const storagePath = `${receiptRow.donor_id}/${receiptRow.id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  await supabase
    .from("receipts")
    .update({ pdf_url: storagePath, pdf_status: "generated" })
    .eq("id", receiptRow.id);

  return pdfBuffer;
}
```

- [ ] **Step 4: Update payment_intent.succeeded handler**

Inside the `payment_intent.succeeded` case, find the block that starts with `if (inserted && meta.donorId)` around line 204. This is the email-sending block. Replace it with the following (which inserts receipt rows before sending the email).

**Important:** `donation_ids` must be populated with the actual donation row UUIDs. After the donations are inserted (the `inserted = true` block), query the IDs by payment_intent before inserting receipt rows:

```typescript
          // Generate receipts and send email
          // Receipt generation happens inside the idempotency guard (only on first delivery)
          if (inserted) {
            try {
              const primaryOrgId = meta.orgId || (allocParts[0]?.orgId ?? null);
              const now2 = new Date().toISOString();

              // Fetch the donation row IDs just inserted (needed for donation_ids column)
              const { data: justInserted } = await supabase
                .from("donations")
                .select("id, org_id")
                .eq("stripe_payment_intent_id", pi.id);
              const donationIdMap: Record<string, string> = {};
              for (const row of justInserted ?? []) {
                if (row.org_id) donationIdMap[row.org_id] = row.id;
              }
              const allDonationIds = (justInserted ?? []).map((r: any) => r.id);

              // Fetch donor + org info
              const [donor, primaryOrgInfo] = await Promise.all([
                meta.donorId
                  ? getDonorInfo(supabase, meta.donorId)
                  : Promise.resolve({ email: null, name: null }),
                primaryOrgId
                  ? getOrgInfo(supabase, primaryOrgId)
                  : Promise.resolve({ name: meta.orgName ?? "EasyToGive", ein: null }),
              ]);

              // Fetch all org info for portfolio
              const allOrgInfos: Array<{ orgId: string; name: string; ein: string | null; amountCents: number }> = [];
              if (allocParts.length > 1) {
                const orgFetches = allocParts.map((a: { orgId: string; amountCents: number }) =>
                  getOrgInfo(supabase, a.orgId).then((info) => ({
                    orgId: a.orgId,
                    name: info.name,
                    ein: info.ein,
                    amountCents: a.amountCents,
                  }))
                );
                allOrgInfos.push(...(await Promise.all(orgFetches)));
              }

              // Insert receipt rows (pdf_status: 'pending')
              let portfolioReceiptRow: { id: string; donor_id: string | null; receipt_number: string; type: "individual" | "portfolio_summary"; amount: number; created_at: string } | null = null;
              const individualReceiptRows: typeof portfolioReceiptRow[] = [];

              if (allocParts.length > 1) {
                // Portfolio: 1 summary + N individual rows
                const summaryNumber = generateReceiptNumber();
                const { data: summaryRow } = await supabase
                  .from("receipts")
                  .insert({
                    donor_id: meta.donorId ?? null,
                    payment_intent_id: pi.id,
                    donation_ids: allDonationIds, // all donation IDs for this payment
                    org_id: null,
                    type: "portfolio_summary",
                    amount: donationAmountCents,
                    receipt_number: summaryNumber,
                    pdf_status: "pending",
                    created_at: now2,
                  })
                  .select("id, donor_id, receipt_number, type, amount, created_at")
                  .single();

                if (summaryRow) portfolioReceiptRow = summaryRow;

                for (const orgInfo of allOrgInfos) {
                  const donId = donationIdMap[orgInfo.orgId];
                  const { data: indRow } = await supabase
                    .from("receipts")
                    .insert({
                      donor_id: meta.donorId ?? null,
                      payment_intent_id: pi.id,
                      donation_ids: donId ? [donId] : null, // single donation for this org
                      org_id: orgInfo.orgId,
                      type: "individual",
                      amount: orgInfo.amountCents,
                      receipt_number: generateReceiptNumber(),
                      pdf_status: "pending",
                      created_at: now2,
                    })
                    .select("id, donor_id, receipt_number, type, amount, created_at")
                    .single();

                  if (indRow) individualReceiptRows.push(indRow);
                }
              } else {
                // Single org: 1 individual row
                const { data: indRow } = await supabase
                  .from("receipts")
                  .insert({
                    donor_id: meta.donorId ?? null,
                    payment_intent_id: pi.id,
                    donation_ids: allDonationIds, // the single donation row ID
                    org_id: meta.orgId ?? null,
                    type: "individual",
                    amount: donationAmountCents,
                    receipt_number: generateReceiptNumber(),
                    pdf_status: "pending",
                    created_at: now2,
                  })
                  .select("id, donor_id, receipt_number, type, amount, created_at")
                  .single();

                if (indRow) individualReceiptRows.push(indRow);
              }

              // Generate PDFs and send email (all in one try/catch — failure falls back to HTML-only email)
              let pdfBuffer: Buffer | null = null;
              try {
                if (donor.email) {
                  const receiptRowForPdf = portfolioReceiptRow ?? individualReceiptRows[0];
                  if (receiptRowForPdf) {
                    const orgsForPdf = allocParts.length > 1
                      ? allOrgInfos.map((o) => ({ name: o.name, ein: o.ein, amount: o.amountCents }))
                      : [{ name: primaryOrgInfo.name, ein: primaryOrgInfo.ein, amount: donationAmountCents }];

                    pdfBuffer = await generateAndStoreReceipt(
                      supabase,
                      receiptRowForPdf,
                      orgsForPdf,
                      donor.email,
                      donor.name
                    );

                    // Generate individual PDFs for portfolio (background, don't await)
                    if (allocParts.length > 1) {
                      Promise.all(
                        individualReceiptRows.map((row, i) =>
                          row
                            ? generateAndStoreReceipt(
                                supabase,
                                row,
                                [{ name: allOrgInfos[i].name, ein: allOrgInfos[i].ein, amount: allOrgInfos[i].amountCents }],
                                donor.email!,
                                donor.name
                              )
                            : Promise.resolve(null)
                        )
                      ).catch((err) => console.error("[receipt] individual portfolio PDFs failed:", err));
                    }
                  }
                }
              } catch (pdfErr) {
                console.error("[receipt] PDF generation failed, falling back to HTML-only email:", pdfErr);
                // Mark failed receipts
                const failedIds = [portfolioReceiptRow, ...individualReceiptRows].filter(Boolean).map((r) => r!.id);
                if (failedIds.length > 0) {
                  await supabase.from("receipts").update({ pdf_status: "failed" }).in("id", failedIds);
                }
              }

              // Send email (with or without PDF)
              if (donor.email) {
                const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://easytogive.online";
                await sendReceiptEmail({
                  to: donor.email,
                  donorName: donor.name,
                  orgName: allocParts.length > 1 ? "EasyToGive Portfolio" : primaryOrgInfo.name,
                  orgEin: allocParts.length > 1 ? null : primaryOrgInfo.ein,
                  amountCents: donationAmountCents,
                  receiptId,
                  donatedAt: now,
                  receiptUrl: `${baseUrl}/receipts/${encodeURIComponent(receiptId)}`,
                  allocations:
                    allocParts.length > 1
                      ? allOrgInfos.map((o) => ({
                          orgName: o.name,
                          orgEin: o.ein,
                          amountCents: o.amountCents,
                        }))
                      : undefined,
                  pdfBuffer,
                });
              }
            } catch (receiptErr) {
              console.error(`[receipt] receipt block failed for payment_intent ${pi.id}:`, receiptErr);
            }
          }
```

- [ ] **Step 5: Update invoice.payment_succeeded handler similarly**

Inside the `invoice.payment_succeeded` case, find the block starting with `if (meta.donorId)` around line 280. Replace the `try` block inside it with:

```typescript
          if (meta.donorId) {
            try {
              const [donor, orgInfo] = await Promise.all([
                getDonorInfo(supabase, meta.donorId),
                meta.orgId ? getOrgInfo(supabase, meta.orgId) : Promise.resolve({ name: "EasyToGive", ein: null }),
              ]);

              // Insert receipt row
              const recurReceiptNumber = generateReceiptNumber();
              const now2 = new Date().toISOString();
              const { data: recurReceiptRow } = await supabase
                .from("receipts")
                .insert({
                  donor_id: meta.donorId,
                  payment_intent_id: piId,
                  org_id: meta.orgId ?? null,
                  type: "individual",
                  amount: invoice.amount_paid,
                  receipt_number: recurReceiptNumber,
                  pdf_status: "pending",
                  created_at: now2,
                })
                .select("id, donor_id, receipt_number, type, amount, created_at")
                .single();

              let pdfBuffer: Buffer | null = null;
              if (donor.email && recurReceiptRow) {
                try {
                  pdfBuffer = await generateAndStoreReceipt(
                    supabase,
                    recurReceiptRow,
                    [{ name: orgInfo.name, ein: orgInfo.ein, amount: invoice.amount_paid }],
                    donor.email,
                    donor.name
                  );
                } catch (pdfErr) {
                  console.error("[receipt] recurring PDF failed:", pdfErr);
                  if (recurReceiptRow) {
                    await supabase.from("receipts").update({ pdf_status: "failed" }).eq("id", recurReceiptRow.id);
                  }
                }
              }

              if (donor.email) {
                const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://easytogive.online";
                await sendReceiptEmail({
                  to: donor.email,
                  donorName: donor.name,
                  orgName: orgInfo.name,
                  orgEin: orgInfo.ein,
                  amountCents: invoice.amount_paid,
                  receiptId,
                  donatedAt: now,
                  isRecurring: true,
                  frequency: meta.frequency,
                  receiptUrl: `${baseUrl}/receipts/${encodeURIComponent(receiptId)}`,
                  pdfBuffer,
                });
              }
            } catch (emailErr) {
              console.error(`Recurring receipt email failed for invoice ${invoice.id}:`, emailErr);
            }
          }
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

---

## Task 9: Update profile page receipts tab

**Files:**
- Modify: `app/profile/page.tsx`

The receipts tab (lines 959–1110) currently uses `donationRecords` (from the `donations` table). We add a parallel load from `/api/receipts` and use it to upgrade the download button when a stored PDF is available.

- [ ] **Step 1: Add ReceiptApiRow interface and state**

After the `WatchlistOrg` interface (ends around line 67), add:

```typescript
interface ReceiptApiRow {
  id: string;
  type: "individual" | "portfolio_summary";
  receipt_number: string;
  amount: number;
  org_id: string | null;
  org_name: string | null;
  pdf_status: "pending" | "generated" | "failed";
  donation_ids: string[];
  payment_intent_id: string;
  created_at: string;
}
```

In the component body, after the existing `const [receiptsYear, setReceiptsYear] = useState<number>(2026);` line (around line 310), add:

```typescript
const [apiReceipts, setApiReceipts] = useState<ReceiptApiRow[]>([]);
const [apiReceiptsLoading, setApiReceiptsLoading] = useState(false);
const [retryingReceiptId, setRetryingReceiptId] = useState<string | null>(null);
```

- [ ] **Step 2: Add loadApiReceipts function**

Near the existing `loadDonations` function (around line 336), add:

```typescript
  async function loadApiReceipts() {
    setApiReceiptsLoading(true);
    try {
      const res = await fetch("/api/receipts");
      if (res.ok) {
        const data = await res.json();
        setApiReceipts(data);
      }
    } catch {
      // silently ignore
    } finally {
      setApiReceiptsLoading(false);
    }
  }
```

- [ ] **Step 3: Load api receipts when switching to receipts tab**

Find the `useEffect` that watches `[user?.id, receiptsYear]` (around line 456–460). After it, add a new effect:

```typescript
  // Add after the existing useEffect([user?.id, receiptsYear]) block:
  useEffect(() => {
    if (activeTab === "receipts" && user) {
      loadApiReceipts();
    }
  }, [activeTab, user?.id]);
```

- [ ] **Step 4: Add retry handler function**

Near `loadApiReceipts`, add:

```typescript
  async function handleReceiptRetry(receiptId: string) {
    setRetryingReceiptId(receiptId);
    try {
      const res = await fetch(`/api/receipts/${receiptId}/retry`, { method: "POST" });
      if (res.ok) {
        await loadApiReceipts();
      }
    } catch {
      // silently ignore
    } finally {
      setRetryingReceiptId(null);
    }
  }
```

- [ ] **Step 5: Replace the PDF download button in the receipts tab**

In the receipts tab section (around line 1079–1086), replace the existing PDF button:

```tsx
// Before:
                          <button
                            onClick={() => downloadReceiptPDF(record, user, profile.full_name)}
                            className="flex items-center gap-1 px-3 min-h-[44px] rounded-lg text-xs font-medium transition-colors"
                            style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </button>

// After:
                          {(() => {
                            const apiReceipt = apiReceipts.find((r) =>
                              r.donation_ids?.includes(record.id) ||
                              (r.type === "individual" && r.org_id === record.org_id && r.payment_intent_id && record.receipt_id?.includes(r.payment_intent_id.replace("pi_","").slice(0,12).toUpperCase()))
                            );
                            if (apiReceipt?.pdf_status === "generated") {
                              return (
                                <a
                                  href={`/api/receipts/${apiReceipt.id}/download`}
                                  download
                                  className="flex items-center gap-1 px-3 min-h-[44px] rounded-lg text-xs font-medium transition-colors"
                                  style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                                >
                                  <Download className="w-3 h-3" />
                                  PDF
                                </a>
                              );
                            }
                            if (apiReceipt?.pdf_status === "pending") {
                              return (
                                <span className="flex items-center gap-1 px-3 min-h-[44px] rounded-lg text-xs font-medium" style={{ color: "#9ca3af" }}>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Generating…
                                </span>
                              );
                            }
                            if (apiReceipt?.pdf_status === "failed") {
                              return (
                                <button
                                  onClick={() => handleReceiptRetry(apiReceipt.id)}
                                  disabled={retryingReceiptId === apiReceipt.id}
                                  className="flex items-center gap-1 px-3 min-h-[44px] rounded-lg text-xs font-medium transition-colors"
                                  style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
                                >
                                  {retryingReceiptId === apiReceipt.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  Retry PDF
                                </button>
                              );
                            }
                            // Fallback: old donation or receipt not yet in new system
                            return (
                              <button
                                onClick={() => downloadReceiptPDF(record, user, profile.full_name)}
                                className="flex items-center gap-1 px-3 min-h-[44px] rounded-lg text-xs font-medium transition-colors"
                                style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                              >
                                <Download className="w-3 h-3" />
                                PDF
                              </button>
                            );
                          })()}
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

---

## Task 10: Final build and commit

- [ ] **Step 1: Run full build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean compile, no TypeScript errors.

- [ ] **Step 2: Check for console.error-producing TypeScript issues**

```bash
npm run build 2>&1 | grep -i "error" | grep -v "console.error\|console.warn\|logError"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add \
  supabase/migrations/20260320000001_receipts_table.sql \
  supabase/migrations/20260320000002_receipts_storage.sql \
  lib/generateReceiptPdf.ts \
  lib/email.ts \
  app/api/receipts/route.ts \
  "app/api/receipts/[id]/download/route.ts" \
  "app/api/receipts/[id]/retry/route.ts" \
  app/api/stripe/webhook/route.ts \
  app/profile/page.tsx

git commit -m "feat: server-side PDF receipt generation and delivery

- pdfkit generates PDF receipts as in-memory Buffers
- PDFs stored in private Supabase Storage receipts bucket
- New receipts table tracks individual and portfolio_summary receipts
- PDF attached to Resend email on every successful Stripe payment
- Graceful fallback: PDF failure never blocks donation or HTML email
- Guest donors receive PDF via email only (no storage upload)
- GET /api/receipts lists donor receipts with pdf_status
- GET /api/receipts/[id]/download returns 1-hour signed URL
- POST /api/receipts/[id]/retry re-generates failed PDFs (rate-limited 3/hr)
- Profile page receipts tab shows Download PDF / Generating / Retry buttons
- Falls back to browser-print for donations predating this feature

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Notes for implementer

- **pdfkit types:** `@types/pdfkit` may not cover all methods. If you hit type errors on `doc.on()`, cast with `(doc as any).on(...)` or add a local `.d.ts` shim.
- **supabase-server import:** The webhook uses `createClient` from `@supabase/supabase-js` directly (service role). The API routes need the server-side session client — use the same `createClient` import pattern as other API routes in this codebase (check `app/api/org/` routes for examples).
- **Storage bucket creation:** Run migrations in Supabase dashboard or via `supabase db push` before testing. The `receipts` bucket must exist before the webhook tries to upload.
- **Matching donations to API receipts (profile page):** The matching logic in Task 9 Step 5 is a best-effort approach. For new donations (after this feature ships), `donation_ids` will be populated properly. For old donations, the fallback browser-print button is shown.
