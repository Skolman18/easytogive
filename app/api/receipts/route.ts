import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

export async function GET(_req: NextRequest) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
