import { cookies } from "next/headers";

import { AFFILIATE_REF_COOKIE, normalizeReferralCode } from "@/lib/affiliate/constants";

export async function readReferralCookie(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(AFFILIATE_REF_COOKIE)?.value;
  if (!raw) return null;
  const code = normalizeReferralCode(raw);
  return code || null;
}
