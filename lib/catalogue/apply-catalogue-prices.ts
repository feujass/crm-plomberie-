import type { BackendOuvrage } from "@/types/backend";
import type { IaLigneLike } from "@/lib/devis-ouvrage-mode";

const MATCH_THRESHOLD = 55;

export { MATCH_THRESHOLD };

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((t) => t.length > 2);
}

function scoreCatalogueMatch(designation: string, ouvrage: BackendOuvrage): number {
  const d = normalizeText(designation);
  const nom = normalizeText(ouvrage.nom);
  if (!d || !nom) return 0;
  if (d === nom) return 100;
  if (d.includes(nom) || nom.includes(d)) return 85;

  const dTokens = tokens(designation);
  const nTokens = tokens(ouvrage.nom);
  if (dTokens.length && nTokens.length) {
    const overlap = dTokens.filter((t) => nTokens.some((n) => n.includes(t) || t.includes(n))).length;
    const ratio = overlap / Math.max(dTokens.length, nTokens.length);
    if (ratio >= 0.5) return 70 + Math.round(ratio * 20);
  }

  const desc = normalizeText(ouvrage.description ?? "");
  if (desc && (d.includes(desc) || desc.includes(d))) return 65;

  for (const tag of ouvrage.tags ?? []) {
    const t = normalizeText(tag);
    if (t && d.includes(t)) return 60;
  }

  return 0;
}

/** Meilleure correspondance catalogue pour une désignation (null si sous le seuil). */
export function findBestCatalogueMatch(designation: string, ouvrages: BackendOuvrage[]): BackendOuvrage | null {
  let best: BackendOuvrage | null = null;
  let bestScore = 0;
  for (const o of ouvrages) {
    const score = scoreCatalogueMatch(designation, o);
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best && bestScore >= MATCH_THRESHOLD ? best : null;
}

export function normalizeCatalogueText(value: string): string {
  return normalizeText(value);
}

function ligneTypeFromOuvrage(type: BackendOuvrage["type"]): IaLigneLike["ligne_type"] {
  if (type === "fourniture") return "fourniture";
  if (type === "main_oeuvre") return "pose";
  return "prestation";
}

/** Remplace prix / unité / TVA par la bibliothèque lorsqu'une correspondance est trouvée. */
export function applyCataloguePrices(
  lignes: IaLigneLike[],
  ouvrages: BackendOuvrage[],
  usePersonalLibrary: boolean,
): IaLigneLike[] {
  if (!usePersonalLibrary || ouvrages.length === 0) return lignes;

  return lignes.map((ligne) => {
    let best: BackendOuvrage | null = null;
    let bestScore = 0;
    for (const o of ouvrages) {
      const score = scoreCatalogueMatch(ligne.designation, o);
      if (score > bestScore) {
        bestScore = score;
        best = o;
      }
    }
    if (!best || bestScore < MATCH_THRESHOLD) return ligne;

    const prix = best.prix_ht;
    return {
      ...ligne,
      designation: best.nom,
      prix_ht: typeof prix === "number" && Number.isFinite(prix) ? prix : ligne.prix_ht,
      unite: best.unite?.trim() || ligne.unite,
      tva: typeof best.tva === "number" && Number.isFinite(best.tva) ? best.tva : ligne.tva,
      ligne_type: ligneTypeFromOuvrage(best.type) ?? ligne.ligne_type,
    };
  });
}

/** Résumé compact pour le prompt IA (nom, type, prix, unité, TVA). */
export function formatOuvragesForPrompt(ouvrages: BackendOuvrage[]): string {
  if (!ouvrages.length) return "[]";
  const rows = ouvrages.map((o) => ({
    nom: o.nom,
    type: o.type ?? "ouvrage",
    prix_ht: o.prix_ht ?? 0,
    unite: o.unite ?? "u",
    tva: o.tva ?? 10,
    tags: o.tags?.length ? o.tags : undefined,
  }));
  return JSON.stringify(rows);
}

export function usesPersonalLibrary(profile: { use_personal_library?: boolean } | undefined): boolean {
  return profile?.use_personal_library !== false;
}
