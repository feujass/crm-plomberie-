import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export function validatorsDir(): string {
  return path.join(process.cwd(), "tools/validators");
}

export function mustangJarPath(): string {
  return path.join(validatorsDir(), "Mustang-CLI.jar");
}

export function veraPdfBinPath(): string {
  const dir = validatorsDir();
  const candidates = [
    process.env.VERAPDF?.trim() || "",
    path.join(dir, "verapdf", "verapdf"),
    "/opt/homebrew/bin/verapdf",
    "/usr/local/bin/verapdf",
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (found) return found;
  try {
    const which = execFileSync("which", ["verapdf"], { encoding: "utf8" }).trim();
    if (which) return which;
  } catch {
    /* pas dans le PATH */
  }
  return path.join(dir, "verapdf", "verapdf");
}

export type ExternalValidation = {
  ok: boolean;
  report: string;
};

function javaCandidates(): string[] {
  const home = process.env.JAVA_HOME?.trim();
  return [
    home ? path.join(home, "bin", "java") : "",
    "/opt/homebrew/opt/openjdk@17/bin/java",
    "/opt/homebrew/opt/openjdk/bin/java",
    "/usr/lib/jvm/temurin-17-jdk-amd64/bin/java",
    "java",
  ].filter(Boolean);
}

export function javaBin(): string {
  for (const c of javaCandidates()) {
    try {
      if (c !== "java" && !existsSync(c)) continue;
      execFileSync(c, ["-version"], { stdio: "pipe" });
      return c;
    } catch {
      /* suivant */
    }
  }
  throw new Error("Java 17+ est requis (Mustang / veraPDF). Installe openjdk@17 ou exporte JAVA_HOME.");
}

function lastSummaryStatus(report: string): "valid" | "invalid" | null {
  const matches = [...report.matchAll(/<summary status="(valid|invalid)"\s*\/>/g)];
  const last = matches.at(-1)?.[1];
  return last === "valid" || last === "invalid" ? last : null;
}

export function mustangValidate(filePath: string): ExternalValidation {
  const java = javaBin();
  if (!existsSync(mustangJarPath())) {
    throw new Error(`Mustang-CLI.jar manquant. Lance : bash scripts/ensure-facturx-validators.sh`);
  }
  let stdout = "";
  let stderr = "";
  try {
    stdout = execFileSync(
      java,
      [
        "-Xmx1G",
        "-Dfile.encoding=UTF-8",
        "-jar",
        mustangJarPath(),
        "--no-notices",
        "--disable-file-logging",
        "--action",
        "validate",
        "--source",
        filePath,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120_000 },
    );
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    stdout = e.stdout ?? "";
    stderr = e.stderr ?? e.message ?? String(err);
  }
  const report = `${stdout}\n${stderr}`.trim();
  const hasInvalid = /<summary status="invalid"\s*\/>/.test(report);
  const last = lastSummaryStatus(report);
  const ok = !hasInvalid && last === "valid";
  return { ok, report };
}

export function mustangValidateDirectory(dir: string): ExternalValidation {
  const java = javaBin();
  if (!existsSync(mustangJarPath())) {
    throw new Error(`Mustang-CLI.jar manquant. Lance : bash scripts/ensure-facturx-validators.sh`);
  }
  let stdout = "";
  let stderr = "";
  try {
    stdout = execFileSync(
      java,
      [
        "-Xmx1G",
        "-Dfile.encoding=UTF-8",
        "-jar",
        mustangJarPath(),
        "--no-notices",
        "--disable-file-logging",
        "--action",
        "validateExpectValid",
        "--directory",
        dir,
        "--ignorefileextension",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 600_000 },
    );
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    stdout = e.stdout ?? "";
    stderr = e.stderr ?? e.message ?? String(err);
  }
  const report = `${stdout}\n${stderr}`.trim();
  if (/Overall test result:\s*valid/i.test(report) && !/Overall test result:\s*invalid/i.test(report)) {
    return { ok: true, report };
  }
  const files = [...report.matchAll(/Testing file \d+:\s+(valid|invalid)/g)];
  if (files.length > 0) {
    return { ok: files.every((m) => m[1] === "valid"), report };
  }
  const hasInvalid = /<summary status="invalid"\s*\/>/.test(report);
  const ok = !hasInvalid && /<summary status="valid"\s*\/>/.test(report);
  return { ok, report };
}

export function veraPdfValidate(pdfPath: string): ExternalValidation {
  const bin = veraPdfBinPath();
  if (!existsSync(bin)) {
    throw new Error(`veraPDF CLI manquant. Lance : bash scripts/ensure-facturx-validators.sh`);
  }
  let stdout = "";
  let stderr = "";
  try {
    stdout = execFileSync(bin, ["--flavour", "3b", "--format", "xml", pdfPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
      env: {
        ...process.env,
        JAVA_HOME: process.env.JAVA_HOME || "/opt/homebrew/opt/openjdk@17",
        PATH: `/opt/homebrew/opt/openjdk@17/bin:${process.env.PATH ?? ""}`,
      },
    });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    stdout = e.stdout ?? "";
    stderr = e.stderr ?? e.message ?? String(err);
  }
  const report = `${stdout}\n${stderr}`.trim();
  const ok = /isCompliant="true"/.test(report) && !/isCompliant="false"/.test(report);
  return { ok, report };
}
