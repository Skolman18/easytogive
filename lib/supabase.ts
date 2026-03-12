import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getRequiredEnv } from "./env";

export const supabase = createClient<Database>(
  getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
);
