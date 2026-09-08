import { FACTURES_EINVOICING_BUCKET } from "@/lib/facturation/embed-facturx";
import { dispatchCycleSignalNotifications } from "@/lib/facturation/pa/dispatch-cycle-signals";
import { EinvoicingError } from "@/lib/facturation/pa/errors";
import { getEInvoicingProvider } from "@/lib/facturation/pa/get-provider";
import { pollAndIngestLifecycleEvents } from "@/lib/facturation/pa/poll-events";
import { schedulePostDepositIngest } from "@/lib/facturation/pa/post-deposit-ingest";
import { SupabaseCycleStore } from "@/lib/facturation/pa/supabase-cycle-store";
import { loadTokens, saveTokens, setLastInvoiceEventId } from "@/lib/facturation/pa/supabase-token-store";
import { withFreshTokens } from "@/lib/facturation/pa/with-fresh-tokens";
import type { SubmitInvoiceResult } from "@/lib/facturation/pa/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function tokensChanged(
  a: { accessToken: string; refreshToken: string | null; expiresAt: string },
  b: { accessToken: string; refreshToken: string | null; expiresAt: string },
): boolean {
  return a.accessToken !== b.accessToken || a.refreshToken !== b.refreshToken || a.expiresAt !== b.expiresAt;
}

export async function ingestFacturePaEvents(
  supabase: SupabaseClient,
  userId: string,
  factureId: string,
): Promise<void> {
  const provider = getEInvoicingProvider();
  const tokens = await loadTokens(supabase, userId, provider.id);
  if (!tokens) return;

  const { data: facture, error } = await supabase
    .from("factures")
    .select("einvoicing_provider_invoice_id")
    .eq("id", factureId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const providerInvoiceId = facture?.einvoicing_provider_invoice_id
    ? String(facture.einvoicing_provider_invoice_id)
    : undefined;
  if (!providerInvoiceId) return;

  const entity = { userId };
  const { result, tokens: fresh } = await withFreshTokens(provider, entity, tokens, (t) =>
    pollAndIngestLifecycleEvents(provider, new SupabaseCycleStore(supabase), entity, t, { providerInvoiceId }),
  );
  if (tokensChanged(tokens, fresh)) {
    await saveTokens(supabase, userId, provider.id, fresh);
  }
  await dispatchCycleSignalNotifications(result.signals);
  if (result.lastProviderEventId) {
    await setLastInvoiceEventId(supabase, userId, result.lastProviderEventId);
  }
}

export async function submitFactureToPa(
  supabase: SupabaseClient,
  userId: string,
  factureId: string,
  options: { ingestEvents?: boolean; scheduleFollowup?: boolean } = {},
): Promise<SubmitInvoiceResult> {
  const { data: facture, error } = await supabase
    .from("factures")
    .select("id, facturx_xml, facturx_pdf_path, einvoicing_provider_invoice_id")
    .eq("id", factureId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!facture) throw new EinvoicingError("not_found", "Facture introuvable.", 404);

  const xml = String(facture.facturx_xml ?? "").trim();
  if (!xml) {
    throw new EinvoicingError("facturx_missing", "Générez d’abord le document Factur-X.", 422);
  }

  let pdf: Uint8Array | undefined;
  const pdfPath = facture.facturx_pdf_path ? String(facture.facturx_pdf_path) : "";
  if (pdfPath) {
    const { data: file, error: dlError } = await supabase.storage.from(FACTURES_EINVOICING_BUCKET).download(pdfPath);
    if (!dlError && file) {
      pdf = new Uint8Array(await file.arrayBuffer());
    }
  }

  const provider = getEInvoicingProvider();
  const tokens = await loadTokens(supabase, userId, provider.id);
  if (!tokens) {
    throw new EinvoicingError("not_connected", "Entreprise non raccordée à la plateforme de facturation.", 409);
  }

  const entity = { userId };
  const { result, tokens: fresh } = await withFreshTokens(provider, entity, tokens, (t) =>
    provider.submitInvoice(entity, t, {
      factureId,
      xml,
      pdf,
      externalId: factureId,
    }),
  );
  if (tokensChanged(tokens, fresh)) {
    await saveTokens(supabase, userId, provider.id, fresh);
  }

  const { error: updateError } = await supabase
    .from("factures")
    .update({ einvoicing_provider_invoice_id: result.providerInvoiceId })
    .eq("id", factureId)
    .eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);

  if (options.ingestEvents !== false) {
    try {
      await ingestFacturePaEvents(supabase, userId, factureId);
    } catch {
      /* suivi 5 s / 30 s + cron */
    }
  }

  if (options.scheduleFollowup !== false) {
    schedulePostDepositIngest(() => ingestFacturePaEvents(supabase, userId, factureId));
  }

  return result;
}
