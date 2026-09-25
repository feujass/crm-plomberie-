import { describe, expect, it } from "vitest";

import {
  extractCitedAmounts,
  extractExplicitTvaRate,
  reviewQuoteLines,
  sumHtIfComplete,
  type QuoteDraftLine,
} from "@/lib/devis/quote-faithfulness";

const INPUT_FUITE = "un dép à 70 recherche de fuite à 410 et rapport à 80€";

const FAITHFUL_FUITE: QuoteDraftLine[] = [
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
    extraitSource: "rapport à 80€",
  },
];

describe("reviewQuoteLines", () => {
  it("accepte 3 lignes ancrées pour dép 70, fuite 410, rapport 80", () => {
    const review = reviewQuoteLines(INPUT_FUITE, FAITHFUL_FUITE);
    expect(review.ok).toBe(true);
    expect(review.needsConfirmation).toBe(false);
    expect(review.citedAmounts).toEqual([70, 410, 80]);
    expect(FAITHFUL_FUITE.map((line) => [line.designation, line.prixUnitaireHT])).toEqual([
      ["Déplacement", 70],
      ["Recherche de fuite", 410],
      ["Rapport d'intervention", 80],
    ]);
    expect(sumHtIfComplete(FAITHFUL_FUITE)).toBe(560);

    const invented: QuoteDraftLine[] = [
      { ...FAITHFUL_FUITE[0]!, prixUnitaireHT: 410 },
      { ...FAITHFUL_FUITE[1]!, prixUnitaireHT: 80 },
      {
        designation: "Recherche de fuite non destructive",
        quantite: 1,
        unite: "forfait",
        prixUnitaireHT: 70,
        extraitSource: "recherche de fuite non destructive",
      },
      { ...FAITHFUL_FUITE[2]!, prixUnitaireHT: null },
    ];
    const rejected = reviewQuoteLines(INPUT_FUITE, invented);
    expect(rejected.ok).toBe(false);
    expect(rejected.failures.some((failure) => failure.code === "source_not_in_input")).toBe(true);
    expect(rejected.failures.some((failure) => failure.code === "price_not_in_source")).toBe(true);
  });

  it("n'interprète pas 200 litres comme un prix et garde l'ordre des montants", () => {
    const input =
      "remplacement chauffe-eau 200 litres, dépose 150, fourniture et pose 890, groupe de sécurité 65, déplacement 45";
    expect(extractCitedAmounts(input)).toEqual([150, 890, 65, 45]);

    const lines: QuoteDraftLine[] = [
      {
        designation: "Remplacement chauffe-eau",
        quantite: 1,
        unite: "u",
        prixUnitaireHT: null,
        extraitSource: "remplacement chauffe-eau 200 litres",
      },
      {
        designation: "Dépose",
        quantite: 1,
        unite: "forfait",
        prixUnitaireHT: 150,
        extraitSource: "dépose 150",
      },
      {
        designation: "Fourniture et pose",
        quantite: 1,
        unite: "forfait",
        prixUnitaireHT: 890,
        extraitSource: "fourniture et pose 890",
      },
      {
        designation: "Groupe de sécurité",
        quantite: 1,
        unite: "forfait",
        prixUnitaireHT: 65,
        extraitSource: "groupe de sécurité 65",
      },
      {
        designation: "Déplacement",
        quantite: 1,
        unite: "forfait",
        prixUnitaireHT: 45,
        extraitSource: "déplacement 45",
      },
    ];

    const review = reviewQuoteLines(input, lines);
    expect(review.failures.filter((failure) => failure.code !== "incomplete_price")).toEqual([]);
    expect(lines.filter((line) => line.prixUnitaireHT != null).map((line) => line.prixUnitaireHT)).toEqual([
      150, 890, 65, 45,
    ]);
    expect(review.needsConfirmation).toBe(true);
  });

  it("laisse les prix vides et n'affiche pas de total", () => {
    const input = "recherche de fuite et réparation";
    const lines: QuoteDraftLine[] = [
      {
        designation: "Recherche de fuite",
        quantite: 1,
        unite: "forfait",
        prixUnitaireHT: null,
        extraitSource: "recherche de fuite",
      },
      {
        designation: "Réparation",
        quantite: 1,
        unite: "forfait",
        prixUnitaireHT: null,
        extraitSource: "réparation",
      },
    ];
    const review = reviewQuoteLines(input, lines);
    expect(lines.every((line) => line.prixUnitaireHT == null)).toBe(true);
    expect(review.needsConfirmation).toBe(true);
    expect(review.ok).toBe(true);
    expect(sumHtIfComplete(lines)).toBeNull();
  });

  it("rejette un extraitSource absent du texte", () => {
    const review = reviewQuoteLines(INPUT_FUITE, [
      {
        designation: "Recherche de fuite non destructive",
        quantite: 1,
        unite: "forfait",
        prixUnitaireHT: 70,
        extraitSource: "recherche de fuite non destructive",
      },
    ]);
    expect(review.ok).toBe(false);
    expect(review.failures.some((failure) => failure.code === "source_not_in_input")).toBe(true);
    expect(review.needsConfirmation).toBe(true);
  });

  it("rejette 4 lignes chiffrées quand le texte ne cite que 3 montants", () => {
    const lines: QuoteDraftLine[] = [
      ...FAITHFUL_FUITE,
      {
        designation: "Déplacement",
        quantite: 1,
        unite: "forfait",
        prixUnitaireHT: 70,
        extraitSource: "un dép à 70",
      },
    ];
    const review = reviewQuoteLines(INPUT_FUITE, lines);
    expect(review.ok).toBe(false);
    expect(review.failures.some((failure) => failure.code === "amount_count_mismatch")).toBe(true);
    expect(review.needsConfirmation).toBe(true);
  });
});

describe("extractExplicitTvaRate", () => {
  it("repère un taux énoncé et n'en invente pas", () => {
    expect(extractExplicitTvaRate("recherche de fuite à 410 en TVA à 20")).toBe(20);
    expect(extractExplicitTvaRate("déplacement 70, TVA 5,5 %")).toBe(5.5);
    expect(extractExplicitTvaRate("un dép à 70")).toBeNull();
  });
});
