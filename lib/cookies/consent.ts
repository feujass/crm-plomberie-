import {
  COOKIE_CONSENT_MAX_AGE_DAYS,
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_VERSION,
  PRIVACY_POLICY_VERSION,
} from "@/lib/legal/constants";

export type CookieConsentState = {
  version: string;
  essential: true;
  analytics: boolean;
  privacyPolicyVersion: string;
  updatedAt: string;
};

export const CONSENT_CHANGED_EVENT = "flowo:cookie-consent-changed";

function parseConsent(raw: string | null | undefined): CookieConsentState | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (typeof parsed.analytics !== "boolean") return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      essential: true,
      analytics: parsed.analytics,
      privacyPolicyVersion: parsed.privacyPolicyVersion ?? PRIVACY_POLICY_VERSION,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function readCookieConsent(): CookieConsentState | null {
  if (typeof document === "undefined") return null;
  const fromCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_CONSENT_NAME}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  if (fromCookie) {
    const decoded = decodeURIComponent(fromCookie);
    const parsed = parseConsent(decoded);
    if (parsed) return parsed;
  }
  try {
    const fromStorage = localStorage.getItem(COOKIE_CONSENT_NAME);
    return parseConsent(fromStorage);
  } catch {
    return null;
  }
}

export function hasCookieConsentChoice(): boolean {
  return readCookieConsent() !== null;
}

export function writeCookieConsent(analytics: boolean): CookieConsentState {
  const state: CookieConsentState = {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    analytics,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    updatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(state);
  const maxAge = COOKIE_CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${COOKIE_CONSENT_NAME}=${encodeURIComponent(serialized)}; path=/; max-age=${maxAge}; samesite=lax${secure ? "; secure" : ""}`;
  try {
    localStorage.setItem(COOKIE_CONSENT_NAME, serialized);
  } catch {
    /* quota / mode privé */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: state }));
  return state;
}

export function acceptAllCookies(): CookieConsentState {
  return writeCookieConsent(true);
}

export function rejectAnalyticsCookies(): CookieConsentState {
  return writeCookieConsent(false);
}
