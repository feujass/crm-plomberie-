import { createClient } from "@supabase/supabase-js";

import { supabasePublicUrl } from "@/lib/supabase/env";

/** Service role — uniquement routes serveur (cron, webhooks, emails). */
export function createAdminClient() {
  const url = supabasePublicUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY et NEXT_PUBLIC_SUPABASE_URL requis.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
