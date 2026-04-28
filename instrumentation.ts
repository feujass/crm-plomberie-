/**
 * NDJSON session debug sans importer `@/lib` (webpack `fs`).
 * · `register` — démarrage
 * · `onRequestError` — erreurs serveur sur routes **`action`** (Server Actions → E394)
 */

import type { RequestErrorContext } from "next/dist/server/instrumentation/types";

const LOG_REL = "debug-session-0f238e.ndjson";
const SESSION_DEBUG_SENTINEL = ".session-debug-enable";

/** Retourne le chemin NDJSON écrit, ou `null` si journalisation inactive / échec. */
async function appendInstrumentationNdjson(payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
}): Promise<string | null> {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- runtime Node uniquement */
  const pathMod: typeof import("path") = await import(
    /* webpackIgnore: true */
    "path"
  );
  const { existsSync } = (await import(
    /* webpackIgnore: true */
    "fs"
  )) as typeof import("fs");
  const fs = (await import(
    /* webpackIgnore: true */
    "fs/promises"
  )) as typeof import("fs/promises");
  /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

  const cwd = process.cwd();
  const nodeEnv = process.env.NODE_ENV;
  const isNextDev =
    typeof nodeEnv === "string" && nodeEnv === "development";
  const loggingEnabled =
    isNextDev ||
    process.env.SESSION_DEBUG_LOG === "1" ||
    process.env.CRM_NEXT_IS_DEV_TUNNEL === "1" ||
    process.env.NEXT_PUBLIC_CRM_DEBUG_UI === "1" ||
    (() => {
      try {
        return existsSync(pathMod.join(cwd, SESSION_DEBUG_SENTINEL));
      } catch {
        return false;
      }
    })();
  if (!loggingEnabled) return null;

  let logAbs: string;
  const manual = process.env.NEXT_DEBUG_SESSION_LOG?.trim();
  if (manual) {
    logAbs = pathMod.isAbsolute(manual)
      ? manual
      : pathMod.resolve(cwd, manual);
  } else {
    const fromConfig = process.env.CRM_SESSION_DEBUG_FILE_ABS?.trim();
    if (fromConfig) {
      logAbs = pathMod.isAbsolute(fromConfig)
        ? fromConfig
        : pathMod.resolve(cwd, fromConfig);
    } else {
      logAbs = pathMod.resolve(cwd, LOG_REL);
    }
  }

  await fs.mkdir(pathMod.dirname(logAbs), { recursive: true });
  const dataOut = { ...payload.data, resolvedLogPath: logAbs };
  const line =
    JSON.stringify({
      sessionId: "0f238e",
      timestamp: Date.now(),
      hypothesisId: payload.hypothesisId,
      location: payload.location,
      message: payload.message,
      data: dataOut,
    }) + "\n";
  await fs.appendFile(logAbs, line, "utf8");
  console.info("[CRM-debug-0f238e] instrumentation NDJSON ✓", payload.hypothesisId, logAbs);
  return logAbs;
}

export async function register(): Promise<void> {
  if (typeof process === "undefined") return;
  try {
    const logAbs = await appendInstrumentationNdjson({
      hypothesisId: "server-next-startup",
      location: "instrumentation.ts:register",
      message:
        "Runtime Next démarré — repère fichier NDJSON correspondant au process (voir resolvedLogPath).",
      data: {
        pid: process.pid,
        cwd: process.cwd(),
        resolvedLogPath: "",
        nodeEnv: process.env.NODE_ENV ?? null,
        vercelEnv: process.env.VERCEL_ENV ?? null,
      },
    });
    if (logAbs) {
      console.info(
        "[CRM-debug-0f238e] instrumentation — ligne `server-next-startup` écrite NDJSON:",
        logAbs,
      );
    }
  } catch (e) {
    console.warn("[CRM-debug-0f238e] instrumentation register — écriture NDJSON ignorée :", e);
  }
}

/** Preuve runtime côté serveur quand une Server Action échoue avant/après réponse Flight attendue — utile sans trace client NDJSON. */
export async function onRequestError(
  error: unknown,
  errorRequest: Readonly<{
    path: string;
    method: string;
    headers: NodeJS.Dict<string | string[]>;
  }>,
  errorContext: Readonly<RequestErrorContext>,
): Promise<void> {
  if (errorContext.routeType !== "action") return;
  try {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? String(error.stack).slice(0, 2000) : null;
    const logAbs = await appendInstrumentationNdjson({
      hypothesisId: "server-action-onRequestError",
      location: "instrumentation.ts:onRequestError",
      message: "Erreur sur route Server Action (Next instrumentation)",
      data: {
        requestPath: errorRequest.path,
        method: errorRequest.method,
        routerKind: errorContext.routerKind,
        routePath: errorContext.routePath,
        routeType: errorContext.routeType,
        renderSource: errorContext.renderSource ?? null,
        errorMessage: msg.slice(0, 1500),
        errorName: error instanceof Error ? error.name : typeof error,
        stackPreview: stack,
      },
    });
    if (logAbs && /unexpected|E394|Flight|x-component/i.test(msg)) {
      console.error(
        "[CRM-debug-0f238e] onRequestError (action, suspect E394 adj.) — msg:",
        msg.slice(0, 600),
      );
    }
  } catch (e) {
    console.warn("[CRM-debug-0f238e] instrumentation onRequestError — append ignorée :", e);
  }
}
