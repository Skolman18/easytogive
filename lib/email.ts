import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// Use RESEND_FROM_EMAIL once your domain is verified in Resend dashboard.
// Until then, onboarding@resend.dev works for any recipient on the free plan.
const FROM = process.env.RESEND_FROM_EMAIL ?? "EasyToGive <onboarding@resend.dev>";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export interface ReceiptAllocation {
  orgName: string;
  orgEin?: string | null;
  amountCents: number;
}

function receiptHtml({
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
}): string {
  const date = new Date(donatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const freqLabel = frequency
    ? frequency.charAt(0).toUpperCase() + frequency.slice(1)
    : "Recurring";
  const greeting = donorName ? `Hi ${donorName.split(" ")[0]},` : "Hi there,";
  const isPortfolio = allocations && allocations.length > 1;
  const displayOrgName = isPortfolio ? "Multiple Organizations" : orgName;

  const allocationRows = isPortfolio
    ? allocations!
        .map(
          (a) => `
        <tr style="border-top:1px solid #e5e1d8;">
          <td style="padding:8px 0 4px;color:#374151;font-size:13px;">
            ${a.orgName}${a.orgEin ? `<br/><span style="color:#9ca3af;font-size:11px;">EIN: ${a.orgEin}</span>` : ""}
          </td>
          <td style="padding:8px 0 4px;color:#1a7a4a;font-size:13px;font-weight:600;text-align:right;">${formatCents(a.amountCents)}</td>
        </tr>`
        )
        .join("")
    : "";

  const einRow =
    !isPortfolio && orgEin
      ? `<tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">EIN</td>
          <td style="padding:6px 0;color:#111827;font-size:13px;text-align:right;font-family:monospace;">${orgEin}</td>
        </tr>`
      : "";

  const donorRow = donorName
    ? `<tr>
        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Donor</td>
        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;text-align:right;">${donorName}</td>
      </tr>`
    : "";

  const viewReceiptLink = receiptUrl
    ? `<a href="${receiptUrl}" style="display:inline-block;margin-top:4px;background:#1a7a4a;color:white;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;">View Receipt Online →</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Donation Receipt ${receiptId}</title>
</head>
<body style="margin:0;padding:0;background:#faf9f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:white;border-radius:16px;border:1px solid #e5e1d8;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#1a7a4a;padding:28px 32px;text-align:center;">
              <p style="margin:0;color:white;font-size:22px;font-weight:700;letter-spacing:-0.3px;">EasyToGive</p>
              <p style="margin:6px 0 0;color:#bbf7d0;font-size:13px;">
                ${isRecurring ? `${freqLabel} Giving Confirmation` : "Official Donation Receipt"}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">${greeting}</p>
              <p style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700;">
                ${isRecurring ? "Recurring giving activated!" : "Thank you for your generosity!"}
              </p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                ${
                  isPortfolio
                    ? `Your portfolio donation of <strong style="color:#1a7a4a;">${formatCents(amountCents)}</strong> has been split across ${allocations!.length} organizations.`
                    : isRecurring
                    ? `Your ${freqLabel.toLowerCase()} gift to <strong style="color:#111827;">${orgName}</strong> has been set up.`
                    : `Your donation to <strong style="color:#111827;">${orgName}</strong> has been processed.`
                }
              </p>

              <!-- Receipt box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e1d8;border-radius:12px;background:#faf9f6;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${donorRow}
                      ${
                        !isPortfolio
                          ? `<tr>
                              <td style="padding:6px 0;color:#6b7280;font-size:13px;">Organization</td>
                              <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;text-align:right;">${orgName}</td>
                            </tr>
                            ${einRow}`
                          : ""
                      }
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">${isRecurring ? "Amount per period" : "Total Amount"}</td>
                        <td style="padding:6px 0;color:#1a7a4a;font-size:13px;font-weight:700;text-align:right;">${formatCents(amountCents)}</td>
                      </tr>
                      ${
                        isRecurring
                          ? `<tr>
                              <td style="padding:6px 0;color:#6b7280;font-size:13px;">Frequency</td>
                              <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;text-align:right;">${freqLabel}</td>
                            </tr>`
                          : ""
                      }
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Date</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;text-align:right;">${date}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding:12px 0 0;border-top:1px solid #e5e1d8;"></td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280;font-size:12px;">Receipt ID</td>
                        <td style="color:#6b7280;font-size:12px;text-align:right;font-family:monospace;">${receiptId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${
                isPortfolio
                  ? `<!-- Portfolio breakdown -->
                    <p style="margin:0 0 8px;color:#374151;font-size:13px;font-weight:600;">Donation breakdown</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e1d8;border-radius:12px;background:#faf9f6;margin-bottom:24px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            ${allocationRows}
                          </table>
                        </td>
                      </tr>
                    </table>`
                  : ""
              }

              <!-- Tax deductibility notice -->
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
                <p style="margin:0 0 6px;color:#1d4ed8;font-size:13px;font-weight:700;">Tax Deductibility Notice</p>
                <p style="margin:0;color:#1e40af;font-size:12px;line-height:1.7;">
                  No goods or services were provided in exchange for this contribution.
                  ${orgEin && !isPortfolio ? `The EIN for ${orgName} is <strong>${orgEin}</strong>.` : ""}
                  This donation may be tax-deductible to the extent permitted by law.
                  Please retain this receipt for your tax records.
                </p>
              </div>

              ${
                viewReceiptLink
                  ? `<div style="text-align:center;margin-bottom:20px;">${viewReceiptLink}</div>`
                  : ""
              }

              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                View all your receipts at
                <a href="https://easytogive.online/profile?tab=receipts" style="color:#1a7a4a;">easytogive.online/profile</a>.
                ${isRecurring ? "<br/>To cancel your recurring gift, visit your profile settings." : ""}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e1d8;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:11px;">
                EasyToGive · easytogive.online · Giving made simple
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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
  const resend = getResend();
  if (!resend) return; // silently skip if not configured

  const isPortfolio = allocations && allocations.length > 1;

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

  const subject = isRecurring
    ? `Recurring giving confirmed — ${orgName} [${receiptId}]`
    : isPortfolio
    ? `Donation receipt — Portfolio giving [${receiptId}]`
    : `Donation receipt — ${orgName} [${receiptId}]`;

  try {
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      text,
      html: receiptHtml({
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
      }),
      attachments: pdfBuffer
        ? [
            {
              filename: "receipt.pdf",
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ]
        : undefined,
    });
  } catch (err) {
    // Log but don't throw — a failed email shouldn't break the webhook response
    console.error("Failed to send receipt email:", err);
  }
}

export async function sendDigestEmail({
  to,
  digest,
  urgentCount,
}: {
  to: string;
  digest: string;
  urgentCount: number;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const subject =
    urgentCount > 0
      ? `🔴 ${urgentCount} urgent email${urgentCount > 1 ? "s" : ""} — EasyToGive inbox digest`
      : `📬 EasyToGive inbox digest`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#faf9f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:white;border-radius:16px;border:1px solid #e5e1d8;overflow:hidden;">
        <tr>
          <td style="background:#0d1117;padding:24px 32px;">
            <p style="margin:0;color:white;font-size:18px;font-weight:700;">EasyToGive</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Email Digest</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <pre style="margin:0;white-space:pre-wrap;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.7;color:#374151;">${digest}</pre>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:14px 32px;border-top:1px solid #e5e1d8;text-align:center;">
            <a href="https://easytogive.online/admin/email" style="color:#1a7a4a;font-size:13px;font-weight:600;text-decoration:none;">Open inbox →</a>
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
      subject,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
    });
  } catch (err) {
    console.error("Failed to send digest email:", err);
  }
}

export async function sendImpactUpdateEmail({
  to,
  donorName,
  orgName,
  orgId,
  statHighlight,
  summary,
}: {
  to: string;
  donorName?: string | null;
  orgName: string;
  orgId: string;
  statHighlight?: string | null;
  summary?: string | null;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const greeting = donorName ? `Hi ${donorName.split(" ")[0]},` : "Hi there,";
  const walletUrl = "https://easytogive.online/wallet";
  const orgUrl = `https://easytogive.online/org/${orgId}`;

  const statBlock = statHighlight
    ? `<div style="margin-bottom:20px;padding:16px 20px;background:#e8f5ee;border-radius:12px;border:1px solid #bbf7d0;">
        <p style="margin:0;color:#1a7a4a;font-size:22px;font-weight:700;line-height:1.2;">${statHighlight}</p>
      </div>`
    : "";

  const summaryBlock = summary
    ? `<p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.7;">${summary}</p>`
    : "";

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
            <p style="margin:6px 0 0;color:#bbf7d0;font-size:13px;">Impact Update</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">${greeting}</p>
            <p style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;">Your giving made a difference.</p>
            <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">
              <strong style="color:#111827;">${orgName}</strong> just shared a new impact update — here's what your donation helped accomplish:
            </p>
            ${statBlock}
            ${summaryBlock}
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
              <tr>
                <td align="center">
                  <a href="${orgUrl}"
                     style="display:inline-block;background:#1a7a4a;color:white;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
                    See the full update →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
              <a href="${walletUrl}" style="color:#1a7a4a;">View all your impact updates in your wallet</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e1d8;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:11px;">EasyToGive · Giving made easy · easytogive.online</p>
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
      subject: `${orgName} just shared an impact update`,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
    });
  } catch (err) {
    console.error("Failed to send impact update email:", err);
  }
}

