import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { javaBin, mustangJarPath, validatorsDir } from "@/lib/facturation/external-validators";

const execFileAsync = promisify(execFile);

/** Tag Git de https://github.com/fnfempe/France_RFE — source Super PDP. */
export const FRANCE_RFE_REF = "v1.4.0.04";

export const FRANCE_RFE_STYLESHEETS = [
  { id: "FACTUR-X_EN16931", file: "FACTUR-X_EN16931.xslt" },
  { id: "BR-FR-Flux2", file: "BR-FR-Flux2-Schematron-CII.xslt" },
] as const;

export type FranceRfeStylesheetId = (typeof FRANCE_RFE_STYLESHEETS)[number]["id"];

export type SvrlFailedAssert = {
  id: string;
  flag: string;
  text: string;
};

export type FranceRfeFailure = SvrlFailedAssert & {
  stylesheet: FranceRfeStylesheetId;
};

export type FranceRfeValidation = {
  ok: boolean;
  report: string;
  failures: FranceRfeFailure[];
};

export function franceRfeRoot(): string {
  return path.join(validatorsDir(), "france-rfe");
}

export function franceRfeXsltDir(): string {
  return path.join(franceRfeRoot(), "FNFE_RFE_INVOICE", "Factur-X", "EN16931", "2xslt");
}

export function franceRfeReady(): boolean {
  return FRANCE_RFE_STYLESHEETS.every((s) => existsSync(path.join(franceRfeXsltDir(), s.file)));
}

export function isSvrlBlocking(flag: string): boolean {
  const f = flag.trim().toLowerCase();
  return f !== "warning" && f !== "info" && f !== "notice";
}

export function parseSvrlFailedAsserts(svrl: string): SvrlFailedAssert[] {
  const out: SvrlFailedAssert[] = [];
  const re = /<(?:svrl:)?failed-assert\b([^>]*)>([\s\S]*?)<\/(?:svrl:)?failed-assert>/gi;
  for (const m of svrl.matchAll(re)) {
    const attrs = m[1] ?? "";
    const body = m[2] ?? "";
    const id = /\bid="([^"]*)"/.exec(attrs)?.[1] ?? "";
    const flag = /\bflag="([^"]*)"/.exec(attrs)?.[1] ?? "";
    const text = /<(?:svrl:)?text>([\s\S]*?)<\/(?:svrl:)?text>/i.exec(body)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
    out.push({ id, flag, text });
  }
  return out;
}

function saxonArgs(xmlPath: string, xslPath: string, outPath: string): string[] {
  return [
    "-Xmx512m",
    "-Dfile.encoding=UTF-8",
    "-cp",
    mustangJarPath(),
    "net.sf.saxon.Transform",
    `-s:${xmlPath}`,
    `-xsl:${xslPath}`,
    `-o:${outPath}`,
  ];
}

function saxonTransformToSvrl(xmlPath: string, xslPath: string, outPath: string): string {
  execFileSync(javaBin(), saxonArgs(xmlPath, xslPath, outPath), {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  });
  return readFileSync(outPath, "utf8");
}

async function saxonTransformToSvrlAsync(xmlPath: string, xslPath: string, outPath: string): Promise<string> {
  await execFileAsync(javaBin(), saxonArgs(xmlPath, xslPath, outPath), {
    encoding: "utf8",
    timeout: 60_000,
  });
  return readFileSync(outPath, "utf8");
}

function collectFromSvrl(
  sheetId: FranceRfeStylesheetId,
  svrl: string,
  failures: FranceRfeFailure[],
  chunks: string[],
): void {
  const blocking = parseSvrlFailedAsserts(svrl).filter((a) => isSvrlBlocking(a.flag));
  for (const a of blocking) failures.push({ ...a, stylesheet: sheetId });
  if (blocking.length > 0) {
    chunks.push(`${sheetId}: ${blocking.map((a) => `${a.id || "?"} ${a.text}`.trim()).join(" | ")}`);
  }
}

function saxonErrorFailure(sheetId: FranceRfeStylesheetId, err: unknown): FranceRfeFailure {
  const e = err as { stdout?: string; stderr?: string; message?: string };
  const detail = (e.stderr || e.stdout || e.message || String(err)).trim();
  return { stylesheet: sheetId, id: "SAXON", flag: "fatal", text: detail.slice(0, 500) };
}

function assertFranceRfeTools(): void {
  if (!existsSync(mustangJarPath())) {
    throw new Error("Mustang-CLI.jar manquant (Saxon). Lance : bash scripts/ensure-facturx-validators.sh");
  }
  if (!franceRfeReady()) {
    throw new Error("France_RFE absent. Lance : bash scripts/ensure-facturx-validators.sh");
  }
}

export function franceRfeValidateXml(xml: string): FranceRfeValidation {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "flowo-france-rfe-xml-"));
  const xmlPath = path.join(tmp, "document.xml");
  try {
    writeFileSync(xmlPath, xml, "utf8");
    return franceRfeValidate(xmlPath);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export function franceRfeValidate(xmlPath: string): FranceRfeValidation {
  assertFranceRfeTools();
  const tmp = mkdtempSync(path.join(os.tmpdir(), "flowo-france-rfe-"));
  const failures: FranceRfeFailure[] = [];
  const chunks: string[] = [];
  try {
    for (const sheet of FRANCE_RFE_STYLESHEETS) {
      const xslPath = path.join(franceRfeXsltDir(), sheet.file);
      const outPath = path.join(tmp, `${sheet.id}.svrl`);
      try {
        collectFromSvrl(sheet.id, saxonTransformToSvrl(xmlPath, xslPath, outPath), failures, chunks);
      } catch (err) {
        const fail = saxonErrorFailure(sheet.id, err);
        failures.push(fail);
        chunks.push(`${sheet.id}: Saxon — ${fail.text.slice(0, 300)}`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return { ok: failures.length === 0, report: chunks.join("\n"), failures };
}

export async function franceRfeValidateAsync(xmlPath: string): Promise<FranceRfeValidation> {
  assertFranceRfeTools();
  const tmp = mkdtempSync(path.join(os.tmpdir(), "flowo-france-rfe-"));
  const failures: FranceRfeFailure[] = [];
  const chunks: string[] = [];
  try {
    for (const sheet of FRANCE_RFE_STYLESHEETS) {
      const xslPath = path.join(franceRfeXsltDir(), sheet.file);
      const outPath = path.join(tmp, `${sheet.id}.svrl`);
      try {
        collectFromSvrl(sheet.id, await saxonTransformToSvrlAsync(xmlPath, xslPath, outPath), failures, chunks);
      } catch (err) {
        const fail = saxonErrorFailure(sheet.id, err);
        failures.push(fail);
        chunks.push(`${sheet.id}: Saxon — ${fail.text.slice(0, 300)}`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return { ok: failures.length === 0, report: chunks.join("\n"), failures };
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (true) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      results[i] = await fn(items[i] as T);
    }
  };
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export async function franceRfeValidateMany(
  files: { key: string; file: string }[],
  concurrency = 4,
): Promise<{ key: string; file: string; result: FranceRfeValidation }[]> {
  return mapPool(files, concurrency, async (item) => ({
    ...item,
    result: await franceRfeValidateAsync(item.file),
  }));
}

export function franceRfeSummaryLine(r: FranceRfeValidation): string {
  if (r.ok) return "ok";
  const ids = [...new Set(r.failures.map((f) => f.id).filter(Boolean))];
  return ids.length > 0 ? ids.join(", ") : r.report.slice(0, 240);
}
