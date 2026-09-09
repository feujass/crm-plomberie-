import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { assertBrCoTotals } from "@/lib/facturation/br-co";
import { buildFacturXXml, type FacturXSource } from "@/lib/facturation/build-facturx-xml";
import { mustangJarPath, mustangValidate, mustangValidateDirectory } from "@/lib/facturation/external-validators";
import { franceRfeReady, franceRfeSummaryLine, franceRfeValidateMany } from "@/lib/facturation/france-rfe";
import { allFuzzClientProfiles, partitionFuzzEinvoicingMatrix, randomFacturXSource } from "@/lib/facturation/fuzz";
import { withSandboxDirectoryRouting } from "@/lib/facturation/pa/superpdp-routing";

/** XML tel qu’il part après substitution Peppol (pas le fallback SIREN). */
function shippedFacturXXml(source: FacturXSource): string {
  return buildFacturXXml(withSandboxDirectoryRouting(source));
}

function mustangErrorSummary(report: string): string {
  const ids = report.match(/ErrorIDs:\s*\[([^\]]+)\]/);
  const brFr12 = /BR-FR-12|BT-49/.test(report);
  const errors = [...report.matchAll(/<error\b[^>]*>([\s\S]*?)<\/error>/gi)].map((m) =>
    (m[1] ?? "").replace(/\s+/g, " ").trim(),
  );
  const distinct = [...new Set(errors.filter(Boolean))];
  const head = [ids ? `ids=${ids[1]}` : null, brFr12 ? "BR-FR-12/BT-49" : null, distinct[0] ?? null]
    .filter(Boolean)
    .join(" | ");
  if (head) return head;
  const failed = report.match(/\[ID [A-Z0-9_-]+\][^\n]{0,120}/);
  return failed?.[0]?.trim() || report.replace(/\s+/g, " ").slice(0, 160);
}

