# Email Deliverability — Design Spec

## Problem

Emails sent from `receipts@easytogive.online` are landing in Gmail spam. Root cause analysis identified two critical DNS gaps and a code-level best practice gap:

1. **No SPF record** — Receiving mail servers have no proof that AWS SES (Resend's sending infrastructure) is authorized to send on behalf of `easytogive.online`
2. **DMARC policy is `p=none`** — Monitoring-only mode; Gmail treats this as unauthenticated mail
3. **HTML-only emails** — No plain-text alternative increases spam scoring
4. **No `List-Unsubscribe` headers** — Gmail penalizes transactional senders that don't include this

DKIM is already verified via Resend's domain verification (completed Mar 14, 2026).

---

## Changes

### Part 1 — DNS (manual, done in Get.tech DNS panel)

#### 1a. Add SPF record

Add a new TXT record on the root domain:

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `@` (or `easytogive.online`) | `v=spf1 include:amazonses.com ~all` | 3600 |

Resend routes all outbound mail through AWS SES (`amazonses.com`). The `~all` softfail ensures legitimate mail still delivers during any misconfiguration period. Once stable, can be upgraded to `-all` (hardfail).

#### 1b. Update DMARC record

The existing DMARC record at `_dmarc.easytogive.online` is `v=DMARC1; p=none`. Update the `p` tag to `quarantine`:

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:receipts@easytogive.online` | 3600 |

`rua` adds a reporting address so you can receive aggregate DMARC reports and verify mail is authenticating correctly.

---

### Part 2 — Code changes (`lib/email.ts`)

#### 2a. Add plain-text versions to all emails

All five send functions (`sendReceiptEmail`, `sendDigestEmail`, `sendImpactUpdateEmail`, `sendApprovalEmail`, `sendGoLiveEmail`) currently send HTML only. Add a `text` field to each `resend.emails.send()` call with a plain-text summary of the email content.

The plain-text version does not need to match the HTML exactly — it just needs to be a readable, human-written summary of the same content. This signals to spam filters that the email is legitimate and readable without HTML rendering.

**Format:** Each function gets a `buildPlainText(...)` helper (inline string construction, no new files) returning the key info as readable text. Example for receipt:

```
Hi [name],

Thank you for your donation to [org].

Amount: $X.XX
Date: [date]
Receipt ID: [id]

View your receipt: [url]

EasyToGive · easytogive.online
```

#### 2b. Add `List-Unsubscribe` headers

Add a `headers` field to each `resend.emails.send()` call:

```typescript
headers: {
  "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
},
```

This applies to all five email types. Gmail uses `List-Unsubscribe` to classify email as legitimate transactional mail rather than spam. `List-Unsubscribe-Post` enables one-click unsubscribe per RFC 8058, which is now required by Gmail for bulk senders.

---

### Part 3 — Google Postmaster Tools (manual, no code)

Register `easytogive.online` at [postmaster.google.com](https://postmaster.google.com) to:
- Monitor domain reputation score
- Detect spam rate spikes
- Verify DKIM/DMARC alignment is working

Steps:
1. Go to postmaster.google.com → Add domain → `easytogive.online`
2. Add the verification TXT record to DNS (Get.tech)
3. Once verified, the dashboard shows domain reputation, spam rate, and DMARC/DKIM pass rates

---

## Out of Scope

- Dedicated IP address (Resend paid feature — not needed at current volume)
- Custom tracking subdomain (click tracking is already off)
- Email warm-up service (manual warm-up is sufficient: ask early recipients to mark as "not spam")
- Unsubscribe management system (the `List-Unsubscribe` mailto is sufficient; actual unsubscribes are very rare for transactional email)

---

## Expected Outcome

After SPF and DMARC are updated (DNS propagation ~1 hour), new emails should pass all three authentication checks (SPF ✓, DKIM ✓, DMARC ✓). Combined with plain-text bodies and List-Unsubscribe headers, emails should consistently land in the primary inbox within 1–2 weeks as Gmail builds domain reputation history.

---

## Verification

1. Send a test email to a Gmail address after DNS propagates
2. Open the email → "Show original" → verify `Authentication-Results` shows `spf=pass`, `dkim=pass`, `dmarc=pass`
3. Check Google Postmaster Tools after 24 hours for domain reputation signal
