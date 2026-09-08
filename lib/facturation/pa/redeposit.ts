import { applyCycleEffect, isStatutCycleVie } from "@/lib/facturation/pa/cycle-machine";
import {
  countRedeposits,
  REDEPOSIT_STATUS_CODE,
  redepositGate,
} from "@/lib/facturation/pa/cycle-display";
import type { ProviderId, StatutCycleVie } from "@/lib/facturation/pa/types";
import { EinvoicingError } from "@/lib/facturation/pa/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

export interface CycleJournalRow {
  id: string;
  statusCode: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export async function listFactureCycleEvents(
  supabase: SupabaseClient,
  userId: string,
  factureId: string,
): Promise<CycleJournalRow[]> {
  const { data, error } = await supabase
    .from("facture_cycle_events")
    .select("id, status_code, payload, created_at")
    .eq("user_id", userId)
    .eq("facture_id", factureId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const occurred =
      typeof payload.occurredAt === "string" && payload.occurredAt.trim()
        ? payload.occurredAt
        : String(row.created_at);
    return {
      id: String(row.id),
      statusCode: String(row.status_code),
      occurredAt: occurred,
      payload,
    };
  });
}

export async function redepositRejectedInvoice(
  supabase: SupabaseClient,
  userId: string,
  factureId: string,
  provider: ProviderId,
): Promise<{ statutCycleVie: StatutCycleVie; remaining: number }> {
  const { data: facture, error: factureError } = await supabase
    .from("factures")
    .select("id, statut_cycle_vie, einvoicing_provider_invoice_id")
    .eq("id", factureId)
    .eq("user_id", userId)
    .maybeSingle();
  if (factureError) throw new Error(factureError.message);
  if (!facture) throw new EinvoicingError("not_found", "Facture introuvable.", 404);

  const current = String(facture.statut_cycle_vie ?? "");
  if (!isStatutCycleVie(current)) {
    throw new EinvoicingError("illegal_cycle_transition", "Statut e-facturation inconnu.", 409);
  }

  const events = await listFactureCycleEvents(supabase, userId, factureId);
  const used = countRedeposits(events.map((e) => e.statusCode));
  const gate = redepositGate(current, used);
  if (!gate.ok) {
    throw new EinvoicingError("redeposit_limit", gate.message, 409);
  }

  const next = applyCycleEffect(current, "deposit");
  const providerInvoiceId = facture.einvoicing_provider_invoice_id
    ? String(facture.einvoicing_provider_invoice_id)
    : `local-${factureId}`;

  const { error: insertError } = await supabase.from("facture_cycle_events").insert({
    user_id: userId,
    facture_id: factureId,
    provider,
    provider_event_id: `${REDEPOSIT_STATUS_CODE}:${randomUUID()}`,
    provider_invoice_id: providerInvoiceId,
    status_code: REDEPOSIT_STATUS_CODE,
    payload: {
      statusText: "Renvoyée à l’identique",
      occurredAt: new Date().toISOString(),
      remainingAfter: gate.remaining - 1,
    },
  });
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("factures")
    .update({ statut_cycle_vie: next })
    .eq("id", factureId)
    .eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);

  return { statutCycleVie: next, remaining: gate.remaining - 1 };
}
