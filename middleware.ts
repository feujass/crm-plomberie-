import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { profileHasCrmAccess } from "@/lib/auth/crm-access";
import { resolvePartnerForUser } from "@/lib/affiliate/server";
import {
  internalAnalyticsCookieOptions,
  isInternalAnalyticsEmail,
} from "@/lib/analytics/internal-cookie";
import { isDebugApiPath, isPublicApiPath } from "@/lib/security/api-access";
import { applySecurityHeaders } from "@/lib/security/headers";
import {
  checkRateLimit,
  clientIp,
  matchRateLimitScope,
  rateLimitKey,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import { isSupabaseAuthConfigured, supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";

const PUBLIC_PREFIXES = [
  "/devis/public",
  "/facturation/public",
  "/f/",
  "/api/webhooks",
  "/legal",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/decouvrir") return true;
  if (pathname === "/login" || pathname === "/register") return true;
  if (pathname === "/forgot-password" || pathname === "/reset-password") return true;
  if (pathname === "/auth/callback") return true;
  if (pathname === "/affiliation") return true;
  if (pathname.startsWith("/r/")) return true;
  if (isPartnerAuthPath(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const PROTECTED_ROOTS = [
  "/accueil",
  "/rentabilite",
  "/devis",
  "/clients",
  "/catalogue",
  "/assistant",
  "/facturation",
  "/parametres",
  "/partenaire",
  "/compte",
  "/admin",
  "/onboarding",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROOTS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

const CRM_ROOTS = [
  "/accueil",
  "/rentabilite",
  "/devis",
  "/clients",
  "/catalogue",
  "/assistant",
  "/facturation",
  "/parametres",
  "/compte",
  "/onboarding",
];

function isCrmPath(pathname: string): boolean {
  return CRM_ROOTS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

function isPartnerAuthPath(pathname: string): boolean {
  return pathname === "/partenaire/connexion" || pathname === "/partenaire/activer";
}

function isPartnerPortalPath(pathname: string): boolean {
  if (isPartnerAuthPath(pathname)) return false;
  return pathname === "/partenaire" || pathname.startsWith("/partenaire/");
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  return applySecurityHeaders(response, process.env.NODE_ENV === "production");
}

function applyInternalAnalyticsCookie(response: NextResponse, email: string | null | undefined): void {
  if (!isInternalAnalyticsEmail(email)) return;
  response.cookies.set("flowo_internal", "1", internalAnalyticsCookieOptions());
}

function maybeRedirectInternalFlag(request: NextRequest): NextResponse | null {
  if (request.nextUrl.searchParams.get("flowo_internal") !== "1") return null;
  const url = request.nextUrl.clone();
  url.searchParams.delete("flowo_internal");
  const response = NextResponse.redirect(url);
  response.cookies.set("flowo_internal", "1", internalAnalyticsCookieOptions());
  return withSecurityHeaders(response);
}

function applyRateLimit(request: NextRequest): NextResponse | null {
  const scope = matchRateLimitScope(request.nextUrl.pathname);
  if (!scope) return null;
  const ip = clientIp(request);
  const result = checkRateLimit(rateLimitKey(ip, scope), RATE_LIMITS[scope]);
  if (!result.ok) return rateLimitResponse(result.retryAfterSec);
  return null;
}

async function middlewareSupabase(request: NextRequest) {
  const internalRedirect = maybeRedirectInternalFlag(request);
  if (internalRedirect) return internalRedirect;

  const rateLimited = applyRateLimit(request);
  if (rateLimited) return withSecurityHeaders(rateLimited);

  const pathname = request.nextUrl.pathname;

  if (isDebugApiPath(pathname) && process.env.NODE_ENV === "production" && process.env.SESSION_DEBUG_LOG !== "1") {
    return withSecurityHeaders(NextResponse.json({ error: "Non disponible" }, { status: 404 }));
  }

  const url = supabasePublicUrl()!;
  const key = supabaseAnonKey()!;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isApiPath(pathname) && !isPublicApiPath(pathname)) {
    if (!user) {
      return withSecurityHeaders(NextResponse.json({ error: "Non authentifié" }, { status: 401 }));
    }
    return withSecurityHeaders(supabaseResponse);
  }

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_steps_completed, entreprise_nom")
        .eq("id", user.id)
        .maybeSingle();
      if (profileHasCrmAccess(profile)) {
        const steps = Number(profile?.onboarding_steps_completed ?? 0);
        const dest = steps < 3 ? "/onboarding/step-1" : "/accueil";
        return withSecurityHeaders(NextResponse.redirect(new URL(dest, request.url)));
      }
    }

    if (isPartnerAuthPath(pathname) && user) {
      const partner = await resolvePartnerForUser(user.id, user.email);
      if (partner?.status === "active") {
        return withSecurityHeaders(NextResponse.redirect(new URL("/partenaire", request.url)));
      }
    }

    if (pathname === "/register" && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_steps_completed, entreprise_nom")
        .eq("id", user.id)
        .maybeSingle();
      if (profileHasCrmAccess(profile)) {
        const steps = Number(profile?.onboarding_steps_completed ?? 0);
        const dest = steps < 3 ? "/onboarding/step-1" : "/accueil";
        return withSecurityHeaders(NextResponse.redirect(new URL(dest, request.url)));
      }
    }

    applyInternalAnalyticsCookie(supabaseResponse, user?.email);
    return withSecurityHeaders(supabaseResponse);
  }

  if (isPartnerPortalPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/partenaire/connexion";
    redirectUrl.search = "";
    return withSecurityHeaders(NextResponse.redirect(redirectUrl));
  }

  if (isProtectedPath(pathname) && user) {
    applyInternalAnalyticsCookie(supabaseResponse, user.email);
    if (isCrmPath(pathname) && !pathname.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_steps_completed, entreprise_nom")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileHasCrmAccess(profile)) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.searchParams.set("error", "no_crm");
        return withSecurityHeaders(NextResponse.redirect(loginUrl));
      }

      const skipOnboardingRedirect =
        pathname === "/onboarding" ||
        pathname.startsWith("/onboarding/") ||
        pathname.startsWith("/compte/");
      if (!skipOnboardingRedirect) {
        const steps = Number(profile?.onboarding_steps_completed ?? 0);
        if (steps < 3) {
          return withSecurityHeaders(NextResponse.redirect(new URL("/onboarding/step-1", request.url)));
        }
      }
    }
  }

  if (isProtectedPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    if (isPartnerPortalPath(pathname)) {
      redirectUrl.pathname = "/partenaire/connexion";
      redirectUrl.search = "";
    } else {
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirect", pathname);
    }
    return withSecurityHeaders(NextResponse.redirect(redirectUrl));
  }

  applyInternalAnalyticsCookie(supabaseResponse, user?.email);
  return withSecurityHeaders(supabaseResponse);
}

export async function middleware(request: NextRequest) {
  const internalRedirect = maybeRedirectInternalFlag(request);
  if (internalRedirect) return internalRedirect;

  const rateLimited = applyRateLimit(request);
  if (rateLimited) return withSecurityHeaders(rateLimited);

  const pathname = request.nextUrl.pathname;

  if (isDebugApiPath(pathname) && process.env.NODE_ENV === "production" && process.env.SESSION_DEBUG_LOG !== "1") {
    return withSecurityHeaders(NextResponse.json({ error: "Non disponible" }, { status: 404 }));
  }

  if (isSupabaseAuthConfigured() && !process.env.BACKEND_URL?.trim()) {
    return middlewareSupabase(request);
  }

  if (isApiPath(pathname) && !isPublicApiPath(pathname)) {
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
      return withSecurityHeaders(NextResponse.json({ error: "Non authentifié" }, { status: 401 }));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  if (!isProtectedPath(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = isPartnerPortalPath(pathname) ? "/partenaire/connexion" : "/login";
    if (!isPartnerPortalPath(pathname)) {
      url.searchParams.set("redirect", pathname);
    }
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