describe("500 factures aléatoires — BR-CO-10 à BR-CO-17", () => {
  it("chaque XML a des totaux cohérents (Mustang des profils : test suivant)", () => {
    const failures: string[] = [];
    const dir = path.join(process.cwd(), "tools/validators/fuzz-xml");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });

    for (let seed = 1; seed <= 500; seed++) {
      try {
        const xml = buildFacturXXml(randomFacturXSource(seed));
        const br = assertBrCoTotals(xml);
        if (br.length > 0) {
          failures.push(`seed ${seed}: ${br.map((f) => `${f.rule} ${f.message}`).join("; ")}`);
          continue;
        }
        writeFileSync(path.join(dir, `seed-${String(seed).padStart(3, "0")}.xml`), xml, "utf8");
      } catch (err) {
        failures.push(`seed ${seed}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    expect(failures, failures.slice(0, 8).join(" | ")).toEqual([]);
  }, 120_000);
});

describe("profils clients — cartesian Mustang", () => {
  it("valide le XML final après overlay Peppol (gate produit, puis XSD + Schematron)", () => {
    if (!existsSync(mustangJarPath())) {
      throw new Error("Mustang-CLI.jar absent. Exécute : bash scripts/ensure-facturx-validators.sh");
    }

    const profiles = allFuzzClientProfiles();
    expect(profiles).toHaveLength(216);
    const { excluded, inScope } = partitionFuzzEinvoicingMatrix();

    const dir = path.join(process.cwd(), "tools/validators/fuzz-client-profiles");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });

    const failed: { key: string; stage: "generate" | "br-co" | "mustang"; detail: string }[] = [];
    const files: { key: string; file: string }[] = [];

    for (const { key, source } of inScope) {
      const slug = key.replaceAll("|", "__");
      try {
        const xml = shippedFacturXXml(source);
        const br = assertBrCoTotals(xml);
        if (br.length > 0) {
          failed.push({
            key,
            stage: "br-co",
            detail: br.map((f) => `${f.rule}: ${f.message}`).join("; "),
          });
          continue;
        }
        if (!xml.includes("315143296_97118") || !xml.includes("315143296_97117")) {
          failed.push({ key, stage: "generate", detail: "overlay Peppol absent (BT-34/BT-49)" });
          continue;
        }
        const file = path.join(dir, `${slug}.xml`);
        writeFileSync(file, xml, "utf8");
        files.push({ key, file });
      } catch (err) {
        failed.push({
          key,
          stage: "generate",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const batch = mustangValidateDirectory(dir);
    if (!batch.ok) {
      for (const { key, file } of files) {
        const r = mustangValidate(file);
        if (!r.ok) {
          failed.push({ key, stage: "mustang", detail: mustangErrorSummary(r.report) });
        }
      }
    }

    const reportPath = path.join(process.cwd(), "tools/validators/fuzz-client-profiles-report.json");
    writeFileSync(
      reportPath,
      JSON.stringify(
        {
          total: profiles.length,
          excluded: excluded.length,
          generated: files.length,
          failed: failed.length,
          list: failed.slice(0, 32),
        },
        null,
        2,
      ),
      "utf8",
    );

    expect(excluded, "hors périmètre (gate)").toHaveLength(108);
    expect(inScope, "à générer").toHaveLength(108);
    expect(
      failed,
      failed
        .slice(0, 8)
        .map((b) => `${b.key} [${b.stage}] ${b.detail}`)
        .join("\n"),
    ).toEqual([]);
    expect(files).toHaveLength(108);
  }, 600_000);
});

describe("profils clients — cartesian France_RFE", () => {
  it("v1.4.0.04 : XML final après overlay Peppol (EN16931 + BR-FR-Flux2)", async () => {
    if (!existsSync(mustangJarPath()) || !franceRfeReady()) {
      throw new Error("France_RFE / Saxon absents. Exécute : bash scripts/ensure-facturx-validators.sh");
    }

    const profiles = allFuzzClientProfiles();
    expect(profiles).toHaveLength(216);
    const { excluded, inScope } = partitionFuzzEinvoicingMatrix();

    const dir = path.join(process.cwd(), "tools/validators/fuzz-client-profiles-france-rfe");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });

    const files: { key: string; file: string }[] = [];
    const failed: { key: string; ids: string[]; detail: string }[] = [];
    const byRule: Record<string, number> = {};

    for (const { key, source } of inScope) {
      const slug = key.replaceAll("|", "__");
      const xml = shippedFacturXXml(source);
      const br = assertBrCoTotals(xml);
      if (br.length > 0) {
        failed.push({
          key,
          ids: br.map((f) => f.rule),
          detail: br.map((f) => `${f.rule}: ${f.message}`).join("; "),
        });
        continue;
      }
      if (!xml.includes("315143296_97118") || !xml.includes("315143296_97117")) {
        failed.push({ key, ids: ["overlay"], detail: "overlay Peppol absent (BT-34/BT-49)" });
        continue;
      }
      const file = path.join(dir, `${slug}.xml`);
      writeFileSync(file, xml, "utf8");
      files.push({ key, file });
    }

    const results = await franceRfeValidateMany(files, 4);
    for (const { key, result } of results) {
      if (result.ok) continue;
      const ids = [...new Set(result.failures.map((f) => f.id).filter(Boolean))];
      for (const id of ids) byRule[id] = (byRule[id] ?? 0) + 1;
      failed.push({ key, ids, detail: franceRfeSummaryLine(result) });
    }

    const reportPath = path.join(process.cwd(), "tools/validators/fuzz-client-profiles-france-rfe-report.json");
    writeFileSync(
      reportPath,
      JSON.stringify(
        {
          pin: "v1.4.0.04",
          overlay: "sandbox-peppol",
          total: profiles.length,
          excluded: excluded.length,
          generated: files.length,
          failed: failed.length,
          byRule,
          list: failed,
        },
        null,
        2,
      ),
      "utf8",
    );

    if (failed.length > 0) {
      const ruleLines = Object.entries(byRule)
        .sort((a, b) => b[1] - a[1])
        .map(([id, n]) => `  ${id}: ${n}`)
        .join("\n");
      console.error(
        `France_RFE: ${failed.length} échecs réels / ${files.length} générés (${excluded.length} exclus)\n` +
          `Règles:\n${ruleLines}\n` +
          `Exemples:\n` +
          failed
            .slice(0, 16)
            .map((b) => `  ${b.key} → ${b.detail}`)
            .join("\n") +
          `\nRapport: ${reportPath}`,
      );
    }

    expect(excluded, "hors périmètre (gate)").toHaveLength(108);
    expect(files, "XML générés").toHaveLength(108);
    expect(failed, failed.map((b) => `${b.key}: ${b.detail}`).join("\n")).toEqual([]);
  }, 600_000);
});
