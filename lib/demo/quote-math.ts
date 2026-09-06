import type { DevisIaResponse } from "@/lib/schemas/devis-ia";

export function computeDemoTotalTtc(lignes: DevisIaResponse["lignes"]): number {
  let ttc = 0;
  for (const l of lignes) {
    const ht = Number(l.prix_ht ?? l.prix_unitaire_ht) || 0;
    const q = Number(l.quantite) || 0;
    const tva = Number(l.tva) || 0;
    ttc += ht * q * (1 + tva / 100);
  }
  return Math.round(ttc * 100) / 100;
}

/** Toutes les lignes — intitulés visibles dans l'aperçu démo. */
export function previewLinesFromQuote(lignes: DevisIaResponse["lignes"]) {
  return lignes.map((l) => ({
    designation: l.designation,
    quantite: l.quantite,
    unite: l.unite,
  }));
}
