import {
  appendDebugSessionEntry,
  getIngestRingSnapshot,
  lastInboundPostHypothesisId,
  lastInboundPostMs,
  loggingEnabled,
  resolveDebugLogAbsolutePath,
  sessionDebugViaSentinelFileExported,
  setLastInboundPost,
} from "@/lib/debug-session-append";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";

function debugBlockedInProduction() {
  return process.env.NODE_ENV === "production" && process.env.SESSION_DEBUG_LOG !== "1";
}

/** 1×1 GIF transparent (réponse réelle pour `<img>` / pas de corps JSON). */
const IMG_PING_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

/** Diagnostic + preuve disque : ouvrir cette URL en dev crée toujours au moins une ligne `get-probe` dans le NDJSON. */
export async function GET(req: Request) {
  if (debugBlockedInProduction()) {
    return NextResponse.json({ error: "Non disponible" }, { status: 404 });
  }
  try {
    const enabled = loggingEnabled();
    const urlObj = new URL(req.url);
    const ingestRing = getIngestRingSnapshot();
    const wantsPeek = loggingEnabled() && urlObj.searchParams.get("peek") === "0f238e";
    /** `hb=v2&n=<uuid>` : uniquement `useEffect` (ClientFetchInstrumentation) — préférable à `hb=1` (réutilisable par curl). */
    const hb = urlObj.searchParams.get("hb");
    const hbNonce = urlObj.searchParams.get("n")?.trim().slice(0, 48) ?? null;
    const isClientHbV2 = hb === "v2" && hbNonce !== null && hbNonce.length >= 8;
    const isClientHbLegacy = hb === "1";
    const isClientHb = isClientHbV2 || isClientHbLegacy;
    const inlineBoot = urlObj.searchParams.get("inlineboot");
    const isInlineBeforeInteractive = inlineBoot === "v1";
    const pathnameFromInline = urlObj.searchParams.get("p")?.slice(0, 240) ?? null;
    const imgPing = urlObj.searchParams.get("imgping");
    const isImgPingV1 = imgPing === "v1";
    const imgPingNonce = urlObj.searchParams.get("n")?.trim().slice(0, 64) ?? null;
    let wroteProbe = false;
    let writeError: string | null = null;
    if (loggingEnabled()) {
      try {
        await appendDebugSessionEntry({
          hypothesisId: isImgPingV1
            ? "H-img-ping-browser-no-js"
            : isInlineBeforeInteractive
              ? "H-inline-before-interactive"
              : isClientHb
                ? isClientHbV2
                  ? "instrument-client-hbv2-nonce"
                  : "instrument-client-hb"
                : "get-probe",
          location: "route.ts:GET",
          message: isImgPingV1
            ? "GET imgping=v1 (<img /> dans layout — UA sans JS client, réponse image/gif 1×1)"
            : isInlineBeforeInteractive
              ? "GET inlineboot=v1 (next/script beforeInteractive — JS navigateur avant hydrate React)"
              : isClientHb
                ? isClientHbV2
                  ? "GET /api/debug/session-log (navigator hb=v2 nonce — preuve React)"
                  : "GET /api/debug/session-log (navigator hb=1 legacy)"
                : "GET /api/debug/session-log (manual or link)",
          data: {
            cwd: process.cwd(),
            resolvedLogPath: resolveDebugLogAbsolutePath(),
            overrideEnvSet: Boolean(process.env.NEXT_DEBUG_SESSION_LOG?.trim()),
            fromNextConfigAbs: Boolean(process.env.CRM_SESSION_DEBUG_FILE_ABS?.trim()),
            nodeEnv: process.env.NODE_ENV ?? null,
            ...(isImgPingV1
              ? {
                  ua: req.headers.get("user-agent")?.slice(0, 260) ?? null,
                  secFetchDest: req.headers.get("sec-fetch-dest")?.slice(0, 48) ?? null,
                  imgPingNonce: imgPingNonce,
                  imgPingNoJs: true,
                  refererHost: (() => {
                    const r = req.headers.get("referer");
                    if (!r) return null as string | null;
                    try {
                      return new URL(r).hostname.slice(0, 120);
                    } catch {
                      return null as string | null;
                    }
                  })(),
                }
              : isInlineBeforeInteractive
                ? {
                    ua: req.headers.get("user-agent")?.slice(0, 260) ?? null,
                    pathnameFromClient: pathnameFromInline,
                    beforeInteractiveProbe: true,
                  }
                : isClientHb
                  ? {
                      ua: req.headers.get("user-agent")?.slice(0, 260) ?? null,
                      ...(isClientHbV2
                        ? { hbNonce, reactExecutionProbe: true }
                        : { ambiguousHb1: true }),
                    }
                  : {}),
          },
        });
        wroteProbe = true;
      } catch (e) {
        wroteProbe = false;
        writeError = e instanceof Error ? e.message : String(e);
      }
    }

    let peekSerializable: Record<string, unknown>[] | undefined;
    if (wantsPeek && ingestRing.length) {
      try {
        peekSerializable = JSON.parse(JSON.stringify(ingestRing)) as Record<
          string,
          unknown
        >[];
      } catch {
        peekSerializable = ingestRing.slice();
      }
    }

    /** Dernières lignes ON DISQUE (`ndjsonTail`) — utile si l’IDE n’actualise pas le fichier (repro navigateur ≠ vue Cursor). `?tail=25` max 80. */
    let ndjsonTail: Record<string, unknown>[] | undefined;
    const tailRaw = urlObj.searchParams.get("tail");
    if (loggingEnabled() && tailRaw !== null && tailRaw.length > 0) {
      const tailN = Math.min(80, Math.max(1, parseInt(tailRaw, 10) || 1));
      try {
        const logPath = resolveDebugLogAbsolutePath();
        const raw = await readFile(logPath, "utf8");
        const lines = raw.split("\n").filter((ln) => ln.trim().length > 0);
        ndjsonTail = lines.slice(-tailN).map((line) => {
          try {
            return JSON.parse(line) as Record<string, unknown>;
          } catch {
            return { _parseError: true, _snippet: line.slice(0, 160) };
          }
        });
      } catch {
        ndjsonTail = [];
      }
    }

    if (loggingEnabled() && isImgPingV1 && wroteProbe) {
      return new NextResponse(IMG_PING_GIF, {
        status: 200,
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "private, no-store, max-age=0",
          "X-CRM-Img-Ping": "1",
        },
      });
    }

    return NextResponse.json({
      loggingEnabled: enabled,
      nextPublicCrmDebugUi:
        process.env.NEXT_PUBLIC_CRM_DEBUG_UI === "1",
      nodeEnv: process.env.NODE_ENV ?? null,
      sessionFlag: process.env.SESSION_DEBUG_LOG === "1",
      wroteProbe,
      writeError,
      cwd: process.cwd(),
      resolvedDebugLogAbsolutePath: resolveDebugLogAbsolutePath(),
      crmSessionDebugFileAbsFromEnv: process.env.CRM_SESSION_DEBUG_FILE_ABS ?? null,
      crmNextIsDevTunnel: process.env.CRM_NEXT_IS_DEV_TUNNEL ?? null,
      peekRingCount: ingestRing.length,
      ...(wantsPeek && peekSerializable
        ? { peekEntries: peekSerializable }
        : wantsPeek
          ? { peekEntries: [] as Record<string, unknown>[] }
          : {}),
      ...(enabled
        ? {}
        : {
            sessionDebugInactiveHint:
              "Activer logs session + POST : SESSION_DEBUG_LOG=1 dans .env.local, npm run start:debug-session, ou fichier vide `.session-debug-enable` à la racine du projet (voir .env.example), puis même process que le navigateur.",
          }),
      sessionDebugSentinelPresent: sessionDebugViaSentinelFileExported(),
      lastInboundPostMs,
      lastInboundPostHypothesisId,
      incomingHostHeader: req.headers.get("host"),
      forwardedHost: req.headers.get("x-forwarded-host"),
      forwardedProto: req.headers.get("x-forwarded-proto"),
      ...(ndjsonTail !== undefined ? { ndjsonTail } : {}),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[CRM-debug-0f238e] GET /api/debug/session-log —", message);
    return NextResponse.json(
      {
        CRM_debug_fatal: message,
        sessionDebugInactiveHint:
          "Erreur inattendue dans la route GET. Vérifier le terminal Next ou supprimer/regénérer `.next` puis relancer.",
      },
      { status: 500 },
    );
  }
}

/** NDJSON `debug-session-0f238e.ndjson` — `next dev` ou `SESSION_DEBUG_LOG=1` avec `next start`. */
export async function POST(req: Request) {
  if (debugBlockedInProduction()) {
    return NextResponse.json({ error: "Non disponible" }, { status: 404 });
  }
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const hid =
    typeof payload?.hypothesisId === "string" ? payload.hypothesisId : null;

  if (!loggingEnabled()) {
    console.warn(
      "[CRM-debug-0f238e] session-log POST ignoré — logging désactivé (next start ? ajouter SESSION_DEBUG_LOG=1). hypothesisId=",
      hid ?? "?",
    );
    return NextResponse.json(
      {
        skipped: true,
        reason:
          "Définir SESSION_DEBUG_LOG=1 dans .env.local si vous utilisez next start (NODE_ENV=production).",
        receivedHypothesisId: hid,
      },
      { status: 202 },
    );
  }

  try {
    await appendDebugSessionEntry(payload);
    setLastInboundPost(hid);
    return NextResponse.json({
      ok: true,
      resolvedDebugLogAbsolutePath: resolveDebugLogAbsolutePath(),
    });
  } catch {
    return NextResponse.json({ message: "écriture log impossible" }, { status: 500 });
  }
}
