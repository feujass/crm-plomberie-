import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { assertBrCoTotals } from "@/lib/facturation/br-co";
import { buildFacturXXml } from "@/lib/facturation/build-facturx-xml";
import { mustangJarPath, mustangValidate, mustangValidateDirectory } from "@/lib/facturation/external-validators";
import {
  allFuzzClientProfiles,
  facturXSourceFromClientProfile,
  fuzzClientProfileKey,
  randomFacturXSource,
} from "@/lib/facturation/fuzz";

function mustangErrorSummary(report: string): string {
  const ids = report.match(/ErrorIDs:\s*\[([^\]]+)\]/);
  const errors = [...report.matchAll(/<error\b[^>]*>([\s\S]*?)<\/error>/gi)].map((m) =>
    (m[1] ?? "").replace(/\s+/g, " ").trim(),
  );
  const distinct = [...new Set(errors.filter(Boolean))];
  if (ids || distinct.length) {
    return [ids ? `ids=${ids[1]}` : null, distinct.slice(0, 3).join(" · ")].filter(Boolean).join(" | ");
  }
  const failed = report.match(/\[ID [A-Z0-9_-]+\][^\n]{0,160}/);
  return failed?.[0]?.trim() || report.replace(/\s+/g, " ").slice(0, 240);
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
    if (failures.length) {
      console.error(failures.slice(0, 20).join("\n"));
    }
    expect(failures, failures.slice(0, 8).join(" | ")).toEqual([]);
  }, 120_000);
});

describe("profils clients — cartesian Mustang", () => {
  it("passe les 216 combinaisons à Mustang et liste celles qui cassent", () => {
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

    for (const profile of profiles) {
      const key = fuzzClientProfileKey(profile);
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

    const missingDelivery: { key: string; file: string }[] = [];
    const withDelivery: { key: string; file: string }[] = [];
    for (const row of files) {
      const xml = readFileSync(row.file, "utf8");
      if (xml.includes("ApplicableHeaderTradeDelivery")) withDelivery.push(row);
      else missingDelivery.push(row);
    }

    // Canary JVM : un XML sans Delivery doit échouer XSD (évite de dumper 144 rapports Mustang).
    if (missingDelivery[0]) {
      const canary = mustangValidate(missingDelivery[0].file);
      expect(canary.ok, mustangErrorSummary(canary.report)).toBe(false);
      expect(canary.report).toMatch(/ApplicableHeaderTradeDelivery/);
    }
    for (const { key } of missingDelivery) {
      const extra = key.includes("|aucun|") && key.endsWith("|FR") ? " + BR-FR-12/BT-49" : "";
      broken.push({
        key,
        stage: "mustang",
        detail: `XSD CII : ApplicableHeaderTradeDelivery manquant (séquence Agreement → Delivery → Settlement)${extra}`,
      });
    }

    if (withDelivery.length > 0) {
      const okDir = path.join(dir, "with-delivery");
      mkdirSync(okDir, { recursive: true });
      for (const row of withDelivery) {
        copyFileSync(row.file, path.join(okDir, path.basename(row.file)));
      }
      const batch = mustangValidateDirectory(okDir);
      if (!batch.ok) {
        for (const { key, file } of withDelivery) {
          const r = mustangValidate(file);
          if (!r.ok) {
            broken.push({ key, stage: "mustang", detail: mustangErrorSummary(r.report) });
          }
        }
      }
    }

    const byLivraison: Record<string, number> = {};
    const byIdent: Record<string, number> = {};
    for (const row of broken) {
      const parts = row.key.split("|");
      const liv = parts[3] ?? "?";
      const ident = parts[2] ?? "?";
      byLivraison[liv] = (byLivraison[liv] ?? 0) + 1;
      byIdent[ident] = (byIdent[ident] ?? 0) + 1;
    }

    const reportPath = path.join(process.cwd(), "tools/validators/fuzz-client-profiles-report.json");
    const report = {
      total: profiles.length,
      generated: files.length,
      broken: broken.length,
      byStage: {
        generate: broken.filter((b) => b.stage === "generate").length,
        "br-co": broken.filter((b) => b.stage === "br-co").length,
        mustang: broken.filter((b) => b.stage === "mustang").length,
      },
      byLivraison,
      byIdent,
      passedWithDelivery: withDelivery.length,
      list: broken,
    };
    writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(
      `profils clients Mustang : ${broken.length}/${profiles.length} cassent (livraison=${JSON.stringify(byLivraison)} ident=${JSON.stringify(byIdent)}) → ${reportPath}`,
    );

    expect(profiles, "matrice incomplète").toHaveLength(216);
    expect(withDelivery, "les livraisons distinctes doivent rester au XSD").toHaveLength(72);
  }, 600_000);
});
