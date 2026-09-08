import { NextRequest, NextResponse } from "next/server";

import { assertCronSecret } from "@/lib/cron-auth";
import { getEInvoicingProvider } from "@/lib/facturation/pa/get-provider";
import { pollAndIngestLifecycleEvents } from "@/lib/facturation/pa/poll-events";
import { SupabaseCycleStore } from "@/lib/facturation/pa/supabase-cycle-store";
import { loadTokens, saveTokens, setLastInvoiceEventId } from "@/lib/facturation/pa/supabase-token-store";
import { withFreshTokens } from "@/lib/facturation/pa/with-fresh-tokens";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Polling invoice_events. Pour basculer en webhooks : parser le payload
 * puis appeler ingestLifecycleEvents (même fonction que pollAndIngestLifecycleEvents).
 */
export async function GET(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const provider = getEInvoicingProvider();
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json({ ok: true, skipped: true, reason: "admin_client" });
  }

  const { data: connections, error } = await supabase.from("einvoicing_connections").select("user_id, last_invoice_event_id, status");
  if (error) {
    return NextResponse.json({ ok: true, skipped: true, reason: error.message });
  }

  const store = new SupabaseCycleStore(supabase);
  let ingested = 0;
  for (const row of connections ?? []) {
    if (row.status !== "verified" && row.status !== "token_expired") continue;
    const userId = String(row.user_id);
    try {
      const tokens = await loadTokens(supabase, userId, provider.id);
      if (!tokens) continue;
      const entity = { userId };
      const { result, tokens: fresh } = await withFreshTokens(provider, entity, tokens, (t) =>
        pollAndIngestLifecycleEvents(provider, store, entity, t, {
          afterEventId: row.last_invoice_event_id ? String(row.last_invoice_event_id) : undefined,
        }),
      );
      if (fresh.expiresAt !== tokens.expiresAt) {
        await saveTokens(supabase, userId, provider.id, fresh);
      }
      ingested += result.applied;
      if (result.lastProviderEventId) {
        await setLastInvoiceEventId(supabase, userId, result.lastProviderEventId);
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ ok: true, connections: connections?.length ?? 0, ingested });
}
