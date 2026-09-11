import type { IaLigneLike } from "@/lib/devis-ouvrage-mode";

export type PrixAlert = {
  ligneIndex: number;
  designation: string;
  message: string;
  correctedPrix?: number;
};

const PER_UNIT_RE =
  /(\d+(?:[.,]\d+)?)\s*(?:€|euros?)\s*(?:du|de la|de l['']|le|la|par)\s*(m(?:è|e)tre|ml|m²|m2|heure|h|jour|forfait|unité|u)\b/gi;

const FLAT_PRICE_RE = /(\d+(?:[.,]\d+)?)\s*(?:€|euros?)\b/gi;

function parseAmount(raw: string): number | null {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Prix « par unité » mentionnés dans un texte (transcription ou source de ligne). */
export function extractPerUnitPrices(text: string): Array<{ amount: number; unitHint: string }> {
  const out: Array<{ amount: number; unitHint: string }> = [];
  if (!text.trim()) return out;
  for (const m of text.matchAll(PER_UNIT_RE)) {
    const amount = parseAmount(m[1] ?? "");
    if (amount != null) out.push({ amount, unitHint: (m[2] ?? "").toLowerCase() });
  }
  return out;
}

/** Montants euros plats cités dans un extrait. */
export function extractFlatPrices(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(FLAT_PRICE_RE)) {
    const amount = parseAmount(m[1] ?? "");
    if (amount != null) out.push(amount);
  }
  return out;
}

function unitsCompatible(a: string, b: string): boolean {
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  if (na === nb) return true;
  if ((na === "ml" || na.includes("metre") || na.includes("mètre")) && (nb === "ml" || nb.includes("metre") || nb.includes("mètre")))
    return true;
  if ((na === "h" || na.includes("heure")) && (nb === "h" || nb.includes("heure"))) return true;
  return false;
}

/**
 * Corrige un PU HT confondu avec un total (ex. 12 ml × 540 € au lieu de 45 €/ml).
 * Retourne une copie des lignes corrigées + alertes.
 */
export function correctUnitPricesFromTranscript(
  lignes: IaLigneLike[],
  transcript: string,
): { lignes: IaLigneLike[]; alerts: PrixAlert[] } {
  const alerts: PrixAlert[] = [];
  const globalPerUnit = extractPerUnitPrices(transcript);

  const corrected = lignes.map((ligne, i) => {
    const q = Number(ligne.quantite ?? 1);
    const pu = typeof ligne.prix_ht === "number" ? ligne.prix_ht : null;
    if (pu == null || pu <= 0 || q <= 1) return ligne;

    const haystack = `${ligne.source ?? ""} ${ligne.designation ?? ""} ${transcript}`;
    const perUnit = [...extractPerUnitPrices(haystack), ...globalPerUnit];

    for (const { amount: unitPrice, unitHint } of perUnit) {
      if (!unitsCompatible(unitHint, String(ligne.unite ?? ""))) continue;

      const expectedTotal = Math.round(unitPrice * q * 100) / 100;
      const diffFromUnit = Math.abs(pu - unitPrice);
      const diffFromTotal = Math.abs(pu - expectedTotal);

      // Cas tubage : PU = total (540 = 12×45)
      if (diffFromTotal < 0.02 && diffFromUnit > 0.02) {
        alerts.push({
          ligneIndex: i,
          designation: ligne.designation,
          message: `Prix unitaire corrigé : ${pu} € ressemblait au total (${q} × ${unitPrice} €). PU HT = ${unitPrice} €.`,
          correctedPrix: unitPrice,
        });
        return {
          ...ligne,
          prix_ht: unitPrice,
          origine_prix: "dicte" as const,
        };
      }
    }

    return ligne;
  });

  return { lignes: corrected, alerts };
}

/** Alerte si le total ligne dépasse fortement les montants cités dans la transcription. */
export function alertPrixHorsTranscript(
  lignes: IaLigneLike[],
  transcript: string,
): PrixAlert[] {
  const alerts: PrixAlert[] = [];
  const flat = extractFlatPrices(transcript);
  const maxFlat = flat.length ? Math.max(...flat) : null;

  lignes.forEach((ligne, i) => {
    const q = Number(ligne.quantite ?? 1);
    const pu = typeof ligne.prix_ht === "number" ? ligne.prix_ht : 0;
    const total = pu * q;
    if (total <= 0 || maxFlat == null) return;

    const haystack = `${ligne.source ?? ""} ${transcript}`;
    const localFlat = extractFlatPrices(haystack);
    const ref = localFlat.length ? Math.max(...localFlat) : maxFlat;

    // Total ligne > 3× le plus gros montant cité pour cette prestation
    if (total > ref * 3 && pu > ref * 1.5) {
      alerts.push({
        ligneIndex: i,
        designation: ligne.designation,
        message: `Total ligne ${total.toFixed(2)} € très supérieur aux montants dictés (max ~${ref} €). Vérifiez le prix unitaire.`,
      });
    }
  });

  return alerts;
}

/**
 * Si la source cite un prix explicite, impose ce montant (680 € dicté ≠ 645 € modèle).
 */
export function enforceDictatedPricesFromSource(lignes: IaLigneLike[]): {
  lignes: IaLigneLike[];
  alerts: PrixAlert[];
} {
  const alerts: PrixAlert[] = [];

  const corrected = lignes.map((ligne, i) => {
    const source = ligne.source?.trim() ?? "";
    if (!source) return ligne;

    const prices = extractFlatPrices(source);
    if (prices.length !== 1) return ligne;

    const dictated = prices[0]!;
    const current = typeof ligne.prix_ht === "number" ? ligne.prix_ht : null;
    if (current == null || Math.abs(current - dictated) < 0.01) {
      return {
        ...ligne,
        prix_ht: current ?? dictated,
        origine_prix: "dicte" as const,
      };
    }

    alerts.push({
      ligneIndex: i,
      designation: ligne.designation,
      message: `Prix rétabli depuis la dictée : ${current} € → ${dictated} € (extrait source).`,
      correctedPrix: dictated,
    });

    return {
      ...ligne,
      prix_ht: dictated,
      origine_prix: "dicte" as const,
    };
  });

  return { lignes: corrected, alerts };
}
