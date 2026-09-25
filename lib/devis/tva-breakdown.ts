export const TVA_RATE_CHOICES = [20, 10, 5.5] as const;
export type TvaRateChoice = (typeof TVA_RATE_CHOICES)[number];

export function asTvaRate(value: number | null | undefined): TvaRateChoice | null {
  if (value === 20 || value === 10 || value === 5.5) return value;
  return null;
}

export type TvaLineAmount = { ht: number; rate: TvaRateChoice | null };

export type TvaSummary =
  | { kind: "incomplete"; totalHt: number }
  | { kind: "simple"; rate: TvaRateChoice; totalHt: number; totalTva: number; totalTtc: number }
  | {
      kind: "mixed";
      totalHt: number;
      rows: Array<{ rate: TvaRateChoice; base: number; tva: number }>;
      totalTva: number;
      totalTtc: number;
    };

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Ventile la TVA par taux. Incomplet tant qu'une ligne n'a pas de taux. */
export function summarizeTva(lines: TvaLineAmount[]): TvaSummary {
  const totalHt = roundMoney(lines.reduce((sum, line) => sum + line.ht, 0));
  if (lines.length === 0 || lines.some((line) => line.rate == null)) {
    return { kind: "incomplete", totalHt };
  }
  const byRate = new Map<TvaRateChoice, number>();
  for (const line of lines) {
    const rate = line.rate as TvaRateChoice;
    byRate.set(rate, (byRate.get(rate) ?? 0) + line.ht);
  }
  const rows = [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, base]) => ({ rate, base: roundMoney(base), tva: roundMoney(base * (rate / 100)) }));
  const totalTva = roundMoney(rows.reduce((sum, row) => sum + row.tva, 0));
  const totalTtc = roundMoney(totalHt + totalTva);
  if (rows.length === 1) {
    return { kind: "simple", rate: rows[0].rate, totalHt, totalTva, totalTtc };
  }
  return { kind: "mixed", totalHt, rows, totalTva, totalTtc };
}
