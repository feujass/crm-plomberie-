const ATTRIBUTION_KEY = "flowo_session_attribution";
const ATTRIBUTION_SENT_KEY = "flowo_session_attribution_sent";
const FIRST_TOUCH_KEY = "flowo_first_touch_source";

/** Expiration après 30 min sans activité (session navigateur). */
export const SESSION_ATTRIBUTION_TTL_MS = 30 * 60 * 1000;

export type SessionAttribution = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer?: string | null;
  referrer_domain?: string | null;
  landing_path?: string | null;
  viewport_width?: number | null;
};

export type FirstTouchAttribution = SessionAttribution & {
  captured_at: string;
};

type StoredSessionAttribution = {
  attribution: SessionAttribution;
  lastActivityAt: number;
};

function sessionStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function localStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeReferrerDomain(referrer: string | null | undefined): string | null {
  if (!referrer?.trim()) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

function hasUtmParams(params: URLSearchParams): boolean {
  return ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].some((key) =>
    Boolean(params.get(key)?.trim()),
  );
}

function readStoredSession(): StoredSessionAttribution | null {
  const store = sessionStore();
  if (!store) return null;
  try {
    const raw = store.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSessionAttribution;
    if (!parsed?.attribution || typeof parsed.lastActivityAt !== "number") return null;
    if (Date.now() - parsed.lastActivityAt > SESSION_ATTRIBUTION_TTL_MS) {
      store.removeItem(ATTRIBUTION_KEY);
      store.removeItem(ATTRIBUTION_SENT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(attribution: SessionAttribution): SessionAttribution {
  const store = sessionStore();
  const payload: StoredSessionAttribution = {
    attribution,
    lastActivityAt: Date.now(),
  };
  try {
    store?.setItem(ATTRIBUTION_KEY, JSON.stringify(payload));
  } catch {
    /* */
  }
  return attribution;
}

function touchStoredSession(): void {
  const stored = readStoredSession();
  if (!stored) return;
  writeStoredSession(stored.attribution);
}

function buildAttributionFromLocation(search: string, pathname: string): SessionAttribution {
  const params = new URLSearchParams(search);
  const referrer = typeof document !== "undefined" ? document.referrer || null : null;
  return {
    utm_source: params.get("utm_source")?.trim() || null,
    utm_medium: params.get("utm_medium")?.trim() || null,
    utm_campaign: params.get("utm_campaign")?.trim() || null,
    utm_content: params.get("utm_content")?.trim() || null,
    utm_term: params.get("utm_term")?.trim() || null,
    referrer,
    referrer_domain: normalizeReferrerDomain(referrer),
    landing_path: pathname,
    viewport_width: null,
  };
}

function persistFirstTouch(attribution: SessionAttribution): void {
  const store = localStore();
  if (!store) return;
  try {
    if (store.getItem(FIRST_TOUCH_KEY)) return;
    const firstTouch: FirstTouchAttribution = {
      ...attribution,
      captured_at: new Date().toISOString(),
    };
    store.setItem(FIRST_TOUCH_KEY, JSON.stringify(firstTouch));
  } catch {
    /* */
  }
}

/** Lecture first-touch permanent (marketing historique). */
export function readFirstTouchAttribution(): FirstTouchAttribution | null {
  const store = localStore();
  if (!store) return null;
  try {
    const raw = store.getItem(FIRST_TOUCH_KEY);
    return raw ? (JSON.parse(raw) as FirstTouchAttribution) : null;
  } catch {
    return null;
  }
}

export function captureSessionAttributionFromLocation(search: string, pathname: string): SessionAttribution {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(search);
  const stored = readStoredSession();

  if (hasUtmParams(params)) {
    const next = buildAttributionFromLocation(search, pathname);
    if (stored?.attribution.viewport_width && stored.attribution.viewport_width > 0) {
      next.viewport_width = stored.attribution.viewport_width;
    }
    persistFirstTouch(next);
    try {
      sessionStore()?.removeItem(ATTRIBUTION_SENT_KEY);
    } catch {
      /* */
    }
    return writeStoredSession(next);
  }

  if (stored) {
    touchStoredSession();
    return stored.attribution;
  }

  const fresh = buildAttributionFromLocation(search, pathname);
  persistFirstTouch(fresh);
  return writeStoredSession(fresh);
}

export function readSessionAttribution(): SessionAttribution {
  const stored = readStoredSession();
  if (stored) {
    touchStoredSession();
    return stored.attribution;
  }
  return {};
}

/** Met à jour viewport_width après montage client (innerWidth fiable). */
export function refreshSessionAttributionViewport(): void {
  if (typeof window === "undefined") return;
  const width = window.innerWidth;
  if (!Number.isFinite(width) || width <= 0) return;

  const stored = readStoredSession();
  if (!stored) return;

  writeStoredSession({ ...stored.attribution, viewport_width: Math.round(width) });
}

export function markAttributionSent(): void {
  try {
    sessionStore()?.setItem(ATTRIBUTION_SENT_KEY, "1");
  } catch {
    /* */
  }
}

export function hasSentAttribution(): boolean {
  try {
    return sessionStore()?.getItem(ATTRIBUTION_SENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function eventTypesWithAttribution(): Set<string> {
  return new Set([
    "page_view",
    "landing_view",
    "register_view",
    "register_submit",
    "register_error",
    "register_success",
    "cta_click",
    "pricing_view",
  ]);
}
