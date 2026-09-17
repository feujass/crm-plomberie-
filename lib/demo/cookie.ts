export const DEMO_SESSION_COOKIE = "flowo_demo_id";
export const DEMO_DEVIS_COOKIE = "flowo_demo_devis";
const DEMO_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;
const DEMO_DEVIS_MAX_AGE_SEC = 60 * 60 * 2;

export function demoSessionCookieOptions() {
  return {
    path: "/",
    maxAge: DEMO_SESSION_MAX_AGE_SEC,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

export function demoDevisCookieOptions() {
  return {
    path: "/",
    maxAge: DEMO_DEVIS_MAX_AGE_SEC,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

export function newDemoSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`;
}

export function readDemoSessionId(cookieValue: string | undefined | null): string | null {
  const v = cookieValue?.trim();
  if (!v) return null;
  if (!/^[0-9a-f-]{36}$/i.test(v)) return null;
  return v;
}
