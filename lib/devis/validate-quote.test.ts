import { describe, expect, it } from "vitest";

import { reviewQuoteLines, type QuoteDraftLine } from "@/lib/devis/quote-faithfulness";
import { assessQuote, resolveQuoteTva } from "@/lib/devis/validate-quote";

const INPUT = "un dép à 70, recherche de fuite à 410 et rapport à 80";

const THREE_LINES: QuoteDraftLine[] = [
  {
    designation: "Déplacement",
    quantite: 1,
    unite: "forfait",
    prixUnitaireHT: 70,
    extraitSource: "un dép à 70",
  },
  {
    designation: "Recherche de fuite",
    quantite: 1,
    unite: "forfait",
    prixUnitaireHT: 410,
    extraitSource: "recherche de fuite à 410",
  },
  {
    designation: "Rapport d'intervention",
    quantite: 1,
    unite: "forfait",
    prixUnitaireHT: 80,
    extraitSource: "rapport à 80",
  },
];

describe("validate-quote", () => {
  it("n'applique aucune TVA par défaut sur la démo publique", () => {
    const review = reviewQuoteLines(INPUT, THREE_LINES);
    const decision = assessQuote({ audience: "public", review, explicitRate: null });
    expect(review.ok).toBe(true);
    expect(decision.needsConfirmation).toBe(false);
    expect(decision.tva).toEqual({ rate: null, showTva: false });
    expect(resolveQuoteTva(null, "public").rate).toBeNull();
    expect(THREE_LINES.map((line) => line.prixUnitaireHT)).toEqual([70, 410, 80]);
  });

  it("applique 20 % seulement si le taux est dicté", () => {
    const decision = assessQuote({
      audience: "public",
      review: reviewQuoteLines(`${INPUT} en TVA à 20`, THREE_LINES),
      explicitRate: 20,
    });
    expect(decision.needsConfirmation).toBe(false);
    expect(decision.tva).toEqual({ rate: 20, showTva: true });
  });

  it("demande confirmation quand une prestation n'a pas de prix", () => {
    const input = "recherche de fuite à 410 et réparation";
    const lines: QuoteDraftLine[] = [
      {
        designation: "Recherche de fuite",
        quantite: 1,
        unite: "forfait",
        prixUnitaireHT: 410,
        extraitSource: "recherche de fuite à 410",
      },
      {
        designation: "Réparation",
        quantite: 1,
        unite: "forfait",
        prixUnitaireHT: null,
        extraitSource: "réparation",
      },
    ];
    const decision = assessQuote({
      audience: "public",
      review: reviewQuoteLines(input, lines),
      explicitRate: null,
    });
    expect(decision.needsConfirmation).toBe(true);
    expect(lines[1]?.prixUnitaireHT).toBeNull();
    expect(decision.tva.showTva).toBe(false);
  });

  it("demande confirmation et donne la raison si le nombre de montants ne colle pas", () => {
    const decision = assessQuote({
      audience: "public",
      review: reviewQuoteLines(INPUT, THREE_LINES.slice(0, 2)),
      explicitRate: null,
    });
    expect(decision.needsConfirmation).toBe(true);
    expect(decision.reason).toBe("3 montants dans le texte, 2 lignes chiffrées");
  });

  it("demande le taux dans l'app même si les lignes sont justes", () => {
    const review = reviewQuoteLines(INPUT, THREE_LINES);
    const decision = assessQuote({ audience: "connected", review, explicitRate: null });
    expect(decision.needsConfirmation).toBe(true);
    expect(decision.tva.rate).toBeNull();
  });
});
