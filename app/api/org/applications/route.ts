import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { sendApprovalEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "sethmitzel@gmail.com";

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

  // On approval: create org record, send email, invite org rep
  if (status === "approved" && data.email) {
    // Generate a slug-based org ID, falling back to a unique suffix on collision
    const baseSlug = (data.org_name as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    let orgId = baseSlug;
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .maybeSingle();
    if (existing) {
      orgId = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
    }

    // Create the organization record so the rep can access their dashboard
    const { error: orgInsertError } = await supabase.from("organizations").insert({
      id: orgId,
      name: data.org_name,
      tagline: "",
      description: data.description ?? "",
      category: data.category,
      subcategory: data.subcategory ?? null,
      contact_email: data.email,
      ein: data.ein || null,
      website: data.website || null,
      visible: false,        // hidden until the rep completes their profile
      verified: false,
      featured: false,
      raised: 0,
      goal: 0,
      donors: 0,
    });

    if (orgInsertError) {
      console.error("Failed to create org record on approval:", orgInsertError.message);
    }

    await sendApprovalEmail({
      to: data.email,
      orgName: data.org_name,
      contactName: data.contact_name || undefined,
    });

    const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://easytogive.online";
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: `${baseUrl}/auth/callback?next=/org/dashboard`,
      data: { org_name: data.org_name, org_id: orgId, account_type: "organization" },
    });
    if (inviteErr) {
      console.error("Failed to send org rep invite:", inviteErr.message);
    }
  }

  return NextResponse.json({ application: data });
}
