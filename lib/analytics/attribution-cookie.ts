import type { SessionAttribution } from "@/lib/analytics/session-attribution";

export const ATTRIBUTION_COOKIE_NAME = "flowo_attrib";
export const ATTRIBUTION_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 90;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

type StoredAttribution = SessionAttribution & { captured_at?: string };

function cookieSecureSuffix(): string {
  if (typeof window !== "undefined" && window.location?.protocol === "https:") return "; Secure";
  if (process.env.NODE_ENV === "production") return "; Secure";
  return "";
}

function parseCookieValue(raw: string | null): StoredAttribution | null {
  if (!raw?.trim()) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as StoredAttribution;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function readCookieRaw(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie;
  if (!raw) return null;
  const prefix = `${ATTRIBUTION_COOKIE_NAME}=`;
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  }
  return null;
}

/** First-touch persistant (90 j) — ne remplace jamais une valeur existante. */
export function readAttributionCookie(): StoredAttribution | null {
  return parseCookieValue(readCookieRaw());
}

export function writeAttributionCookieFirstTouch(attribution: SessionAttribution): void {
  if (typeof document === "undefined") return;

  const existing = readAttributionCookie();
  const merged: StoredAttribution = existing ? { ...existing } : { captured_at: new Date().toISOString() };

  let changed = false;
  for (const key of UTM_KEYS) {
    const next = attribution[key]?.trim() || null;
    if (!next) continue;
    if (!merged[key]?.trim()) {
      merged[key] = next;
      changed = true;
    }
  }

  if (!merged.referrer?.trim() && attribution.referrer?.trim()) {
    merged.referrer = attribution.referrer;
    changed = true;
  }
  if (!merged.referrer_domain?.trim() && attribution.referrer_domain?.trim()) {
    merged.referrer_domain = attribution.referrer_domain;
    changed = true;
  }
  if (!merged.landing_path?.trim() && attribution.landing_path?.trim()) {
    merged.landing_path = attribution.landing_path;
    changed = true;
  }

  if (!existing || changed) {
    const value = encodeURIComponent(JSON.stringify(merged));
    document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${value}; path=/; max-age=${ATTRIBUTION_COOKIE_MAX_AGE_SEC}; SameSite=Lax${cookieSecureSuffix()}`;
  }
}

/** Fusionne cookie first-touch (90 j) avec l'attribution session courante. */
export function mergeAttributionWithCookie(session: SessionAttribution): SessionAttribution {
  const cookie = readAttributionCookie();
  if (!cookie) return session;

  const merged: SessionAttribution = { ...session };
  for (const key of UTM_KEYS) {
    if (!merged[key]?.trim() && cookie[key]?.trim()) {
      merged[key] = cookie[key];
    }
  }
  if (!merged.referrer?.trim() && cookie.referrer?.trim()) merged.referrer = cookie.referrer;
  if (!merged.referrer_domain?.trim() && cookie.referrer_domain?.trim()) {
    merged.referrer_domain = cookie.referrer_domain;
  }
  if (!merged.landing_path?.trim() && cookie.landing_path?.trim()) {
    merged.landing_path = cookie.landing_path;
  }
  return merged;
}
