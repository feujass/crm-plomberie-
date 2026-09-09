import { describe, expect, it } from "vitest";

import { assertBrCoTotals } from "@/lib/facturation/br-co";
import { buildFacturXXml } from "@/lib/facturation/build-facturx-xml";
import {
  fixtureAvoirNegatif,
  fixtureFranchise293B,
  fixtureMixteMultiTva,
  fixtureMonoTva,
  fixtureProSansTvaIntracom,
} from "@/lib/facturation/facturx-fixtures";

describe("BR-CO totaux relus depuis le XML", () => {
  it("tient sur les cas de référence", () => {
    for (const src of [
      fixtureMonoTva(),
      fixtureMixteMultiTva(),
      fixtureFranchise293B(),
      fixtureAvoirNegatif(),
      fixtureProSansTvaIntracom(),
    ]) {
      const xml = buildFacturXXml(src);
      expect(assertBrCoTotals(xml), src.numero).toEqual([]);
    }
  });
});
