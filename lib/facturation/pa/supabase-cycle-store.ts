import type { SupabaseClient } from "@supabase/supabase-js";
import type { CycleFactureRecord, CycleStore, StoredCycleEvent } from "@/lib/facturation/pa/ingest-events";
import type { ProviderId, StatutCycleVie } from "@/lib/facturation/pa/types";

export class SupabaseCycleStore implements CycleStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByProviderInvoiceId(providerInvoiceId: string): Promise<CycleFactureRecord | null> {
    const { data, error } = await this.supabase
      .from("factures")
      .select("id, user_id, statut_cycle_vie, einvoicing_provider_invoice_id")
      .eq("einvoicing_provider_invoice_id", providerInvoiceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      id: String(data.id),
      userId: String(data.user_id),
      statutCycleVie: data.statut_cycle_vie as StatutCycleVie,
      providerInvoiceId: data.einvoicing_provider_invoice_id ? String(data.einvoicing_provider_invoice_id) : null,
    };
  }

  async hasEvent(provider: ProviderId, providerEventId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("facture_cycle_events")
      .select("id")
      .eq("provider", provider)
      .eq("provider_event_id", providerEventId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  async insertEvent(event: StoredCycleEvent): Promise<"inserted" | "duplicate"> {
    const { error } = await this.supabase.from("facture_cycle_events").insert({
      user_id: event.userId,
      facture_id: event.factureId,
      provider: event.provider,
      provider_event_id: event.providerEventId,
      provider_invoice_id: event.providerInvoiceId,
      status_code: event.statusCode,
      payload: event.payload,
    });
    if (error) {
      if (error.code === "23505") return "duplicate";
      throw new Error(error.message);
    }
    return "inserted";
  }

  async updateStatut(factureId: string, next: StatutCycleVie): Promise<void> {
    const { error } = await this.supabase
      .from("factures")
      .update({ statut_cycle_vie: next })
      .eq("id", factureId);
    if (error) throw new Error(error.message);
  }
}
