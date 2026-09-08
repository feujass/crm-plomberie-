import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { assertBrCoTotals } from "@/lib/facturation/br-co";
import { buildFacturXXml } from "@/lib/facturation/build-facturx-xml";
import { mustangJarPath, mustangValidateDirectory } from "@/lib/facturation/external-validators";
import { randomFacturXSource } from "@/lib/facturation/fuzz";
import { existsSync } from "node:fs";

describe("500 factures aléatoires — BR-CO-10 à BR-CO-17", () => {
  it("chaque XML a des totaux cohérents, et Mustang les accepte", () => {
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

    if (!existsSync(mustangJarPath())) {
      throw new Error("Mustang-CLI.jar absent. Exécute : bash scripts/ensure-facturx-validators.sh");
    }
    const mustang = mustangValidateDirectory(dir);
    if (!mustang.ok) {
      console.error(mustang.report.slice(0, 8000));
    }
    expect(mustang.ok, `Mustang fuzz : ${mustang.report.slice(0, 3000)}`).toBe(true);
  }, 600_000);
});
