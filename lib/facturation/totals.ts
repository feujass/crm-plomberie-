import {
  centsToXml,
  lineHtCents,
  milliToXml,
  toCents,
  toMilli,
  toRateCenti,
  vatCents,
} from "@/lib/facturation/cents";
import { mentionFranchise293B, type RegimeTva } from "@/lib/facturation/regime-tva";
import type { TypeLigneFacture } from "@/lib/facturation/type-ligne";

export type FactureLigneInput = {
  designation: string;
  quantite: unknown;
  unite: string;
  prix_ht: unknown;
  tva: unknown;
  /** Remise unitaire HT (optionnelle). */
  remise_unitaire?: unknown;
  type_ligne: TypeLigneFacture;
};

export type ComputedLine = {
  designation: string;
  qtyMilli: number;
  unite: string;
  prixCents: number;
  remiseUnitCents: number;
  netUnitCents: number;
  lineHtCents: number;
  rateCenti: number;
  type_ligne: TypeLigneFacture;
};

export type TaxSlice = {
  category: "S" | "E";
  rateCenti: number;
  basisCents: number;
  vatCents: number;
  exemption: string | null;
};

export type ComputedFactureTotals = {
  lignes: ComputedLine[];
  slices: TaxSlice[];
  lineTotalCents: number;
  taxTotalCents: number;
  grandCents: number;
  prepaidCents: number;
  dueCents: number;
};

export function computeFactureTotals(input: {
  lignes: FactureLigneInput[];
  regimeTva: RegimeTva;
  montantPaye?: unknown;
}): ComputedFactureTotals {
  const franchise = input.regimeTva === "franchise_293b";
  const lignes: ComputedLine[] = input.lignes.map((l) => {
    const qtyMilli = toMilli(l.quantite);
    const prixCents = toCents(l.prix_ht);
    const remiseUnitCents = Math.max(0, toCents(l.remise_unitaire ?? 0));
    const netUnitCents = prixCents - remiseUnitCents;
    const rateCenti = franchise ? 0 : toRateCenti(l.tva);
    return {
      designation: l.designation,
      qtyMilli,
      unite: l.unite,
      prixCents,
      remiseUnitCents,
      netUnitCents,
      lineHtCents: lineHtCents(qtyMilli, netUnitCents),
      rateCenti,
      type_ligne: l.type_ligne,
    };
  });

  const bucketMap = new Map<string, TaxSlice>();
  for (const l of lignes) {
    const category: "S" | "E" = franchise || l.rateCenti === 0 ? "E" : "S";
    const exemption = category === "E" ? mentionFranchise293B("franchise_293b") : null;
    const key = `${category}:${l.rateCenti}`;
    const prev = bucketMap.get(key) ?? {
      category,
      rateCenti: l.rateCenti,
      basisCents: 0,
      vatCents: 0,
      exemption,
    };
    prev.basisCents += l.lineHtCents;
    bucketMap.set(key, prev);
  }

  const slices = [...bucketMap.values()].map((s) => ({
    ...s,
    vatCents: s.category === "E" ? 0 : vatCents(s.basisCents, s.rateCenti),
  }));

  const lineTotalCents = lignes.reduce((acc, l) => acc + l.lineHtCents, 0);
  const taxTotalCents = slices.reduce((acc, s) => acc + s.vatCents, 0);
  const grandCents = lineTotalCents + taxTotalCents;
  const prepaidCents = Math.max(0, toCents(input.montantPaye ?? 0));
  const dueCents = grandCents - prepaidCents;

  return { lignes, slices, lineTotalCents, taxTotalCents, grandCents, prepaidCents, dueCents };
}

export function displayEurosFromCents(cents: number): number {
  return Number.parseInt(centsToXml(cents).replace(".", ""), 10) / 100;
}

export function displayQtyFromMilli(milli: number): number {
  return Number.parseInt(milliToXml(milli).replace(".", ""), 10) / 1000;
}
