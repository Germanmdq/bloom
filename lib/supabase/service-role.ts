import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

/** Cliente con service role (solo servidor; nunca exponer al cliente). */
export function createServiceRoleClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
