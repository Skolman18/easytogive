import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { sendGoLiveEmail } from "@/lib/email";
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
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  if (user.email !== ADMIN_EMAIL) {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { error: null };
}

// GET /api/org/applications — list all applications (admin only)
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("org_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("org_applications fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch applications." }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}

// PATCH /api/org/applications — update status/admin_notes on one application (admin only)
export async function PATCH(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: {
    id?: string;
    status?: "pending" | "approved" | "rejected";
    admin_notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { id, status, admin_notes } = body;

  if (!id) {
    return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (status) {
    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    updates.status = status;
    if (status !== "pending") updates.reviewed_at = new Date().toISOString();
  }
  if (typeof admin_notes === "string") {
    updates.admin_notes = admin_notes.slice(0, 2000);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("org_applications")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("org_applications update error:", error);
    return NextResponse.json({ error: "Failed to update application." }, { status: 500 });
  }

  // On approval: flip org to visible and send go-live email
  if (status === "approved" && data.email) {
    const { data: orgRows, error: visibleError } = await supabase
      .from("organizations")
      .update({ visible: true })
      .eq("contact_email", data.email)
      .select("id");

    if (visibleError || !orgRows || orgRows.length === 0) {
      console.error("Failed to activate org:", visibleError?.message ?? "no rows matched");
      // Revert the status change so admin can retry
      await supabase
        .from("org_applications")
        .update({ status: "pending", reviewed_at: null })
        .eq("id", id);
      return NextResponse.json(
        { error: "Could not activate organization — org record not found. Was the application submitted through the new wizard?" },
        { status: 500 }
      );
    }

    const orgId = orgRows[0].id;

    // Send go-live email (non-critical — continue even if it fails)
    await sendGoLiveEmail({
      to: data.email,
      orgName: data.org_name,
      orgId,
    });
  }

  return NextResponse.json({ application: data });
}
