import { createClient } from "@supabase/supabase-js";

/** Service role — uniquement routes serveur (cron, webhooks, emails). */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY et NEXT_PUBLIC_SUPABASE_URL requis.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
