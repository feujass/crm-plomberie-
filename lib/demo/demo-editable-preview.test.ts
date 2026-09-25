import { describe, expect, it } from "vitest";

import { demoPricesComplete, demoTotalHt } from "@/components/marketing/DemoQuotePreview";

describe("aperçu démo éditable", () => {
  it("totalise 70 + 410 + 80 et se recalcule", () => {
    const lines = [
      { designation: "Dép", quantite: 1, unite: "forfait", prix: "70" },
      { designation: "Recherche de fuite", quantite: 1, unite: "forfait", prix: "410" },
      { designation: "Rapport", quantite: 1, unite: "forfait", prix: "80" },
    ];
    expect(demoTotalHt(lines)).toBe(560);
    expect(demoTotalHt(lines.map((line, index) => (index === 1 ? { ...line, prix: "420" } : line)))).toBe(570);
  });

  it("refuse le total tant qu'un prix manque", () => {
    const lines = [
      { designation: "Recherche de fuite", quantite: 1, unite: "forfait", prix: "410" },
      { designation: "Réparation", quantite: 1, unite: "forfait", prix: "" },
    ];
    expect(demoPricesComplete(lines)).toBe(false);
    expect(demoTotalHt(lines)).toBeNull();
  });
});
