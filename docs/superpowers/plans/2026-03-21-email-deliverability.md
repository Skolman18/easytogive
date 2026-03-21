# Email Deliverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix emails landing in Gmail spam by adding missing DNS records and improving email code with plain-text versions and List-Unsubscribe headers.

**Architecture:** Two independent tracks: (1) manual DNS changes in Get.tech that must be done in order with a verification checkpoint between them, and (2) code changes to `lib/email.ts` adding a `text` field and `headers` to every `resend.emails.send()` call. DNS track is a prerequisite for full deliverability but the code track can be deployed independently.

**Tech Stack:** Resend (email), AWS SES (Resend backend), Get.tech (DNS), Next.js 16.

**Spec:** `docs/superpowers/specs/2026-03-21-email-deliverability-design.md`

---

## File Map

| File | Change |
|---|---|
| `lib/email.ts` | Add `text` (plain-text body) and `headers` (List-Unsubscribe) to all 5 email send calls |

No new files. No other files touched.

---

### Task 1: DNS — Add SPF Record (manual)

**Files:** None — this is a manual DNS change in Get.tech.

- [ ] **Step 1: Log in to Get.tech DNS panel**

Go to your Get.tech account → Domains → `easytogive.online` → DNS Management.

- [ ] **Step 2: Check for existing SPF record**

Look for any existing TXT record on `@` (root) that contains `v=spf1`. If one exists, you must **merge** `include:amazonses.com` into it rather than adding a second TXT record. Two SPF records cause an immediate `permerror` that breaks authentication.

If no existing SPF record, proceed to Step 3.

- [ ] **Step 3: Add the SPF TXT record**

Add a new DNS record:

| Field | Value |
|---|---|
| Type | TXT |
| Host | `@` (or leave blank — means root domain) |
| Value | `v=spf1 include:amazonses.com ~all` |
| TTL | 3600 |

Save the record.

- [ ] **Step 4: Wait for DNS propagation**

SPF records propagate within 1 hour. You can check progress at:
`https://mxtoolbox.com/spf.aspx` — enter `easytogive.online` and run the lookup.

Expected result: `SPF Record Published → v=spf1 include:amazonses.com ~all`

- [ ] **Step 5: Verify SPF is passing on live email**

Send a test email from the app to a Gmail address (trigger any email — org approval, receipt, etc.).

In Gmail: open the email → click the three-dot menu (⋮) → "Show original".

Look for this line in `Authentication-Results`:
```
spf=pass (google.com: domain of receipts@easytogive.online designates [IP] as permitted sender)
```

**Do not proceed to Task 2 until you see `spf=pass`.**

If you see `spf=fail` or `spf=neutral`, the record hasn't propagated yet or was entered incorrectly. Double-check the TXT record value in Get.tech.

---

### Task 2: DNS — Update DMARC Policy (manual)

**Files:** None — manual DNS change. **Only do this after Task 1 is verified.**

- [ ] **Step 1: Update the DMARC record in Get.tech**

Find the existing TXT record on `_dmarc` (host: `_dmarc`, or `_dmarc.easytogive.online`).

Current value: `v=DMARC1; p=none;`

Update it to:
```
v=DMARC1; p=quarantine; rua=mailto:receipts@easytogive.online
```

| Field | Value |
|---|---|
| Type | TXT |
| Host | `_dmarc` |
| Value | `v=DMARC1; p=quarantine; rua=mailto:receipts@easytogive.online` |
| TTL | 3600 |

Save the record.

- [ ] **Step 2: Verify DMARC is passing on live email**

Send another test email to Gmail. Open "Show original" and look for:
```
dmarc=pass (p=QUARANTINE sp=QUARANTINE dis=NONE) header.from=easytogive.online
```

All three lines should now pass: `spf=pass dkim=pass dmarc=pass`.

- [ ] **Step 3: Register with Google Postmaster Tools**

