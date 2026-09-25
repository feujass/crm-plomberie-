import { computeDevisTotals } from "@/lib/devis-math";
import type { DevisIaResponse } from "@/lib/schemas/devis-ia";

export type DemoPreviewLine = {
  designation: string;
  quantite: number;
  unite: string;
  prix_ht: number;
  tva: number;
};

export function demoLineUnitHt(ligne: DevisIaResponse["lignes"][number] | DemoPreviewLine): number {
  if ("prix_unitaire_ht" in ligne) {
    return Number(ligne.prix_ht ?? ligne.prix_unitaire_ht) || 0;
  }
  return Number(ligne.prix_ht) || 0;
}

export function demoLineTotalHt(ligne: Pick<DemoPreviewLine, "quantite" | "prix_ht">): number {
  return Math.round((Number(ligne.quantite) || 0) * (Number(ligne.prix_ht) || 0) * 100) / 100;
}

export function computeDemoTotalTtc(lignes: DevisIaResponse["lignes"]): number {
  let ttc = 0;
  for (const l of lignes) {
    const ht = demoLineUnitHt(l);
    const q = Number(l.quantite) || 0;
    const tva = Number(l.tva) || 0;
    ttc += ht * q * (1 + tva / 100);
  }
  return Math.round(ttc * 100) / 100;
}

export function computeDemoTotals(lignes: DemoPreviewLine[]) {
  return computeDevisTotals(
    lignes.map((l) => ({ total_ht: demoLineTotalHt(l), tva: l.tva })),
    null,
    null,
  );
}

/** Toutes les lignes, avec prix, pour l’aperçu démo. */
export function previewLinesFromQuote(lignes: DevisIaResponse["lignes"]): DemoPreviewLine[] {
  return lignes.map((l) => ({
    designation: l.designation,
    quantite: l.quantite,
    unite: l.unite,
    prix_ht: demoLineUnitHt(l),
    tva: Number(l.tva) || 0,
  }));
}
