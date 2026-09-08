import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { assertBrCoTotals } from "@/lib/facturation/br-co";
import { buildFacturXXml } from "@/lib/facturation/build-facturx-xml";
import { embedFacturXPdf } from "@/lib/facturation/embed-facturx";
import { mustangValidate, veraPdfValidate, mustangJarPath, veraPdfBinPath } from "@/lib/facturation/external-validators";
import { fixtureMixteMultiTva, fixtureAvoirNegatif, fixtureFranchise293B } from "@/lib/facturation/facturx-fixtures";
import { renderFactureVisualPdf } from "@/lib/facturation/render-facture-visual";
import { existsSync } from "node:fs";

describe("validate:facturx — moteur indépendant", () => {
  it("le PDF visuel unique + XML passe Mustang et veraPDF", async () => {
    const source = fixtureMixteMultiTva();
    const xml = buildFacturXXml(source);
    const br = assertBrCoTotals(xml);
    expect(br, br.map((f) => `${f.rule}: ${f.message}`).join(" | ")).toEqual([]);

    const visual = await renderFactureVisualPdf(source);
    const pdfBytes = await embedFacturXPdf(visual, xml, {
      author: source.emetteur.entreprise_nom,
      title: `Facture ${source.numero}`,
      date: new Date("2026-03-15T12:00:00Z"),
    });

    const dir = path.join(process.cwd(), "tools/validators/sample");
    mkdirSync(dir, { recursive: true });
    const pdfPath = path.join(dir, "mixte-en16931.pdf");
    const xmlPath = path.join(dir, "mixte-en16931.xml");
    writeFileSync(pdfPath, pdfBytes);
    writeFileSync(xmlPath, xml, "utf8");

    if (!existsSync(mustangJarPath())) {
      throw new Error("Mustang-CLI.jar absent. Exécute : bash scripts/ensure-facturx-validators.sh");
    }
    const mustangPdf = mustangValidate(pdfPath);
    if (!mustangPdf.ok) {
      console.error(mustangPdf.report);
    }
    expect(mustangPdf.ok, `Mustang PDF : ${mustangPdf.report.slice(0, 4000)}`).toBe(true);

    const mustangXml = mustangValidate(xmlPath);
    if (!mustangXml.ok) {
      console.error(mustangXml.report);
    }
    expect(mustangXml.ok, `Mustang XML : ${mustangXml.report.slice(0, 4000)}`).toBe(true);

    if (!existsSync(veraPdfBinPath())) {
      throw new Error("veraPDF absent. Exécute : bash scripts/ensure-facturx-validators.sh");
    }
    const vera = veraPdfValidate(pdfPath);
    if (!vera.ok) console.error(vera.report);
    expect(vera.ok, `veraPDF : ${vera.report.slice(0, 4000)}`).toBe(true);

    for (const extra of [fixtureFranchise293B(), fixtureAvoirNegatif()]) {
      const extraXml = buildFacturXXml(extra);
      expect(assertBrCoTotals(extraXml)).toEqual([]);
      const extraPath = path.join(dir, `${extra.numero}.xml`);
      writeFileSync(extraPath, extraXml, "utf8");
      const r = mustangValidate(extraPath);
      if (!r.ok) console.error(r.report);
      expect(r.ok, `Mustang ${extra.numero}: ${r.report.slice(0, 2000)}`).toBe(true);
    }
  }, 180_000);
});
