export type ExplicitTvaRate = 20 | 10 | 5.5;

export type QuoteDraftLine = {
  designation: string;
  quantite: number;
  unite: string;
  prixUnitaireHT: number | null;
  extraitSource: string;
};

export type QuoteFailureCode =
  | "source_not_in_input"
  | "price_not_in_source"
  | "amount_count_mismatch"
  | "incomplete_price";

export type QuoteFailure = {
  code: QuoteFailureCode;
  message: string;
  lineIndex?: number;
};

export type QuoteReview = {
  /** Contrôles durs (extrait, prix ancré, nombre de montants). */
  ok: boolean;
  /** Confirmation artisan requise (contrôle dur, prix manquant). */
  needsConfirmation: boolean;
  failures: QuoteFailure[];
  citedAmounts: number[];
};

const NUMBER_RE = /(\d{1,3}(?:[ \u00A0]\d{3})+|\d+)(?:[.,](\d{1,2}))?/g;

/** Unité collée au nombre : ce n'est pas un prix (« 200 litres », « 3 h », « 2 ans »). */
const UNIT_AFTER_RE =
  /^\s*(?:litres?|litre|ml|mètres?|metres?|m2|m²|m³|m3|heures?|jours?|mm|cm|kw|bars?|ans?|[lhm])\b/i;

export function foldQuoteText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function sourceIsInInput(input: string, extraitSource: string): boolean {
  const needle = foldQuoteText(extraitSource);
  if (!needle) return false;
  return foldQuoteText(input).includes(needle);
}

function parseAmountToken(whole: string, decimal: string | undefined): number | null {
  const raw = `${whole}${decimal ? `.${decimal}` : ""}`.replace(/[ \u00A0]/g, "");
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Montants cités dans un texte, hors quantités suivies d'une unité. */
export function extractCitedAmounts(text: string): number[] {
  const out: number[] = [];
  for (const match of text.matchAll(NUMBER_RE)) {
    const index = match.index ?? 0;
    const after = text.slice(index + match[0].length);
    if (UNIT_AFTER_RE.test(after)) continue;
    const before = text.slice(Math.max(0, index - 20), index);
    if (/tva[^0-9]{0,16}$/i.test(before)) continue;
    const amount = parseAmountToken(match[1] ?? "", match[2]);
    if (amount != null) out.push(amount);
  }
  return out;
}

function priceListed(amounts: number[], price: number): boolean {
  return amounts.some((amount) => Math.abs(amount - price) < 0.011);
}

export function reviewQuoteLines(input: string, lines: QuoteDraftLine[]): QuoteReview {
  const failures: QuoteFailure[] = [];
  const citedAmounts = extractCitedAmounts(input);
  const pricedCount = lines.filter((line) => line.prixUnitaireHT != null).length;

  lines.forEach((line, lineIndex) => {
    const source = line.extraitSource.trim();
    if (!sourceIsInInput(input, source)) {
      failures.push({
        code: "source_not_in_input",
        lineIndex,
        message: `« ${line.designation} » n'est pas ancrée dans le texte dicté.`,
      });
      return;
    }

    if (line.prixUnitaireHT == null) {
      failures.push({
        code: "incomplete_price",
        lineIndex,
        message: `« ${line.designation} » n'a pas de prix.`,
      });
      return;
    }

    if (!priceListed(extractCitedAmounts(source), line.prixUnitaireHT)) {
      failures.push({
        code: "price_not_in_source",
        lineIndex,
        message: `« ${line.designation} » à ${line.prixUnitaireHT} € ne correspond pas à « ${source} ».`,
      });
    }
  });

  if (pricedCount !== citedAmounts.length) {
    const amountsLabel = citedAmounts.length > 1 ? "montants" : "montant";
    const linesLabel = pricedCount > 1 ? "lignes chiffrées" : "ligne chiffrée";
    failures.push({
      code: "amount_count_mismatch",
      message: `${citedAmounts.length} ${amountsLabel} dans le texte, ${pricedCount} ${linesLabel}`,
    });
  }

  const hard = failures.filter((failure) => failure.code !== "incomplete_price");
  return {
    ok: hard.length === 0,
    needsConfirmation: failures.length > 0,
    failures,
    citedAmounts,
  };
}

/** Total HT seulement si chaque ligne a un prix. Sinon null : on n'affiche pas un total faux. */
export function sumHtIfComplete(lines: QuoteDraftLine[]): number | null {
  if (lines.length === 0 || lines.some((line) => line.prixUnitaireHT == null)) return null;
  const total = lines.reduce((sum, line) => sum + line.prixUnitaireHT! * (line.quantite || 1), 0);
  return Math.round(total * 100) / 100;
}

/** Taux dit par l'artisan (« en TVA à 20 », « TVA 5,5 % »). Sinon null. */
export function extractExplicitTvaRate(text: string): ExplicitTvaRate | null {
  const patterns = [
    /tva[^0-9]{0,16}(20|10|5(?:[.,]5)?)\b/i,
    /\b(20|10|5(?:[.,]5)?)\s*%?\s*(?:de\s+)?tva\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const normalized = match[1].replace(",", ".");
    if (normalized === "20") return 20;
    if (normalized === "10") return 10;
    if (normalized === "5.5" || normalized === "5") return normalized === "5" ? null : 5.5;
  }
  if (/\b5[.,]5\s*%/.test(text) && /tva/i.test(text)) return 5.5;
  return null;
}

export function logQuoteValidationIncident(payload: {
  input: string;
  /** Texte reçu avant correction de vocabulaire. */
  transcription_brute?: string;
  /** Texte réellement envoyé au moteur. */
  transcription_corrigee?: string;
  llm: unknown;
  failures: QuoteFailure[];
}): void {
  console.error("[quote-validation]", JSON.stringify(payload));
}
