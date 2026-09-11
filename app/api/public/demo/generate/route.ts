import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  demoSessionCookieOptions,
  newDemoSessionId,
  readDemoSessionId,
} from "@/lib/demo/cookie";
import { buildDemoDevisPrompt } from "@/lib/demo/prompt";
import { renderBlurredPreviewPngBase64 } from "@/lib/demo/preview-image";
import { previewLinesFromQuote, computeDemoTotalTtc } from "@/lib/demo/quote-math";
import { assertDemoRateLimit, recordDemoUsage } from "@/lib/demo/rate-limit";
import {
  DEMO_ALREADY_USED_MESSAGE,
  demoPreviewPayloadFromRow,
  fetchDemoQuoteForSession,
} from "@/lib/demo/session-preview";
import { prepareTranscriptionForLlm, processIaDevisResponse } from "@/lib/devis/voice-pipeline";
import { anthropicDemoMaxTokens, anthropicDemoModel } from "@/lib/llm/anthropicConfig";
import { completeDevisGenerateLlm } from "@/lib/llm/devisGenerateCompletion";
import { devisIaResponseSchema } from "@/lib/schemas/devis-ia";
import { normalizeDevisIaParsed } from "@/lib/schemas/normalize-devis-ia";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 35;

const MIN_TEXT_LEN = 12;
const MAX_TEXT_LEN = 2000;

async function ensureDemoSessionId(): Promise<{ id: string; setCookie: boolean }> {
  const jar = await cookies();
  const existing = readDemoSessionId(jar.get("flowo_demo_id")?.value);
  if (existing) return { id: existing, setCookie: false };
  return { id: newDemoSessionId(), setCookie: true };
}

function rateLimitMessage(reason: "monthly_cap"): string {
  return "La démo est très demandée ce mois-ci. Crée ton compte pour l'essai gratuit de 14 jours.";
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const rawText = body?.text?.trim() ?? "";
  if (rawText.length < MIN_TEXT_LEN) {
    return NextResponse.json({ message: "Décris ton chantier en quelques mots.", code: "invalid_input" }, { status: 400 });
  }
  if (rawText.length > MAX_TEXT_LEN) {
    return NextResponse.json({ message: "Description trop longue pour la démo.", code: "invalid_input" }, { status: 400 });
  }

  const { id: demoSessionId, setCookie } = await ensureDemoSessionId();
  const existing = await fetchDemoQuoteForSession(demoSessionId);
  if (existing) {
    const preview = await demoPreviewPayloadFromRow(existing);
    return NextResponse.json(
      { message: DEMO_ALREADY_USED_MESSAGE, code: "demo_already_used", ...preview },
      { status: 409 },
    );
  }

  const rate = await assertDemoRateLimit(req);
  if (!rate.ok) {
    return NextResponse.json(
      { message: rateLimitMessage(rate.reason), code: "rate_limited", reason: rate.reason },
      { status: 429 },
    );
  }

  const { brut, corrige } = prepareTranscriptionForLlm(rawText);

  const llm = await completeDevisGenerateLlm(buildDemoDevisPrompt(), corrige, {
    model: anthropicDemoModel(),
    maxTokens: anthropicDemoMaxTokens(),
    timeoutMs: 28_000,
  });

  if (!llm.ok) {
    return NextResponse.json(
      { message: llm.message, code: llm.code ?? "generation_failed" },
      { status: llm.status },
    );
  }

  const normalized = normalizeDevisIaParsed(llm.parsed);
  const parsed = devisIaResponseSchema.safeParse(normalized);
  if (!parsed.success || parsed.data.lignes.length === 0) {
    return NextResponse.json(
      { message: "Zeus n'a pas pu structurer ce chantier. Réessaie avec plus de détails.", code: "generation_failed" },
      { status: 422 },
    );
  }

  const processed = processIaDevisResponse(parsed.data, {}, [], corrige);
  const quote = { ...parsed.data, lignes: processed.lignes.map((l) => ({
    designation: l.designation,
    quantite: l.quantite,
    unite: l.unite,
    prix_ht: l.prix_ht,
    tva: l.tva,
    section: l.section,
    ligne_type: l.ligne_type,
    source: l.source ?? undefined,
  })), questions: processed.questions };

  const previewLines = previewLinesFromQuote(quote.lignes);
  const lineCount = quote.lignes.length;
  const totalTtc = computeDemoTotalTtc(quote.lignes);

  let previewImageBase64: string;
  try {
    previewImageBase64 = await renderBlurredPreviewPngBase64(quote.lignes);
  } catch (e) {
    console.error("[demo/generate] preview png", e);
    return NextResponse.json({ message: "Aperçu indisponible.", code: "generation_failed" }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("demo_quotes")
    .insert({
      demo_session_id: demoSessionId,
      transcript: corrige,
      quote_json: quote,
      preview_lines: previewLines,
      line_count: lineCount,
      total_ttc: totalTtc,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    console.error("[demo/generate] insert", error?.message);
    return NextResponse.json({ message: "Enregistrement démo impossible.", code: "generation_failed" }, { status: 500 });
  }

  await recordDemoUsage(req);

  const res = NextResponse.json({
    demo_quote_id: inserted.id,
    preview_image_base64: previewImageBase64,
    preview_lines: previewLines,
    line_count: lineCount,
    total_ttc: totalTtc,
    preview_label: `${previewLines.length}/${lineCount} lignes visibles — prix masqués`,
    transcription_brute: brut,
  });

  if (setCookie) {
    res.cookies.set("flowo_demo_id", demoSessionId, demoSessionCookieOptions());
  }

  return res;
}
