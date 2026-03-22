import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL } from "@/lib/admin";

const VALID_EVENTS = ["card_click", "profile_view"] as const;
type EventType = (typeof VALID_EVENTS)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = checkRateLimit(ip, "org-track", 60, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Validate event_type
  let event_type: EventType;
  try {
    const body = await req.json();
    if (!VALID_EVENTS.includes(body.event_type)) {
      return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
    }
    event_type = body.event_type;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { orgId } = await params;

  // Skip if org owner or admin
  try {
    const supabaseAuth = await createServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (user) {
      if (user.email === ADMIN_EMAIL) return NextResponse.json({ ok: true });
      // Check if viewer owns this org
      const { data: org } = await (supabaseAuth as any)
        .from("organizations")
        .select("owner_user_id")
        .eq("id", orgId)
        .single();
      if (org?.owner_user_id === user.id) return NextResponse.json({ ok: true });
    }
  } catch {
    // If auth check fails, proceed with insert
  }

  // Insert event using service role client (bypasses RLS)
  const supabase = getSupabaseAdmin();
  const { error: insertError } = await (supabase as any)
    .from("org_events")
    .insert({ org_id: orgId, event_type });

  if (insertError) {
    console.error("[org-track] insert failed:", insertError.message);
  }

  return NextResponse.json({ ok: true });
}
