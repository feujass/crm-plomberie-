import { describe, expect, it } from "vitest";

import { computeDemoTotalTtc, previewLinesFromQuote } from "@/lib/demo/quote-math";

describe("demo quote math", () => {
  it("calcule le TTC arrondi", () => {
    const ttc = computeDemoTotalTtc([
      { designation: "MO", quantite: 2, unite: "h", prix_ht: 50, tva: 10 },
      { designation: "Robinet", quantite: 1, unite: "u", prix_ht: 120, tva: 20 },
    ]);
    expect(ttc).toBe(254);
  });

  it("extrait les 2 premières lignes", () => {
    const lines = previewLinesFromQuote([
      { designation: "A", quantite: 1, unite: "u", prix_ht: 10, tva: 10 },
      { designation: "B", quantite: 2, unite: "h", prix_ht: 20, tva: 10 },
      { designation: "C", quantite: 1, unite: "u", prix_ht: 30, tva: 10 },
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0]?.designation).toBe("A");
  });
});
