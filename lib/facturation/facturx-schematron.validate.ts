import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { assertBrCoTotals } from "@/lib/facturation/br-co";
import { buildFacturXXml } from "@/lib/facturation/build-facturx-xml";
import { embedFacturXPdf } from "@/lib/facturation/embed-facturx";
import { mustangValidate, veraPdfValidate, mustangJarPath, veraPdfBinPath } from "@/lib/facturation/external-validators";
import { franceRfeReady, franceRfeSummaryLine, franceRfeValidate, franceRfeValidateXml } from "@/lib/facturation/france-rfe";
import { fixtureMixteMultiTva, fixtureAvoirNegatif, fixtureFranchise293B } from "@/lib/facturation/facturx-fixtures";
import { withSandboxDirectoryRouting } from "@/lib/facturation/pa/superpdp-routing";
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

  it("les fixtures passent France_RFE v1.4.0.04 (EN16931 + BR-FR-Flux2)", () => {
    if (!existsSync(mustangJarPath()) || !franceRfeReady()) {
      throw new Error("France_RFE / Saxon absents. Exécute : bash scripts/ensure-facturx-validators.sh");
    }
    const dir = path.join(process.cwd(), "tools/validators/sample");
    mkdirSync(dir, { recursive: true });
    const fixtures = [fixtureMixteMultiTva(), fixtureFranchise293B(), fixtureAvoirNegatif()];
    const broken: { numero: string; detail: string }[] = [];
    for (const source of fixtures) {
      const xml = buildFacturXXml(source);
      const xmlPath = path.join(dir, `${source.numero}.france-rfe.xml`);
      writeFileSync(xmlPath, xml, "utf8");
      const r = franceRfeValidate(xmlPath);
      if (!r.ok) broken.push({ numero: source.numero, detail: franceRfeSummaryLine(r) });
    }
    writeFileSync(
      path.join(dir, "france-rfe-fixtures-report.json"),
      JSON.stringify({ total: fixtures.length, broken: broken.length, list: broken }, null, 2),
      "utf8",
    );
    if (broken.length > 0) {
      console.error(
        `France_RFE fixtures : ${broken.length}/${fixtures.length} échecs\n` +
          broken.map((b) => `${b.numero}: ${b.detail}`).join("\n"),
      );
    }
    expect(broken, broken.map((b) => `${b.numero}: ${b.detail}`).join("\n")).toEqual([]);
  }, 180_000);

  it("France_RFE accepte BT-49 0225+SIREN et le XML final 0225+Peppol (après overlay)", () => {
    if (!existsSync(mustangJarPath()) || !franceRfeReady()) {
      throw new Error("France_RFE / Saxon absents. Exécute : bash scripts/ensure-facturx-validators.sh");
    }
    const dir = path.join(process.cwd(), "tools/validators/sample");
    mkdirSync(dir, { recursive: true });

    const sirenSrc = fixtureMixteMultiTva();
    const sirenXml = buildFacturXXml(sirenSrc);
    expect(sirenXml).toContain('schemeID="0225">443061841<');
    expect(sirenXml).not.toContain(">0225:443061841<");

    const peppolSrc = withSandboxDirectoryRouting(fixtureMixteMultiTva());
    const peppolXml = buildFacturXXml(peppolSrc);
    expect(peppolXml).toContain('schemeID="0225">315143296_97117<');
    expect(peppolXml).not.toContain('schemeID="0225">443061841<');
    const peppolFromString = franceRfeValidateXml(peppolXml);
    expect(peppolFromString.ok, franceRfeSummaryLine(peppolFromString)).toBe(true);

    const cases = [
      { name: "siren", xml: sirenXml },
      { name: "peppol", xml: peppolXml },
    ];
    const broken: string[] = [];
    for (const c of cases) {
      const xmlPath = path.join(dir, `bt49-${c.name}.xml`);
      writeFileSync(xmlPath, c.xml, "utf8");
      const r = franceRfeValidate(xmlPath);
      if (!r.ok) broken.push(`${c.name}: ${franceRfeSummaryLine(r)}`);
    }
    expect(broken, broken.join(" | ")).toEqual([]);
  }, 120_000);
});
