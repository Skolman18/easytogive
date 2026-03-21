# Email Deliverability — Design Spec

## Problem

Emails sent from `receipts@easytogive.online` are landing in Gmail spam. Root cause analysis identified two critical DNS gaps and a code-level best practice gap:

1. **No SPF record** — Receiving mail servers have no proof that AWS SES (Resend's sending infrastructure) is authorized to send on behalf of `easytogive.online`
2. **DMARC policy is `p=none`** — Monitoring-only mode; Gmail treats this as unauthenticated mail
3. **HTML-only emails** — No plain-text alternative increases spam scoring
4. **No `List-Unsubscribe` header** — Gmail rewards transactional senders that include this

DKIM is already verified via Resend's domain verification (completed Mar 14, 2026).

---

## Changes

### Part 1 — DNS (manual, done in Get.tech DNS panel)

**Do these in order.** Verify Step 1a is working before applying Step 1b.

#### Step 1a — Add SPF record

Before adding, confirm there is no existing SPF TXT record on `@`. If one exists, merge the `include:amazonses.com` mechanism into it rather than creating a second SPF record (two SPF records cause an immediate `permerror`).

Add a new TXT record on the root domain:

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `@` (or `easytogive.online`) | `v=spf1 include:amazonses.com ~all` | 3600 |

Resend routes all outbound mail through AWS SES (`amazonses.com`). The `~all` softfail ensures legitimate mail still delivers during any misconfiguration period.

**Verify before proceeding to Step 1b:** Send a test email to a Gmail address. Open the email → click the three-dot menu → "Show original". Look for `spf=pass` in the `Authentication-Results` header. If it shows `spf=fail` or `spf=neutral`, do not proceed — check that the TXT record propagated (may take up to 1 hour; check via `mxtoolbox.com/spf` with `easytogive.online`).

#### Step 1b — Update DMARC record

Only do this after Step 1a is verified working. The existing DMARC record at `_dmarc.easytogive.online` is `v=DMARC1; p=none`. Update to:

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:receipts@easytogive.online` | 3600 |

`p=quarantine` tells Gmail to treat unauthenticated mail from this domain as spam rather than silently passing it. `rua` adds an aggregate report address — note that DMARC reports are XML files sent by major receivers (Google, Microsoft) and require a parser to read. They can be safely ignored at low volume; the value of `rua` here is signal collection, not active monitoring.

---

### Part 2 — Code changes (`lib/email.ts`)

#### 2a. Add plain-text versions to all emails

All five send functions (`sendReceiptEmail`, `sendDigestEmail`, `sendImpactUpdateEmail`, `sendApprovalEmail`, `sendGoLiveEmail`) currently send HTML only. Add a `text` field to each `resend.emails.send()` call with a plain-text version.

The plain-text version should be a readable summary. It does not need to match the HTML exactly — it just needs to convey the same key information without HTML tags.

**`sendReceiptEmail`** — three states, all need plain text:

Single-org donation:
```
Hi [donorName or "there"],

Thank you for your donation to [orgName].

Amount: $X.XX
[if orgEin] EIN: [orgEin]
Date: [date]
Receipt ID: [receiptId]

[if receiptUrl] View your receipt online: [receiptUrl]

No goods or services were provided in exchange for this contribution.
This donation may be tax-deductible to the extent permitted by law.

EasyToGive · easytogive.online
```

Recurring:
```
Hi [donorName or "there"],

Your recurring gift to [orgName] has been set up.

Amount per period: $X.XX
Frequency: [frequency]
Date: [date]
Receipt ID: [receiptId]

To cancel your recurring gift, visit: https://easytogive.online/profile

EasyToGive · easytogive.online
```

Portfolio (multiple orgs):
```
Hi [donorName or "there"],

Thank you for your portfolio donation of $X.XX across [N] organizations.

[For each allocation:]
[orgName]: $X.XX

Date: [date]
Receipt ID: [receiptId]

No goods or services were provided in exchange for this contribution.

EasyToGive · easytogive.online
```

Mirror the existing conditional logic in `receiptHtml()` to determine which state applies (`isPortfolio`, `isRecurring`).

**`sendDigestEmail`** (internal admin email):
```
EasyToGive Inbox Digest

[digest text]

Open inbox: https://easytogive.online/admin/email
```

**`sendImpactUpdateEmail`**:
```
Hi [donorName or "there"],

[orgName] just shared a new impact update.

[if statHighlight] [statHighlight]

[if summary] [summary]

See the full update: https://easytogive.online/org/[orgId]
View all your impact updates: https://easytogive.online/wallet

EasyToGive · easytogive.online
```

**`sendApprovalEmail`**:
```
Hi [contactName or "there"],

[orgName] has been listed on EasyToGive.

Create your account at: https://easytogive.online/auth/signup

Use this email address when signing up: [to]

EasyToGive · easytogive.online
```

**`sendGoLiveEmail`**:
```
[orgName] is now live on EasyToGive.

Your organization has been approved and is now visible to donors.

Go to your dashboard: https://easytogive.online/org/dashboard
View your public page: https://easytogive.online/org/[orgId]

EasyToGive · receipts@easytogive.online
```

#### 2b. Add `List-Unsubscribe` header

Add a `headers` field to each `resend.emails.send()` call for all five functions:

```typescript
headers: {
  "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
},
```

Note: `List-Unsubscribe-Post` (RFC 8058 one-click) is intentionally omitted — it requires an `https://` POST endpoint to function correctly. A `mailto:`-only header with `List-Unsubscribe-Post` is malformed per RFC 8058. The `mailto:` header alone is sufficient for Gmail to classify mail as legitimate transactional mail at current sending volume.

`sendDigestEmail` is an internal admin email; adding the header there is harmless and consistent.

---

### Part 3 — Google Postmaster Tools (manual, no code)

Register `easytogive.online` at [postmaster.google.com](https://postmaster.google.com):

1. Go to postmaster.google.com → Add domain → enter `easytogive.online`
2. Copy the verification TXT record shown and add it to DNS in Get.tech
3. Click Verify in Postmaster Tools
4. After 24–48 hours of sending, the dashboard shows domain reputation, spam rate, and authentication pass rates

This does not directly fix spam — it provides visibility into Gmail's view of the domain over time.

---

## Out of Scope

- Dedicated IP (Resend paid feature — not needed at current volume)
- Custom tracking subdomain (click tracking is already off)
- Email warm-up service (ask early recipients to mark as "not spam" and add to contacts)
- `https` unsubscribe endpoint (future work if sending volume grows to bulk-sender threshold)

---

## Expected Outcome

After SPF and DMARC are updated (DNS propagation ~1 hour per record), new emails should pass all three authentication checks: `spf=pass`, `dkim=pass`, `dmarc=pass`. Combined with plain-text bodies and `List-Unsubscribe` headers, emails should consistently land in the primary inbox. Gmail's domain reputation score will build over 1–2 weeks of legitimate sending.

---

## Verification

1. After Step 1a: send a test email to Gmail, open "Show original", confirm `spf=pass`
2. After Step 1b: send another test email, confirm `dmarc=pass`
3. After code deploy: send a test, confirm email has a readable plain-text version (Gmail web → three-dot menu → "Show original" → look for `Content-Type: text/plain`)
4. After 24h: check Google Postmaster Tools for domain reputation signal
