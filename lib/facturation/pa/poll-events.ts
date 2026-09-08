import type { EInvoicingProvider } from "@/lib/facturation/pa/provider";
import { ingestLifecycleEvents, type CycleStore, type IngestResult } from "@/lib/facturation/pa/ingest-events";
import type { FiscalEntityRef, OAuthTokenSet } from "@/lib/facturation/pa/types";

/**
 * Réception par polling. Le seul changement pour passer aux webhooks
 * est de remplacer cet appel par un parse de payload → ingestLifecycleEvents.
 */
export async function pollAndIngestLifecycleEvents(
  provider: EInvoicingProvider,
  store: CycleStore,
  entity: FiscalEntityRef,
  tokens: OAuthTokenSet,
  input: { providerInvoiceId?: string; afterEventId?: string } = {},
): Promise<IngestResult> {
  const { events } = await provider.listLifecycleEvents(entity, tokens, input);
  return ingestLifecycleEvents(store, provider.id, events);
}
