import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const PROTECTED_ROOTS = [
  "/accueil",
  "/rentabilite",
  "/devis",
  "/chantiers",
  "/clients",
  "/catalogue",
  "/assistant",
  "/facturation",
  "/parametres",
  "/compte",
  "/onboarding",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROOTS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

async function middlewareSupabase(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    if ((pathname === "/login" || pathname === "/register") && user) {
      return NextResponse.redirect(new URL("/accueil", request.url));
    }
    return supabaseResponse;
  }

  if (isProtectedPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isSupabaseAuthConfigured() && !process.env.BACKEND_URL?.trim()) {
    return middlewareSupabase(request);
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
