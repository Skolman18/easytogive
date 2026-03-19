import { createClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL } from "@/lib/admin";
import { NextResponse } from "next/server";

/**
 * Verifies the request is from the admin user.
 * Returns { user } on success, or a NextResponse 401/403 to return immediately.
 */
export async function requireAdmin(): Promise<
  { user: { id: string; email: string } } | NextResponse
> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { user: { id: user.id, email: user.email! } };
}

/** Write an entry to admin_logs using the service role client. */
export async function logAdminAction(
  action: string,
  entityType: string | null,
  entityId: string | null,
  details: Record<string, unknown> = {}
) {
  const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
  const db = getSupabaseAdmin();
  await db.from("admin_logs").insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}