export async function sendApprovalEmail({
  to,
  orgName,
  contactName,
}: {
  to: string;
  orgName: string;
  contactName?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const greeting = contactName ? `Hi ${contactName.split(" ")[0]},` : "Hi there,";
  const signupUrl = `https://easytogive.online/auth/signup`;

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
            <p style="margin:6px 0 0;color:#bbf7d0;font-size:13px;">Organization Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 12px;color:#6b7280;font-size:14px;line-height:1.7;">${greeting}</p>
            <p style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;">Welcome to EasyToGive</p>
            <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.7;">
              <strong style="color:#111827;">${orgName}</strong> has been listed on EasyToGive and donors can start giving today.
              To manage your listing and connect your bank account, you need to create an account.
            </p>
            <div style="background:#faf9f6;border:1px solid #e5e1d8;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 8px;color:#374151;font-size:13px;font-weight:700;">Important: use this email address to sign up</p>
              <p style="margin:0;color:#1a7a4a;font-size:14px;font-weight:700;font-family:monospace;">${to}</p>
            </div>
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
              <tr>
                <td align="center">
                  <a href="${signupUrl}"
                     style="display:inline-block;background:#1a7a4a;color:white;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
                    Create your account →
                  </a>
                </td>
              </tr>
            </table>
            <div style="background:#e8f5ee;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:0;">
              <p style="margin:0 0 8px;color:#1a7a4a;font-size:13px;font-weight:700;">After signing in:</p>
              <p style="margin:0 0 6px;color:#374151;font-size:13px;">• Connect your bank account to receive donations</p>
              <p style="margin:0 0 6px;color:#374151;font-size:13px;">• Complete your profile with photos and a mission statement</p>
              <p style="margin:0;color:#374151;font-size:13px;">• Share your EasyToGive page with supporters</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e1d8;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:11px;">EasyToGive · easytogive.online · Questions? Reply to this email.</p>
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
      subject: `Welcome to EasyToGive — ${orgName} is ready`,
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
    });
  } catch (err) {
    console.error("Failed to send approval email:", err);
  }
}

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
      headers: {
        "List-Unsubscribe": "<mailto:receipts@easytogive.online?subject=unsubscribe>",
      },
      html,
    });
  } catch (err) {
    console.error("Failed to send go-live email:", err);
  }
}
