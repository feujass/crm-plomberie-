import { existsSync } from "fs";
import { appendFile, mkdir, writeFile } from "fs/promises";
import path from "path";

const LOG_REL = "debug-session-0f238e.ndjson";
const SESSION_DEBUG_SENTINEL = ".session-debug-enable";
let cursorMirrorWriteWarned = false;

/** Dernières entrées (pour `GET ?peek=` et fichier `-peek.json`). Partagées avec Route Handler. */
const RING_MAX = 48;
const ingestRing: Record<string, unknown>[] = [];

/** Mis à jour uniquement sur `POST /api/debug/session-log` réussi — écrit depuis `route.ts`. */
export let lastInboundPostMs = 0;
export let lastInboundPostHypothesisId: string | null = null;

export function setLastInboundPost(hid: string | null): void {
  lastInboundPostMs = Date.now();
  lastInboundPostHypothesisId = hid;
}

function sessionDebugViaSentinelFile(): boolean {
  try {
    return existsSync(path.join(process.cwd(), SESSION_DEBUG_SENTINEL));
  } catch {
    return false;
  }
}

/** Chemin absolu NDJSON (`NEXT_DEBUG_SESSION_LOG`, `CRM_SESSION_DEBUG_FILE_ABS`, ou cwd). */
export function resolveDebugLogAbsolutePath(): string {
  const manual = process.env.NEXT_DEBUG_SESSION_LOG?.trim();
  if (manual) {
    return path.isAbsolute(manual)
      ? manual
      : path.resolve(process.cwd(), manual);
  }
  const fromConfig = process.env.CRM_SESSION_DEBUG_FILE_ABS?.trim();
  if (fromConfig) {
    return path.isAbsolute(fromConfig)
      ? fromConfig
      : path.resolve(process.cwd(), fromConfig);
  }
  return path.resolve(process.cwd(), LOG_REL);
}

/** `next dev` : `NODE_ENV=development` évite de dépendre de `CRM_NEXT_IS_DEV_TUNNEL` (souvent figé `"0"` après `next build`). */
export function loggingEnabled(): boolean {
  return (
    process.env.SESSION_DEBUG_LOG === "1" ||
    /** Prévisualisation / prod volontaire : rebuild requis (NEXT_PUBLIC figé au build). */
    process.env.NEXT_PUBLIC_CRM_DEBUG_UI === "1" ||
    sessionDebugViaSentinelFile()
  );
}

export function sessionDebugViaSentinelFileExported(): boolean {
  return sessionDebugViaSentinelFile();
}

export function getIngestRingSnapshot(): Record<string, unknown>[] {
  return ingestRing.slice();
}

/** Écrit NDJSON + anneau mémoire (GET peek). */
export async function appendDebugSessionEntry(
  payload: Record<string, unknown>,
): Promise<void> {
  const logPath = resolveDebugLogAbsolutePath();
  await mkdir(path.dirname(logPath), { recursive: true });
  const entry = {
    sessionId: "0f238e",
    timestamp: Date.now(),
    ...payload,
  };
  const line = JSON.stringify(entry) + "\n";
  await appendFile(logPath, line, "utf8");
  /** Même racine que le NDJSON (`CRM_SESSION_DEBUG_FILE_ABS`) — `process.cwd()` sous Next peut être ailleurs → miroir introuvable. */
  try {
    const repoRoot = path.dirname(logPath);
    const mirror = path.join(repoRoot, ".cursor", "debug-0f238e.log");
    await mkdir(path.dirname(mirror), { recursive: true });
    await appendFile(mirror, line, "utf8");
  } catch (e) {
    if (!cursorMirrorWriteWarned) {
      cursorMirrorWriteWarned = true;
      console.warn(
        "[CRM-debug-0f238e] miroir `.cursor/debug-0f238e.log` impossible (une fois) :",
        e instanceof Error ? e.message : String(e),
      );
    }
  }
  ingestRing.push(entry);
  while (ingestRing.length > RING_MAX) ingestRing.shift();
  /** Dernière requête `inlineboot=v1` (même curl) — fichier court dans `public/` pour l’IDE même si le NDJSON est ignoré par Git. */
  if (
    payload.hypothesisId === "H-inline-before-interactive" ||
    payload.hypothesisId === "H-img-ping-browser-no-js"
  ) {
    try {
      const repoRoot = path.dirname(logPath);
      const probeFile = path.join(repoRoot, "public", "_crm_browser_probe.json");
      await mkdir(path.dirname(probeFile), { recursive: true });
      await writeFile(probeFile, JSON.stringify(entry, null, 2), "utf8");
    } catch {
      /* */
    }
  }
  const peekPath = logPath.replace(/\.ndjson$/i, "-peek.json");
  try {
    await writeFile(
      peekPath,
      JSON.stringify({ entries: ingestRing }, null, 2),
      "utf8",
    );
  } catch {
    /* */
  }
  const criticalSessionDebug =
    payload.hypothesisId === "H-non-flight-body" ||
    payload.hypothesisId === "H-error-boundary" ||
    payload.hypothesisId === "H-unhandled-e394-rejection" ||
    payload.hypothesisId === "H-window-error-e394";
  if (criticalSessionDebug) {
    console.error(
      "[CRM-debug-0f238e] session-log entry (E394 / boundary) :\n",
      JSON.stringify({ resolvedLogPath: logPath, entry }, null, 2).slice(0, 4200),
    );
  }
  if (payload.hypothesisId === "instrument-boot") {
    console.info(
      "[CRM-debug-0f238e] session-log ✓ ligne `instrument-boot` écrite — le bundle ClientFetchInstrumentation a joint le serveur.",
    );
  }
  if (payload.hypothesisId === "instrument-mount") {
    console.info(
      "[CRM-debug-0f238e] session-log ✓ ligne `instrument-mount` écrite — chunk client hydraté côté React.",
    );
  }
  if (criticalSessionDebug && process.env.CRM_NEXT_IS_DEV_TUNNEL === "1") {
    try {
      const repoRoot = path.dirname(logPath);
      const mirror = path.join(repoRoot, "public", "e394-last-session.json");
      await mkdir(path.dirname(mirror), { recursive: true });
      await writeFile(mirror, JSON.stringify(entry, null, 2), "utf8");
    } catch {
      /* */
    }
  }
}