1. Go to [postmaster.google.com](https://postmaster.google.com)
2. Click "Add domain" → enter `easytogive.online`
3. Copy the TXT verification record shown and add it to DNS in Get.tech (same process as above, TXT record on `@`)
4. Click Verify in Postmaster Tools
5. After 24–48 hours of sending, the dashboard shows domain reputation and spam rate

---

### Task 3: Add List-Unsubscribe headers to all email functions

**Files:**
- Modify: `lib/email.ts`

This is a mechanical change — add `headers` to all five `resend.emails.send()` calls. The header value is identical in all five.

- [ ] **Step 1: Read the file**

Read `lib/email.ts` to locate all five `resend.emails.send()` calls. They are in:
1. `sendReceiptEmail` (~line 270)
2. `sendDigestEmail` (~line 349)
3. `sendImpactUpdateEmail` (~line 436)
4. `sendApprovalEmail` (~line 517)
5. `sendGoLiveEmail` (~line 586)

- [ ] **Step 2: Add `headers` to sendReceiptEmail**

Find:
```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html: receiptHtml({
```

Add `headers` after `subject`:
```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html: receiptHtml({
```

- [ ] **Step 3: Add `headers` to sendDigestEmail**

Find:
```typescript
    await resend.emails.send({ from: FROM, to: [to], subject, html });
```

Replace with:
```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
    });
```

- [ ] **Step 4: Add `headers` to sendImpactUpdateEmail**

Find:
```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `${orgName} just shared an impact update`,
      html,
    });
```

Add `headers` after `subject`:
```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `${orgName} just shared an impact update`,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
    });
```

- [ ] **Step 5: Add `headers` to sendApprovalEmail**

Find:
```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `Welcome to EasyToGive — ${orgName} is ready`,
      html,
    });
```

Add `headers` after `subject`:
```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `Welcome to EasyToGive — ${orgName} is ready`,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
    });
```

- [ ] **Step 6: Add `headers` to sendGoLiveEmail**

Find:
```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `${orgName} is now live on EasyToGive`,
      html,
    });
```

Add `headers` after `subject`:
```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `${orgName} is now live on EasyToGive`,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
    });
```

- [ ] **Step 7: TypeScript check**

```bash
cd /Users/sethmitzel/easytogive && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add lib/email.ts
git commit -m "feat: add List-Unsubscribe header to all outbound emails"
```

---

### Task 4: Add plain-text body to sendReceiptEmail

**Files:**
- Modify: `lib/email.ts`

`sendReceiptEmail` has three content states: single-org, recurring, and portfolio. Each needs its own plain-text string. Note: `date` and `freqLabel` are defined inside `receiptHtml()` only — not in `sendReceiptEmail`'s scope — so the plan redeclares them before the `text` block.

- [ ] **Step 1: Add the plain-text body variable**

Inside `sendReceiptEmail`, after the `isPortfolio` variable declaration (which is already there), add:

```typescript
  // date and freqLabel are declared inside receiptHtml() — redeclare here for plain-text use
  const date = new Date(donatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const freqLabel = frequency
    ? frequency.charAt(0).toUpperCase() + frequency.slice(1)
    : "Recurring";
  const firstName = donorName ? donorName.split(" ")[0] : "there";

  const text = isPortfolio
    ? [
        `Hi ${firstName},`,
        ``,
        `Thank you for your portfolio donation of ${formatCents(amountCents)} across ${allocations!.length} organizations.`,
        ``,
        allocations!.map((a) => `${a.orgName}: ${formatCents(a.amountCents)}`).join("\n"),
        ``,
        `Date: ${date}`,
        `Receipt ID: ${receiptId}`,
        ``,
        `No goods or services were provided in exchange for this contribution.`,
        ``,
        `EasyToGive · easytogive.online`,
      ].join("\n")
    : isRecurring
    ? [
        `Hi ${firstName},`,
        ``,
        `Your recurring gift to ${orgName} has been set up.`,
        ``,
        `Amount per period: ${formatCents(amountCents)}`,
        `Frequency: ${freqLabel}`,
        `Date: ${date}`,
        `Receipt ID: ${receiptId}`,
        ``,
        `To cancel your recurring gift, visit: https://easytogive.online/profile`,
        ``,
        `EasyToGive · easytogive.online`,
      ].join("\n")
    : [
        `Hi ${firstName},`,
        ``,
        `Thank you for your donation to ${orgName}.`,
        ...(orgEin ? [`EIN: ${orgEin}`] : []),
        ``,
        `Amount: ${formatCents(amountCents)}`,
        `Date: ${date}`,
        `Receipt ID: ${receiptId}`,
        ...(receiptUrl ? [``, `View your receipt online: ${receiptUrl}`] : []),
        ``,
        `No goods or services were provided in exchange for this contribution. This donation may be tax-deductible to the extent permitted by law.`,
        ``,
        `EasyToGive · easytogive.online`,
      ].join("\n");
