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

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const GREEN = "#1a7a4a";
    const GRAY = "#6b7280";
    const DARK = "#111827";
    const pageWidth = doc.page.width - 120; // usable width between margins

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

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(DARK)
      .text("Tax Deductibility Notice", 60, doc.y);
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
