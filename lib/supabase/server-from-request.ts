import { createClient } from "@/lib/supabase/server";
import { createSupabaseBearerClient } from "@/lib/supabase/bearer-client";

/** Cookie (navigateur) ou `Authorization: Bearer <jwt>` (app mobile). */
export async function createClientFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  if (token) {
    return createSupabaseBearerClient(token);
  }
  return createClient();
}
