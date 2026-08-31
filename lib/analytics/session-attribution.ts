const ATTRIBUTION_KEY = "flowo_session_attribution";
const ATTRIBUTION_SENT_KEY = "flowo_session_attribution_sent";

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

function normalizeReferrerDomain(referrer: string | null | undefined): string | null {
  if (!referrer?.trim()) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

export function captureSessionAttributionFromLocation(search: string, pathname: string): SessionAttribution {
  if (typeof window === "undefined") return {};
  try {
    const existing = localStorage.getItem(ATTRIBUTION_KEY);
    if (existing) return JSON.parse(existing) as SessionAttribution;
  } catch {
    /* */
  }

  const params = new URLSearchParams(search);
  const referrer = document.referrer || null;
  const attribution: SessionAttribution = {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
    referrer,
    referrer_domain: normalizeReferrerDomain(referrer),
    landing_path: pathname,
    viewport_width: window.innerWidth,
  };

  try {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    /* */
  }
  return attribution;
}

export function readSessionAttribution(): SessionAttribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as SessionAttribution) : {};
  } catch {
    return {};
  }
}

export function markAttributionSent(): void {
  try {
    localStorage.setItem(ATTRIBUTION_SENT_KEY, "1");
  } catch {
    /* */
  }
}

export function hasSentAttribution(): boolean {
  try {
    return localStorage.getItem(ATTRIBUTION_SENT_KEY) === "1";
  } catch {
    return false;
  }
}
