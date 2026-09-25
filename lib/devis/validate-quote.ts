import {
  type ExplicitTvaRate,
  type QuoteFailure,
  type QuoteReview,
} from "@/lib/devis/quote-faithfulness";

/** Démo publique ou devis dans l'app connectée. Même règles, décision différente. */
export type QuoteAudience = "public" | "connected";

export type QuoteTvaDecision = {
  /** Taux dicté. Jamais un défaut silencieux (pas de 10 %). */
  rate: ExplicitTvaRate | null;
  showTva: boolean;
};

export type QuoteAssessment = {
  needsConfirmation: boolean;
  tva: QuoteTvaDecision;
  failures: QuoteFailure[];
  /** Première raison lisible, hors simple prix vide. */
  reason: string | null;
};

/**
 * Une seule règle de taux pour les deux routes.
 * Le contexte ne sert pas à inventer un taux : public comme connecté n'appliquent
 * un pourcentage que s'il est dans le texte. L'app demande ensuite le choix à l'artisan.
 */
export function resolveQuoteTva(explicitRate: ExplicitTvaRate | null, _audience: QuoteAudience): QuoteTvaDecision {
  if (explicitRate == null) return { rate: null, showTva: false };
  return { rate: explicitRate, showTva: true };
}

/** Décision partagée : confirmation ou aperçu, et taux à afficher. */
export function assessQuote(input: {
  audience: QuoteAudience;
  review: QuoteReview;
  explicitRate: ExplicitTvaRate | null;
}): QuoteAssessment {
  const tva = resolveQuoteTva(input.explicitRate, input.audience);
  const linesUncertain = !input.review.ok || input.review.needsConfirmation;
  const mustPickTva = input.audience === "connected" && tva.rate == null;
  const reason =
    input.review.failures.find((failure) => failure.code !== "incomplete_price")?.message ??
    (linesUncertain ? input.review.failures[0]?.message ?? null : null);

  return {
    needsConfirmation: linesUncertain || mustPickTva,
    tva,
    failures: input.review.failures,
    reason,
  };
}
