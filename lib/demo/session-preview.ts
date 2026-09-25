import { renderBlurredPreviewPngBase64 } from "@/lib/demo/preview-image";
import { previewLinesFromQuote } from "@/lib/demo/quote-math";
import type { DemoPreviewPayload } from "@/lib/demo/types";
import type { DevisIaResponse } from "@/lib/schemas/devis-ia";
import { createAdminClient } from "@/lib/supabase/admin";

type DemoQuoteRow = {
  id: string;
  transcript: string | null;
  quote_json: DevisIaResponse & {
    transcription_brute?: string | null;
    transcription_corrigee?: string | null;
    tva_rate?: number | null;
  };
  preview_lines: DemoPreviewPayload["preview_lines"];
  line_count: number;
  total_ttc: number;
};

export async function fetchDemoQuoteForSession(demoSessionId: string): Promise<DemoQuoteRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("demo_quotes")
    .select("id, transcript, quote_json, preview_lines, line_count, total_ttc")
    .eq("demo_session_id", demoSessionId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;
  return data as DemoQuoteRow;
}

export async function demoPreviewPayloadFromRow(row: DemoQuoteRow): Promise<DemoPreviewPayload> {
  const quote = row.quote_json;
  let preview_image_base64 = "";
  try {
    preview_image_base64 = await renderBlurredPreviewPngBase64(quote.lignes);
  } catch (e) {
    console.error("[demo/status] preview png", e);
  }
  return {
    demo_quote_id: row.id,
    preview_image_base64,
    preview_lines: quote.lignes?.length ? previewLinesFromQuote(quote.lignes) : row.preview_lines,
    line_count: row.line_count,
    total_ttc: Number(row.total_ttc),
    transcription_brute: quote.transcription_brute ?? null,
    transcription_corrigee: quote.transcription_corrigee ?? row.transcript ?? null,
    tva_rate: "tva_rate" in quote ? quote.tva_rate : undefined,
  };
}

export const DEMO_ALREADY_USED_MESSAGE =
  "Tu as déjà un aperçu démo sur cet appareil. Crée ton compte pour voir le devis complet, ou efface les cookies du site pour recommencer.";
