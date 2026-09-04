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

function rateLimitMessage(reason: "daily" | "weekly" | "monthly_cap"): string {
  if (reason === "monthly_cap") {
    return "La démo est très demandée aujourd'hui. Crée ton compte pour l'essai gratuit de 14 jours.";
  }
  return "Tu as déjà utilisé la démo récemment. Crée ton compte pour générer autant de devis que tu veux.";
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim() ?? "";
  if (text.length < MIN_TEXT_LEN) {
    return NextResponse.json({ message: "Décris ton chantier en quelques mots.", code: "invalid_input" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    return NextResponse.json({ message: "Description trop longue pour la démo.", code: "invalid_input" }, { status: 400 });
  }

  const rate = await assertDemoRateLimit(req);
  if (!rate.ok) {
    return NextResponse.json(
      { message: rateLimitMessage(rate.reason), code: "rate_limited", reason: rate.reason },
      { status: 429 },
    );
  }

  const llm = await completeDevisGenerateLlm(buildDemoDevisPrompt(), text, {
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

  const quote = parsed.data;
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

  const { id: demoSessionId, setCookie } = await ensureDemoSessionId();
  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("demo_quotes")
    .insert({
      demo_session_id: demoSessionId,
      transcript: text,
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
  });

  if (setCookie) {
    res.cookies.set("flowo_demo_id", demoSessionId, demoSessionCookieOptions());
  }

  return res;
}
