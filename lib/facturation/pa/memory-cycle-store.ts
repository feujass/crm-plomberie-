import type { CycleFactureRecord, CycleStore, StoredCycleEvent } from "@/lib/facturation/pa/ingest-events";
import type { ProviderId, StatutCycleVie } from "@/lib/facturation/pa/types";

/** Store en mémoire — tests et mock sans Postgres. */
export class MemoryCycleStore implements CycleStore {
  factures = new Map<string, CycleFactureRecord>();
  events = new Map<string, StoredCycleEvent>();

  seed(facture: CycleFactureRecord): void {
    this.factures.set(facture.id, { ...facture });
  }

  async findByProviderInvoiceId(providerInvoiceId: string): Promise<CycleFactureRecord | null> {
    for (const row of this.factures.values()) {
      if (row.providerInvoiceId === providerInvoiceId) return row;
    }
    return null;
  }

  async hasEvent(provider: ProviderId, providerEventId: string): Promise<boolean> {
    return this.events.has(`${provider}:${providerEventId}`);
  }

  async insertEvent(event: StoredCycleEvent): Promise<"inserted" | "duplicate"> {
    const k = `${event.provider}:${event.providerEventId}`;
    if (this.events.has(k)) return "duplicate";
    this.events.set(k, event);
    return "inserted";
  }

  async updateStatut(factureId: string, next: StatutCycleVie): Promise<void> {
    const row = this.factures.get(factureId);
    if (row) row.statutCycleVie = next;
  }
}
