import { applyCataloguePrices } from "@/lib/catalogue/apply-catalogue-prices";
import { normalizeLignesWithProfile } from "@/lib/devis-ouvrage-mode";
import { backendFetch } from "@/lib/backend/server";
import { buildDevisGeneratePrompt } from "@/lib/llm/artisanSystemPrompt";
import { completeDevisGenerateLlm } from "@/lib/llm/devisGenerateCompletion";
import {
  assertIaDevisAllowed,
  loadSubscriptionContext,
  recordIaDevisUsage,
} from "@/lib/plans/subscription-context";
import { TRIAL_EXPIRED_PAYWALL_CODE } from "@/lib/plans/paywall";
import { isTrialExpired } from "@/lib/plans/trial";
import { buildDevisMetaFromIa } from "@/lib/devis/ia-metadata";
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

  const body = (await req.json()) as { text?: string };
  if (!body.text?.trim()) return NextResponse.json({ message: "Texte requis" }, { status: 400 });

  const iaBlocked = assertIaDevisAllowed(ctx);
  if (iaBlocked) {
    const code = isTrialExpired(ctx.profile) ? TRIAL_EXPIRED_PAYWALL_CODE : "plan_ia_limit";
    return NextResponse.json({ message: iaBlocked, code }, { status: 403 });
  }

  const profile = ctx.profile ?? {};
  let ouvrages: BackendOuvrage[] = [];
  try {
    ouvrages = (await backendFetch("/api/ouvrages")) as BackendOuvrage[];
  } catch {
    ouvrages = [];
  }

  const system = buildDevisGeneratePrompt(profile, ouvrages ?? []);

  let llmResult;
  try {
    llmResult = await completeDevisGenerateLlm(system, body.text.trim());
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
        message:
          "Zeus n'a pas pu structurer le devis (format inattendu). Réessayez avec plus de détails ou passez en mode texte.",
        details: z.error.flatten(),
      },
      { status: 422 },
    );
  }

  if (!z.data.lignes.length) {
    return NextResponse.json(
      {
        message:
          "Aucune ligne de devis n'a été reconnue. Décrivez les travaux plus précisément (quantités, prestations, fournitures).",
      },
      { status: 422 },
    );
  }

  const rawLignes = z.data.lignes.map((l, i) => ({
    section: l.section,
    designation: l.designation,
    quantite: l.quantite,
    unite: l.unite,
    prix_ht: l.prix_ht,
    tva: l.tva,
    ordre: i,
    ligne_type: l.ligne_type,
  }));

  const withCatalogue = applyCataloguePrices(
    rawLignes,
    ouvrages ?? [],
    profile.use_personal_library !== false,
  );

  const lignes = normalizeLignesWithProfile(withCatalogue, profile);

  const meta = buildDevisMetaFromIa(z.data);

  try {
    await recordIaDevisUsage(profile);
  } catch {
    // compteur best-effort — devis déjà généré
  }

  return NextResponse.json({
    lignes,
    adresse_chantier: z.data.adresse_chantier?.trim() || null,
    client: z.data.client ?? null,
    notes: meta.notes || null,
    date_expiration: meta.date_expiration,
  });
}
