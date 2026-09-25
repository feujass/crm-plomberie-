import { describe, expect, it } from "vitest";

import { summarizeTva } from "@/lib/devis/tva-breakdown";

describe("ventilation TVA", () => {
  it("reste simple quand toutes les lignes ont le même taux", () => {
    const summary = summarizeTva([
      { ht: 70, rate: 10 },
      { ht: 410, rate: 10 },
    ]);
    expect(summary.kind).toBe("simple");
    if (summary.kind !== "simple") return;
    expect(summary.totalHt).toBe(480);
    expect(summary.totalTva).toBe(48);
    expect(summary.totalTtc).toBe(528);
  });

  it("ventile 10 % et 20 % sans inventer de taux", () => {
    const summary = summarizeTva([
      { ht: 400, rate: 10 },
      { ht: 890, rate: 20 },
    ]);
    expect(summary).toMatchObject({
      kind: "mixed",
      totalHt: 1290,
      totalTva: 218,
      totalTtc: 1508,
      rows: [
        { rate: 10, base: 400, tva: 40 },
        { rate: 20, base: 890, tva: 178 },
      ],
    });
  });

  it("n'affiche pas de TTC tant qu'une ligne n'a pas de taux", () => {
    const summary = summarizeTva([
      { ht: 400, rate: 10 },
      { ht: 890, rate: null },
    ]);
    expect(summary.kind).toBe("incomplete");
  });
});
