import { applyCycleEffect, effectFromStatusCode, isStatutCycleVie } from "@/lib/facturation/pa/cycle-machine";
import type { LifecycleEvent, ProviderId, StatutCycleVie } from "@/lib/facturation/pa/types";

export interface CycleFactureRecord {
  id: string;
  userId: string;
  statutCycleVie: StatutCycleVie;
  providerInvoiceId: string | null;
}

export interface StoredCycleEvent {
  provider: ProviderId;
  providerEventId: string;
  providerInvoiceId: string;
  factureId: string;
  userId: string;
  statusCode: string;
  payload: Record<string, unknown>;
}

export interface CycleStore {
  findByProviderInvoiceId(providerInvoiceId: string): Promise<CycleFactureRecord | null>;
  hasEvent(provider: ProviderId, providerEventId: string): Promise<boolean>;
  insertEvent(event: StoredCycleEvent): Promise<"inserted" | "duplicate">;
  updateStatut(factureId: string, next: StatutCycleVie): Promise<void>;
}

export interface IngestResult {
  received: number;
  duplicates: number;
  applied: number;
  skippedUnknownInvoice: number;
  lastProviderEventId: string | null;
  transitions: { factureId: string; from: StatutCycleVie; to: StatutCycleVie; statusCode: string }[];
}

/**
 * Point unique d’ingestion des événements de cycle de vie.
 * Polling et (plus tard) webhooks doivent uniquement appeler cette fonction.
 * Idempotence : un même `providerEventId` n’a qu’un effet.
 */
export async function ingestLifecycleEvents(
  store: CycleStore,
  provider: ProviderId,
  events: LifecycleEvent[],
): Promise<IngestResult> {
  const result: IngestResult = {
    received: events.length,
    duplicates: 0,
    applied: 0,
    skippedUnknownInvoice: 0,
    lastProviderEventId: null,
    transitions: [],
  };

  for (const event of events) {
    if (await store.hasEvent(provider, event.providerEventId)) {
      result.duplicates += 1;
      continue;
    }

    const facture = await store.findByProviderInvoiceId(event.providerInvoiceId);
    if (!facture || !isStatutCycleVie(facture.statutCycleVie)) {
      result.skippedUnknownInvoice += 1;
      continue;
    }

    const from = facture.statutCycleVie;
    const effect = effectFromStatusCode(event.statusCode);
    const to = applyCycleEffect(from, effect);

    const inserted = await store.insertEvent({
      provider,
      providerEventId: event.providerEventId,
      providerInvoiceId: event.providerInvoiceId,
      factureId: facture.id,
      userId: facture.userId,
      statusCode: event.statusCode,
      payload: {
        statusText: event.statusText,
        occurredAt: event.occurredAt,
        ...(event.payload ?? {}),
      },
    });
    if (inserted === "duplicate") {
      result.duplicates += 1;
      continue;
    }

    if (to !== from) {
      await store.updateStatut(facture.id, to);
      facture.statutCycleVie = to;
      result.transitions.push({ factureId: facture.id, from, to, statusCode: event.statusCode });
    }

    result.applied += 1;
    result.lastProviderEventId = event.providerEventId;
  }

  return result;
}
