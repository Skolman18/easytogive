import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

export async function GET(
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Fetch receipt and verify ownership
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

  // Redirect browser to signed URL — triggers PDF download
  return NextResponse.redirect(signedData.signedUrl);
}
