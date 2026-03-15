import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-side API routes.
 * Bypasses RLS. Never expose this to the client.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin credentials not configured (SUPABASE_SERVICE_ROLE_KEY missing)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
