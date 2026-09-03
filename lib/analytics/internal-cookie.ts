const DEFAULT_INTERNAL_EMAILS = ["jules.berliat@gmail.com"];

export function parseInternalAnalyticsEmails(raw?: string | null): string[] {
  const fromEnv = (raw ?? process.env.FLOWO_INTERNAL_ANALYTICS_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_INTERNAL_EMAILS, ...fromEnv])];
}

export function isInternalAnalyticsEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return parseInternalAnalyticsEmails().includes(email.trim().toLowerCase());
}

const COOKIE_NAME = "flowo_internal";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

export function internalAnalyticsCookieOptions() {
  return {
    path: "/",
    maxAge: COOKIE_MAX_AGE_SEC,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Côté navigateur — marque la session comme interne pour /api/track. */
export function setInternalAnalyticsCookieClient(): void {
  if (typeof document === "undefined") return;
  const opts = internalAnalyticsCookieOptions();
  const secure = opts.secure ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=1; path=${opts.path}; max-age=${opts.maxAge}; SameSite=Lax${secure}`;
}

export function hasInternalAnalyticsCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${COOKIE_NAME}=1`));
}
