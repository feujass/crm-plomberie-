import { renderBlurredPreviewPngBase64 } from "@/lib/demo/preview-image";
import type { DemoPreviewPayload } from "@/lib/demo/types";
import type { DevisIaResponse } from "@/lib/schemas/devis-ia";
import { createAdminClient } from "@/lib/supabase/admin";

type DemoQuoteRow = {
  id: string;
  quote_json: DevisIaResponse;
  preview_lines: DemoPreviewPayload["preview_lines"];
  line_count: number;
  total_ttc: number;
};

export async function fetchDemoQuoteForSession(demoSessionId: string): Promise<DemoQuoteRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("demo_quotes")
    .select("id, quote_json, preview_lines, line_count, total_ttc")
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
  const preview_image_base64 = await renderBlurredPreviewPngBase64(quote.lignes);
  return {
    demo_quote_id: row.id,
    preview_image_base64,
    preview_lines: row.preview_lines,
    line_count: row.line_count,
    total_ttc: Number(row.total_ttc),
  };
}
