import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { sendApprovalEmail } from "@/lib/email";
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

  // On approval: create org record, send email, invite org rep
  if (status === "approved" && data.email) {
    // Generate a slug-based org ID, falling back to a unique suffix on collision
    const baseSlug = (data.org_name as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    let orgId = baseSlug;

    // Check if org record already exists (re-approval after partial failure)
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("contact_email", data.email)
      .maybeSingle();

    if (!existingOrg) {
      const { data: existingById } = await supabase
        .from("organizations")
        .select("id")
        .eq("id", orgId)
        .maybeSingle();
      if (existingById) {
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
        // Revert the status change so admin can retry
        await supabase
          .from("org_applications")
          .update({ status: "pending", reviewed_at: null })
          .eq("id", id);
        return NextResponse.json(
          { error: `Failed to create organization record: ${orgInsertError.message}` },
          { status: 500 }
        );
      }
    } else {
      orgId = existingOrg.id;
    }

    // Send approval email (non-critical — continue even if it fails)
    await sendApprovalEmail({
      to: data.email,
      orgName: data.org_name,
      contactName: data.contact_name || undefined,
    });

    // Send Supabase invite so org rep can create their account
    const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://easytogive.online";
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: `${baseUrl}/auth/callback?next=/org/dashboard`,
      data: { org_name: data.org_name, org_id: orgId, account_type: "organization" },
    });
    if (inviteErr) {
      const alreadyRegistered =
        inviteErr.message.toLowerCase().includes("already been registered") ||
        inviteErr.message.toLowerCase().includes("already registered");

      if (!alreadyRegistered) {
        console.error("Failed to send org rep invite:", inviteErr.message);
        // Org record was created successfully; return a partial-success response
        // so admin knows to manually resend the invite
        return NextResponse.json(
          {
            application: data,
            warning: `Organization created but invite email failed: ${inviteErr.message}. Use Supabase Dashboard → Authentication → Users to resend the invite.`,
          },
          { status: 207 }
        );
      }
      // User already has an account — org is accessible via contact_email match
      // and the approval email (above) already directs them to /org/dashboard.
      // No action needed.
    }
  }

  return NextResponse.json({ application: data });
}
