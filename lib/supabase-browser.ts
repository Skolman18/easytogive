import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// This client stores the session in cookies (not localStorage), so the session
// is visible to both client components and server-side middleware/route handlers.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
