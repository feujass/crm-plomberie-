"use client";

import { useEffect } from "react";

// #region agent log — détecter tout appel résiduel fetchServerAction / en-tête next-action (E394)
const SESSION = "0f238e";
const INGEST =
  "http://127.0.0.1:7491/ingest/2e2dbe90-bece-4fb6-a37a-f62acd64652c";

function nextActionFromRequest(input: RequestInfo | URL, init?: RequestInit): string | null {
  try {
    if (typeof Request !== "undefined" && input instanceof Request) {
      return input.headers.get("next-action");
    }
    if (!init?.headers) return null;
    return new Headers(init.headers).get("next-action");
  } catch {
    return null;
  }
}

/** Réponse JSON de `/api/debug/session-log` ; éviter `as typeof j` qui inferrait `never`. */
type SessionLogPostBody = {
  skipped?: boolean;
  receivedHypothesisId?: string | null;
};

function urlString(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return "";
}

/** `fetch("/api/...")` peut mal résoudre dans certains cadres ; forcer `origin` (hypothèse H-relative-api). */
function absoluteSameOriginApiPath(pathWithQuery: string): string {
  if (typeof window === "undefined" || !window.location?.origin) return pathWithQuery;
  if (!pathWithQuery.startsWith("/")) return pathWithQuery;
  try {
    return new URL(pathWithQuery, window.location.origin).href;
  } catch {
    return pathWithQuery;
  }
}

async function ingest(
  hypothesisId: string,
  msg: string,
  data: Record<string, unknown>,
) {
  const payload = {
    sessionId: SESSION,
    hypothesisId,
    location: "ClientFetchInstrumentation",
    message: msg,
    data,
    timestamp: Date.now(),
  };

  /** `keepalive: true` peut être dépriorisé / ignoré par certains navigateurs hors déchargement ; le réserver aux entrées E394 critiques. */
  const sessionLogKeepalive =
    hypothesisId === "H-non-flight-body" ||
    hypothesisId === "H-unhandled-e394-rejection" ||
    hypothesisId === "H-window-error-e394";

  /** D’abord le NDJSON repo (preuve disque), puis ingest Cursor. */
  void fetch(absoluteSameOriginApiPath("/api/debug/session-log"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    keepalive: sessionLogKeepalive,
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      const text = await res.text().catch(() => "");
      let j: SessionLogPostBody | null = null;
      try {
        j = text ? (JSON.parse(text) as SessionLogPostBody) : null;
      } catch {
        j = null;
      }
      if (!res.ok) {
        console.warn("[CRM-debug-0f238e] POST /api/debug/session-log refusé", res.status, text.slice(0, 260));
      } else if (j?.skipped) {
        console.warn(
          "[CRM-debug-0f238e] POST /api/debug/session-log ignoré côté serveur (skipped). SESSION_DEBUG_LOG=1 avec next start. hypothesisId=",
          j?.receivedHypothesisId ?? hypothesisId,
        );
      }
    })
    .catch((err) => {
      console.warn("[CRM-debug-0f238e] POST /api/debug/session-log échec réseau", err);
    })
    .finally(() => {
      fetch(INGEST, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION },
        body: JSON.stringify(payload),
      }).catch(() => {});
      /** Doublon disque peu probable ; utile si navigation annule un fetch précédent. */
      const beaconFor =
        hypothesisId === "H-non-flight-body" ||
        hypothesisId === "H-unhandled-e394-rejection" ||
        hypothesisId === "H-window-error-e394" ||
        hypothesisId === "instrument-boot" ||
        hypothesisId === "instrument-mount";
      if (
        beaconFor &&
        typeof navigator !== "undefined" &&
        typeof window !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        try {
          navigator.sendBeacon(
            `${window.location.origin}/api/debug/session-log`,
            new Blob([JSON.stringify(payload)], { type: "application/json" }),
          );
        } catch {
          /* */
        }
      }
    });
}