```

- [ ] **Step 2: Add `text` to the resend.emails.send() call**

Find the `resend.emails.send()` call in `sendReceiptEmail`. Add `text` after the `headers` field:

```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html: receiptHtml({ ... }),
      text,
      attachments: pdfBuffer ? [ ... ] : undefined,
    });
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add lib/email.ts
git commit -m "feat: add plain-text body to sendReceiptEmail"
```

---

### Task 5: Add plain-text body to remaining four email functions

**Files:**
- Modify: `lib/email.ts`

- [ ] **Step 1: Add plain text to sendDigestEmail**

Inside `sendDigestEmail`, after the `html` template literal, add:

```typescript
  const text = `EasyToGive Inbox Digest\n\n${digest}\n\nOpen inbox: https://easytogive.online/admin/email`;
```

Then add `text` to the send call (which you already expanded in Task 3):

```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
      text,
    });
```

- [ ] **Step 2: Add plain text to sendImpactUpdateEmail**

Inside `sendImpactUpdateEmail`, after the `html` template literal, add:

```typescript
  const firstName = donorName ? donorName.split(" ")[0] : "there";
  const text = [
    `Hi ${firstName},`,
    ``,
    `${orgName} just shared a new impact update.`,
    ...(statHighlight ? [``, statHighlight] : []),
    ...(summary ? [``, summary] : []),
    ``,
    `See the full update: ${orgUrl}`,
    `View all your impact updates: ${walletUrl}`,
    ``,
    `EasyToGive · easytogive.online`,
  ].join("\n");
```

Then add `text` to the send call:

```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `${orgName} just shared an impact update`,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
      text,
    });
```

- [ ] **Step 3: Add plain text to sendApprovalEmail**

Inside `sendApprovalEmail`, after the `html` template literal, add:

```typescript
  const firstName = contactName ? contactName.split(" ")[0] : "there";
  const text = [
    `Hi ${firstName},`,
    ``,
    `${orgName} has been listed on EasyToGive.`,
    ``,
    `Create your account at: ${signupUrl}`,
    ``,
    `Use this email address when signing up: ${to}`,
    ``,
    `EasyToGive · easytogive.online`,
  ].join("\n");
```

Then add `text` to the send call:

```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `Welcome to EasyToGive — ${orgName} is ready`,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
      text,
    });
```

- [ ] **Step 4: Add plain text to sendGoLiveEmail**

Inside `sendGoLiveEmail`, after the `html` template literal, add:

```typescript
  const text = [
    `${orgName} is now live on EasyToGive.`,
    ``,
    `Your organization has been approved and is now visible to donors.`,
    ``,
    `Go to your dashboard: ${dashboardUrl}`,
    `View your public page: ${orgUrl}`,
    ``,
    `EasyToGive · receipts@easytogive.online`,
  ].join("\n");
```

Then add `text` to the send call:

```typescript
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `${orgName} is now live on EasyToGive`,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
      text,
    });
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add lib/email.ts
git commit -m "feat: add plain-text body to remaining email functions"
```

---

### Task 6: Build verification

**Files:** None.

- [ ] **Step 1: Full build**

```bash
cd /Users/sethmitzel/easytogive && npm run build 2>&1 | tail -10
```

Expected: clean output ending in the route table with no errors.

- [ ] **Step 2: Verify email structure (manual)**

Trigger any email from the running app (or via Resend dashboard test send). Open in Gmail → three-dot menu → "Show original".

Confirm all three lines pass:
```
spf=pass
dkim=pass
dmarc=pass
```

And confirm `Content-Type: multipart/alternative` appears in the headers, which indicates both HTML and plain-text parts are present.
