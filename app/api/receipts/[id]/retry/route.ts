import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { generateReceiptPdf } from "@/lib/generateReceiptPdf";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(
  _req: NextRequest,
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

  // Fetch receipt with org data, verify ownership
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const donorName = (profile as any)?.full_name ?? null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
