const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/partner-login",
  "/api/auth/partner-activate",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/affiliate/apply",
  "/api/affiliate/click",
  "/api/track",
  "/api/public/",
  "/api/webhooks/",
  "/api/cron/",
] as const;

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export function isDebugApiPath(pathname: string): boolean {
  return pathname === "/api/debug" || pathname.startsWith("/api/debug/");
}
