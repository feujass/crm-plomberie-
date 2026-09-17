export const AFFILIATE_REF_COOKIE = "flowo_ref";
export const AFFILIATE_REF_MAX_AGE_DAYS = 30;

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function buildReferralUrl(code: string, baseUrl?: string): string {
  const origin = baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${origin.replace(/\/+$/, "")}/r/${encodeURIComponent(normalizeReferralCode(code))}`;
}

export function buildLandingUrlWithRef(code: string, baseUrl?: string): string {
  const origin = baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({ ref: normalizeReferralCode(code) });
  return `${origin.replace(/\/+$/, "")}/?${params.toString()}`;
}

export function buildRegisterUrlWithRef(code: string, baseUrl?: string): string {
  const origin = baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({ ref: normalizeReferralCode(code) });
  return `${origin.replace(/\/+$/, "")}/register?${params.toString()}`;
}
