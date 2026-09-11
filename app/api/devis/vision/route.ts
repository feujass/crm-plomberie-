import { buildDevisMetaFromIa } from "@/lib/devis/ia-metadata";
import {
  buildDevisVisionPrompt,
  processIaDevisResponse,
} from "@/lib/devis/voice-pipeline";
import { backendFetch } from "@/lib/backend/server";
import { completeDevisVisionLlm } from "@/lib/llm/devisVisionCompletion";
import {
  assertIaDevisAllowed,
  loadSubscriptionContext,
  recordIaDevisUsage,
} from "@/lib/plans/subscription-context";
import { TRIAL_EXPIRED_PAYWALL_CODE } from "@/lib/plans/paywall";
import { isTrialExpired } from "@/lib/plans/trial";
import { devisIaResponseSchema } from "@/lib/schemas/devis-ia";
import { normalizeDevisIaParsed } from "@/lib/schemas/normalize-devis-ia";
import { NextResponse } from "next/server";

import type { BackendOuvrage } from "@/types/backend";

export async function POST(req: Request) {
  let ctx;
  try {
    ctx = await loadSubscriptionContext();
  } catch {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }

  const iaBlocked = assertIaDevisAllowed(ctx);
  if (iaBlocked) {
    const code = isTrialExpired(ctx.profile) ? TRIAL_EXPIRED_PAYWALL_CODE : "plan_ia_limit";
    return NextResponse.json({ message: iaBlocked, code }, { status: 403 });
  }

  const formData = (await req.formData()) as unknown as { get: (name: string) => unknown };
  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ message: "Fichier requis" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const b64 = buf.toString("base64");
  const mime = file.type || "image/jpeg";

  const profile = ctx.profile ?? {};
  let ouvrages: BackendOuvrage[] = [];
  try {
    ouvrages = (await backendFetch("/api/ouvrages")) as BackendOuvrage[];
  } catch {
    ouvrages = [];
  }

  const system = buildDevisVisionPrompt(profile);

  let llmResult;
  try {
    llmResult = await completeDevisVisionLlm(system, b64, mime);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur LLM";
    return NextResponse.json({ message: msg }, { status: 500 });
  }

  if (!llmResult.ok) {
    return NextResponse.json(
      { message: llmResult.message, code: llmResult.code },
      { status: llmResult.status },
    );
  }

  const normalized = normalizeDevisIaParsed(llmResult.parsed);
  const z = devisIaResponseSchema.safeParse(normalized);
  if (!z.success) {
    return NextResponse.json(
      {
        message: "Zeus n'a pas pu structurer le devis (format inattendu). Réessayez avec une image plus nette.",
        details: z.error.flatten(),
      },
      { status: 422 },
    );
  }

  if (!z.data.lignes.length) {
    return NextResponse.json({ message: "Aucune ligne reconnue sur ce document." }, { status: 422 });
  }

  const processed = processIaDevisResponse(z.data, profile, ouvrages ?? [], "");
  const meta = buildDevisMetaFromIa(z.data);

  try {
    await recordIaDevisUsage(profile);
  } catch {
    // compteur best-effort
  }

  return NextResponse.json({
    lignes: processed.lignes,
    adresse_chantier: processed.adresse_chantier,
    client: z.data.client ?? null,
    notes: meta.notes || null,
    date_expiration: meta.date_expiration,
    questions: processed.questions,
    tva_alerts: processed.tvaAlerts,
  });
}
