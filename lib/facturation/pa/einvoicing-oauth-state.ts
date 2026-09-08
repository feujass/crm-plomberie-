import { randomBytes } from "node:crypto";

export const EINVOICING_OAUTH_STATE_COOKIE = "flowo_einvoicing_oauth_state";

export function newEinvoicingOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export function einvoicingOAuthCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 10,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

export function einvoicingRedirectUri(origin: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || origin).replace(/\/+$/, "");
  return `${base}/api/compte/e-facturation/callback`;
}

export function oauthStatesEqual(expected: string | undefined, got: string | undefined): boolean {
  if (!expected || !got || expected.length !== got.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ got.charCodeAt(i);
  }
  return diff === 0;
}
