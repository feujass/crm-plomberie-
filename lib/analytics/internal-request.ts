import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

import { internalAnalyticsCookieOptions, isInternalAnalyticsEmail } from "@/lib/analytics/internal-cookie";
import { supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";

export function hasInternalAnalyticsCookie(req: NextRequest): boolean {
  return req.cookies.get("flowo_internal")?.value === "1";
}

/** Trafic équipe : cookie flowo_internal ou session Supabase d’un e-mail interne. */
export async function resolveInternalAnalyticsTraffic(req: NextRequest): Promise<boolean> {
  if (hasInternalAnalyticsCookie(req)) return true;

  const url = supabasePublicUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return false;

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          /* lecture seule dans /api/track */
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return isInternalAnalyticsEmail(user?.email);
  } catch {
    return false;
  }
}

export function attachInternalAnalyticsCookieIfNeeded(
  response: { cookies: { set: (name: string, value: string, options?: Record<string, unknown>) => void } },
  req: NextRequest,
  isInternal: boolean,
): void {
  if (!isInternal || hasInternalAnalyticsCookie(req)) return;
  response.cookies.set("flowo_internal", "1", internalAnalyticsCookieOptions());
}
