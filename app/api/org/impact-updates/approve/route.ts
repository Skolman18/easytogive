import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { sendImpactUpdateEmail } from "@/lib/email";
import { ADMIN_EMAIL } from "@/lib/admin";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function requireAdmin(): Promise<{ error: NextResponse } | { error: null }> {
  const serverSupabase = await createServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  if (user.email !== ADMIN_EMAIL) return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  return { error: null };
}

// POST /api/org/impact-updates/approve
// Body: { updateId: string }
// Approves the impact update and emails all donors who gave to that org.
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { updateId } = await req.json();
  if (!updateId) {
    return NextResponse.json({ error: "Missing updateId" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Approve the update
  const { data: update, error: updateError } = await supabase
    .from("org_impact_updates")
    .update({ status: "approved", visible: true, reviewed_at: new Date().toISOString() })
    .eq("id", updateId)
    .select("id, org_id, ai_stat_highlight, ai_summary, stat_value, stat_label")
    .single();

  if (updateError || !update) {
    return NextResponse.json({ error: "Update not found or already processed." }, { status: 404 });
  }

  // Fetch org details
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", update.org_id)
    .single();

  if (!org) {
    return NextResponse.json({ approved: true, emailsSent: 0 });
  }

  // Find unique donors for this org
  const { data: donations } = await supabase
    .from("donations")
    .select("user_id")
    .eq("org_id", update.org_id);

  const uniqueUserIds = [...new Set((donations ?? []).map((d: any) => d.user_id as string))];

  if (uniqueUserIds.length === 0) {
    return NextResponse.json({ approved: true, emailsSent: 0 });
  }

  // Fetch donor emails and names
  const { data: donors } = await supabase
    .from("users")
    .select("id, email, full_name")
    .in("id", uniqueUserIds);

  // Build stat highlight: prefer AI-generated, fall back to raw stat fields
  const statHighlight =
    update.ai_stat_highlight ||
    (update.stat_value && update.stat_label
      ? `${update.stat_value} ${update.stat_label}`
      : null);

  // Email each donor
  let emailsSent = 0;
  for (const donor of donors ?? []) {
    if (!donor.email) continue;
    await sendImpactUpdateEmail({
      to: donor.email,
      donorName: donor.full_name,
      orgName: org.name,
      orgId: org.id,
      statHighlight,
      summary: update.ai_summary,
    });
    emailsSent++;
  }

  return NextResponse.json({ approved: true, emailsSent });
}