/** Patch une fois, au chargement du chunk client (avant useEffect) — sinon le 1er fetchServerAction peut passer avant le patch. */
function installFetchPatch() {
  if (typeof window === "undefined") return;
  const w = globalThis as typeof globalThis & { __crm_fetch_instr?: boolean };
  if (w.__crm_fetch_instr) return;
  w.__crm_fetch_instr = true;

  const original = globalThis.fetch.bind(globalThis);

  window.addEventListener(
    "unhandledrejection",
    (ev) => {
      const r = ev.reason as { message?: string; name?: string; __NEXT_ERROR_CODE?: unknown };
      const msg =
        typeof r?.message === "string"
          ? r.message
          : typeof ev.reason === "string"
            ? ev.reason
            : String(ev.reason ?? "");
      const code = r != null && typeof r === "object" && "__NEXT_ERROR_CODE" in r ? String(r.__NEXT_ERROR_CODE ?? "") : "";
      if (!msg.includes("unexpected response") && code !== "E394") return;
      void ingest("H-unhandled-e394-rejection", "unhandledrejection (promise)", {
        message: msg.slice(0, 800),
        reasonName: typeof r?.name === "string" ? r.name : typeof ev.reason,
        nextErrorCode: code || null,
      });
      try {
        sessionStorage.setItem(
          "CRM_DEBUG_LAST_E394_JSON",
          JSON.stringify({ msg: msg.slice(0, 800), code: code || null }),
        );
      } catch {
        /* */
      }
    },
    { passive: true },
  );

  /** Certains jets E394 peuvent passer en `window.error` plutôt qu’en `unhandledrejection`. */
  window.addEventListener(
    "error",
    (ev: Event) => {
      const ee = ev as ErrorEvent;
      const msg = typeof ee.message === "string" ? ee.message : "";
      if (!msg.includes("unexpected response") && !msg.includes("E394")) return;
      void ingest("H-window-error-e394", "window.error — unexpected / E394", {
        message: msg.slice(0, 800),
        filename:
          typeof ee.filename === "string" ? ee.filename.slice(0, 240) : null,
        lineno: typeof ee.lineno === "number" ? ee.lineno : null,
        colno: typeof ee.colno === "number" ? ee.colno : null,
      });
    },
    true,
  );

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const na = nextActionFromRequest(input, init);
    const url = urlString(input);
    const method =
      typeof Request !== "undefined" && input instanceof Request
        ? input.method
        : (init?.method ?? "GET");

    const res = await original(input, init);

    if (na) {
      const ct = res.headers.get("content-type") ?? "";
      const flight = ct.includes("text/x-component");
      let bodyPeek: string | undefined;
      if (!flight) {
        try {
          bodyPeek = (await res.clone().text())
            .slice(0, 500)
            .replace(/\s+/g, " ");
        } catch {
          bodyPeek = "(clone-read-failed)";
        }
      }
      const ingestPayload = {
        url: url.slice(0, 250),
        method,
        ok: res.ok,
        status: res.status,
        contentType: ct.slice(0, 120),
        looksLikeFlight: flight,
        naLen: na.length,
        redirected: res.redirected,
        responseUrlHint: String(res.url).slice(0, 250),
        ...(bodyPeek ? { bodyPeek } : {}),
      };
      void ingest(
        flight ? "H-next-action-ok" : "H-non-flight-body",
        "response after next-action POST",
        ingestPayload,
      );
      /** Preuve console si fichier NDJSON absent. En prod : `localStorage.setItem("CRM_DEBUG_E394","1")` puis rechargement. */
      const allowConsoleDiag =
        process.env.NODE_ENV === "development" ||
        (() => {
          try {
            return typeof localStorage !== "undefined" && localStorage.getItem("CRM_DEBUG_E394") === "1";
          } catch {
            return false;
          }
        })();
      if (!flight && allowConsoleDiag) {
        console.warn(
          "[CRM-debug-0f238e] réponse non-Flight sur next-action (E394) — copier ce JSON :",
          JSON.stringify(ingestPayload),
        );
      }
      /** Même données que la console mais persistant après navigation (pour coller depuis l’onglet Session storage ou `window.__CRM_DEBUG_LAST_NEXT_ACTION__`). */
      if (!flight) {
        const serial = JSON.stringify(ingestPayload);
        try {
          sessionStorage.setItem("CRM_DEBUG_LAST_NEXT_ACTION_JSON", serial);
        } catch {
          /* opaque / quota */
        }
        try {
          (globalThis as unknown as Record<string, unknown>).__CRM_DEBUG_LAST_NEXT_ACTION__ = ingestPayload;
        } catch {
          /* */
        }
      }
    }

    return res;
  };

  void ingest("instrument-boot", "fetch patch sync install", {
    ua: typeof navigator !== "undefined" ? String(navigator.userAgent).slice(0, 240) : "",
  });
}

installFetchPatch();

export function ClientFetchInstrumentation() {
  /** hypothèse H-hydrate : `instrument-boot` peut être perdu avant écriture NDJSON ; 2ᵉ tir après hydrate React (`keepalive`). */
  useEffect(() => {
    void ingest("instrument-mount", "ClientFetchInstrumentation après hydrate React", {
      path:
        typeof window !== "undefined" ? String(window.location?.pathname ?? "") : "",
      ua: typeof navigator !== "undefined" ? String(navigator.userAgent).slice(0, 240) : "",
    });

    /** `hb=v2&n=` : nonce imprévisible (preuve contre `curl`/scripts sans ce param). */
    const beatNonce =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    void fetch(
      absoluteSameOriginApiPath(`/api/debug/session-log?hb=v2&n=${encodeURIComponent(beatNonce)}`),
      {
        credentials: "include",
        cache: "no-store",
      },
    ).catch(() => {});

    /** hypothèse H-même-origine : si `lastInboundPostMs` reste 0, ce navigateur ne parle pas au même process que le `curl`, ou les POST échouent (Réseau). */
    const t = window.setTimeout(async () => {
      try {
        const r = await fetch(absoluteSameOriginApiPath("/api/debug/session-log?peek=0f238e"), {
          credentials: "include",
          cache: "no-store",
        });
        const d = (await r.json()) as { lastInboundPostMs?: number; cwd?: string };
        if ((d.lastInboundPostMs ?? 0) === 0) {
          console.warn(
            "[CRM-debug-0f238e] Toujours sans POST (lastInboundPostMs=0). Vérifier Réseau ; si le NDJSON n’a aucune ligne `instrument-client-hbv2-nonce`, le navigateur ne rejoint pas ce backend.",
            {
              href: typeof window !== "undefined" ? window.location.href : "",
            },
          );
        }
      } catch {
        /* */
      }
    }, 2000);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
// #endregion
