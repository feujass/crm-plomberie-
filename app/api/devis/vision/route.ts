import { applyCataloguePrices } from "@/lib/catalogue/apply-catalogue-prices";
import { normalizeLignesWithProfile } from "@/lib/devis-ouvrage-mode";
import { backendFetch } from "@/lib/backend/server";
import { buildDevisVisionPrompt } from "@/lib/llm/artisanSystemPrompt";
import { completeDevisVisionLlm } from "@/lib/llm/devisVisionCompletion";
import {
  assertIaDevisAllowed,
  loadSubscriptionContext,
  recordIaDevisUsage,
} from "@/lib/plans/subscription-context";
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

  const iaBlocked = assertIaDevisAllowed(ctx);
  if (iaBlocked) {
    return NextResponse.json({ message: iaBlocked, code: "plan_ia_limit" }, { status: 403 });
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

  const system = buildDevisVisionPrompt(profile, ouvrages ?? []);

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
