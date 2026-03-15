import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL } from "@/lib/admin";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = [
  "name",
  "tagline",
  "description",
  "our_story",
  "website",
  "image_url",
  "cover_url",
  "location",
  "founded",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function PATCH(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  // Authenticate the caller
  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { orgId?: string; updates?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { orgId, updates } = body;
  if (!orgId || !updates || typeof updates !== "object") {
    return NextResponse.json({ error: "orgId and updates are required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Verify the caller owns this org (or is admin)
  const isAdmin = user.email === ADMIN_EMAIL;
  if (!isAdmin) {
    const { data: org } = await admin
      .from("organizations")
      .select("id, contact_email, owner_user_id")
      .eq("id", orgId)
      .single();

    if (
      !org ||
      (org.contact_email !== user.email && org.owner_user_id !== user.id)
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Stamp owner_user_id if not set yet (org rep invited via email)
    if (!org.owner_user_id) {
      await admin.from("organizations").update({ owner_user_id: user.id }).eq("id", orgId);
    }
  }

  // Only allow whitelisted fields
  const safeUpdates: Partial<Record<AllowedField, string>> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in updates && typeof updates[field] === "string") {
      safeUpdates[field] = updates[field].slice(0, 5000);
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("organizations")
    .update(safeUpdates)
    .eq("id", orgId)
    .select()
    .single();

  if (error) {
    console.error("org update error:", error);
    return NextResponse.json({ error: "Failed to update organization." }, { status: 500 });
  }

  return NextResponse.json({ organization: data });
}
