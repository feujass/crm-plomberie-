import { NextResponse, type NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
  max: number;
  windowMs: number;
};

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function clientIp(req: Request | NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function pruneExpired(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { ok: true };
  }
  if (existing.count >= config.max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  existing.count += 1;
  return { ok: true };
}

export const RATE_LIMITS = {
  authLogin: { max: 12, windowMs: 15 * 60_000 },
  authRegister: { max: 6, windowMs: 60 * 60_000 },
  authForgot: { max: 6, windowMs: 60 * 60_000 },
  authReset: { max: 10, windowMs: 60 * 60_000 },
  ai: { max: 30, windowMs: 60 * 60_000 },
  notificationsTest: { max: 8, windowMs: 60 * 60_000 },
} as const;

export function rateLimitKey(ip: string, scope: string): string {
  return `${scope}:${ip}`;
}

export function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    {
      error: "Trop de requêtes. Réessayez dans quelques instants.",
      retry_after_sec: retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}

export function matchRateLimitScope(pathname: string): keyof typeof RATE_LIMITS | null {
  if (pathname === "/api/auth/login" || pathname === "/api/auth/partner-login") return "authLogin";
  if (pathname === "/api/auth/partner-activate") return "authRegister";
  if (pathname === "/api/auth/register") return "authRegister";
  if (pathname === "/api/auth/forgot-password") return "authForgot";
  if (pathname === "/api/auth/reset-password") return "authReset";
  if (pathname === "/api/compte/notifications/test") return "notificationsTest";
  if (
    pathname === "/api/devis/generate" ||
    pathname === "/api/devis/vision" ||
    pathname.startsWith("/api/assistant/")
  ) {
    return "ai";
  }
  return null;
}
