import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { assertBrCoTotals } from "@/lib/facturation/br-co";
import { buildFacturXXml } from "@/lib/facturation/build-facturx-xml";
import { mustangJarPath, mustangValidate, mustangValidateDirectory } from "@/lib/facturation/external-validators";
import { franceRfeReady, franceRfeSummaryLine, franceRfeValidateMany } from "@/lib/facturation/france-rfe";
import {
  allFuzzClientProfiles,
  facturXSourceFromClientProfile,
  fuzzClientProfileKey,
  randomFacturXSource,
} from "@/lib/facturation/fuzz";

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
  it("valide les 216 combinaisons (XSD + Schematron, y compris ident=aucun FR)", () => {
    if (!existsSync(mustangJarPath())) {
      throw new Error("Mustang-CLI.jar absent. Exécute : bash scripts/ensure-facturx-validators.sh");
    }

    const profiles = allFuzzClientProfiles();
    expect(profiles).toHaveLength(216);

    const dir = path.join(process.cwd(), "tools/validators/fuzz-client-profiles");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });

    const broken: { key: string; stage: "generate" | "br-co" | "mustang"; detail: string }[] = [];
    const files: { key: string; file: string }[] = [];
    const aucunFrKeys: string[] = [];

    for (const profile of profiles) {
      const key = fuzzClientProfileKey(profile);
      if (profile.ident === "aucun" && profile.geo === "FR") aucunFrKeys.push(key);
      const slug = key.replaceAll("|", "__");
      try {
        const xml = buildFacturXXml(facturXSourceFromClientProfile(profile));
        const br = assertBrCoTotals(xml);
        if (br.length > 0) {
          broken.push({
            key,
            stage: "br-co",
            detail: br.map((f) => `${f.rule}: ${f.message}`).join("; "),
          });
          continue;
        }
        const file = path.join(dir, `${slug}.xml`);
        writeFileSync(file, xml, "utf8");
        files.push({ key, file });
      } catch (err) {
        broken.push({
          key,
          stage: "generate",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const batch = mustangValidateDirectory(dir);
    const brFr12Keys: string[] = [];
    if (!batch.ok) {
      for (const { key, file } of files) {
        const r = mustangValidate(file);
        if (!r.ok) {
          const detail = mustangErrorSummary(r.report);
          if (/BR-FR-12|BT-49/.test(r.report) || /BR-FR-12|BT-49/.test(detail)) {
            brFr12Keys.push(key);
          }
          broken.push({ key, stage: "mustang", detail });
        }
      }
    }

    const reportPath = path.join(process.cwd(), "tools/validators/fuzz-client-profiles-report.json");
    writeFileSync(
      reportPath,
      JSON.stringify(
        {
          total: profiles.length,
          generated: files.length,
          broken: broken.length,
          brFr12: brFr12Keys,
          list: broken.slice(0, 32),
        },
        null,
        2,
      ),
      "utf8",
    );

    expect(aucunFrKeys, "échantillon BR-FR-12 (ident=aucun + FR)").toHaveLength(24);
    expect(
      brFr12Keys,
      `BR-FR-12/BT-49 encore présent sur ${brFr12Keys.length} profils : ${brFr12Keys.slice(0, 8).join(" ; ")}`,
    ).toEqual([]);
    expect(
      broken,
      broken
        .slice(0, 8)
        .map((b) => `${b.key} [${b.stage}] ${b.detail}`)
        .join("\n"),
    ).toEqual([]);
    expect(files).toHaveLength(216);
  }, 600_000);
});

describe("profils clients — cartesian France_RFE", () => {
  it("v1.4.0.04 : 72/216 BR-FR-12 si ident=aucun (générateur non corrigé)", async () => {
    if (!existsSync(mustangJarPath()) || !franceRfeReady()) {
      throw new Error("France_RFE / Saxon absents. Exécute : bash scripts/ensure-facturx-validators.sh");
    }

    const profiles = allFuzzClientProfiles();
    expect(profiles).toHaveLength(216);

    const dir = path.join(process.cwd(), "tools/validators/fuzz-client-profiles-france-rfe");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });

    const files: { key: string; file: string }[] = [];
    const broken: { key: string; ids: string[]; detail: string }[] = [];
    const byRule: Record<string, number> = {};

    for (const profile of profiles) {
      const key = fuzzClientProfileKey(profile);
      const slug = key.replaceAll("|", "__");
      const xml = buildFacturXXml(facturXSourceFromClientProfile(profile));
      const br = assertBrCoTotals(xml);
      if (br.length > 0) {
        broken.push({
          key,
          ids: br.map((f) => f.rule),
          detail: br.map((f) => `${f.rule}: ${f.message}`).join("; "),
        });
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
      broken.push({ key, ids, detail: franceRfeSummaryLine(result) });
    }

    const reportPath = path.join(process.cwd(), "tools/validators/fuzz-client-profiles-france-rfe-report.json");
    writeFileSync(
      reportPath,
      JSON.stringify(
        {
          pin: "v1.4.0.04",
          total: profiles.length,
          generated: files.length,
          failed: broken.length,
          byRule,
          list: broken,
        },
        null,
        2,
      ),
      "utf8",
    );

    if (broken.length > 0) {
      const ruleLines = Object.entries(byRule)
        .sort((a, b) => b[1] - a[1])
        .map(([id, n]) => `  ${id}: ${n}`)
        .join("\n");
      console.error(
        `France_RFE: ${broken.length}/216 échecs (générateur non corrigé)\n` +
          `Règles:\n${ruleLines}\n` +
          `Exemples:\n` +
          broken
            .slice(0, 16)
            .map((b) => `  ${b.key} → ${b.detail}`)
            .join("\n") +
          `\nRapport: ${reportPath}`,
      );
    }

    expect(files, "XML générés pour France_RFE").toHaveLength(216);
    // Générateur non corrigé : BT-49 absent si ident=aucun (4×2×3×3 = 72).
    // Toute autre règle France_RFE doit rester verte.
    expect(byRule, JSON.stringify(byRule)).toEqual({ "BR-FR-12_BT-49": 72 });
    expect(broken).toHaveLength(72);
  }, 600_000);
});
