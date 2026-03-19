import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const db = getSupabaseAdmin();
  const { orgId, action } = await req.json();

  if (!orgId || !["suspend", "unsuspend", "verify", "unverify"].includes(action)) {
    return NextResponse.json({ error: "orgId and valid action required" }, { status: 400 });
  }

  let update: Record<string, unknown> = {};
  if (action === "suspend") update = { suspended: true };
  if (action === "unsuspend") update = { suspended: false };
  if (action === "verify") update = { verified: true };
  if (action === "unverify") update = { verified: false };

  const { error } = await db
    .from("organizations")
    .update(update as any)
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(`org_${action}`, "organization", orgId, {
    performedBy: (auth as { user: { email: string } }).user.email,
  });

  return NextResponse.json({ success: true });
}
