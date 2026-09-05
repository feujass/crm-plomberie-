import type { DevisLigneRow } from "@/types/database";

export function ligneTotalHt(l: Pick<DevisLigneRow, "quantite" | "prix_ht">) {
  return Math.round(l.quantite * l.prix_ht * 100) / 100;
}

export function computeDevisTotals(
  lignes: Pick<DevisLigneRow, "total_ht" | "tva">[],
  remiseType: "percent" | "fixed" | null,
  remiseValue: number | null
) {
  const sumHtBrut = lignes.reduce((s, l) => s + l.total_ht, 0);
  let sumHt = sumHtBrut;
  if (remiseType === "percent" && remiseValue != null && remiseValue > 0) {
    sumHt = Math.round(sumHtBrut * (1 - remiseValue / 100) * 100) / 100;
  } else if (remiseType === "fixed" && remiseValue != null && remiseValue > 0) {
    sumHt = Math.max(0, Math.round((sumHtBrut - remiseValue) * 100) / 100);
  }
  const factor = sumHtBrut > 0 ? sumHt / sumHtBrut : 0;
  let sumTva = 0;
  for (const l of lignes) {
    const ht = Math.round(l.total_ht * factor * 100) / 100;
    sumTva += Math.round(ht * (l.tva / 100) * 100) / 100;
  }
  sumTva = Math.round(sumTva * 100) / 100;
  const sumTtc = Math.round((sumHt + sumTva) * 100) / 100;
  return { total_ht: sumHt, total_tva: sumTva, total_ttc: sumTtc };
}
