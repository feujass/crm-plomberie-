import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = new Set([
  "/accueil",
  "/rentabilite",
  "/devis",
  "/chantiers",
  "/clients",
  "/catalogue",
  "/assistant",
  "/facturation",
  "/parametres",
  "/onboarding",
]);

function isProtectedPath(pathname: string) {
  if (pathname.startsWith("/onboarding")) return true;
  for (const p of PROTECTED) {
    if (p === "/onboarding") continue;
    if (pathname === p || pathname.startsWith(`${p}/`)) return true;
  }
  return false;
}

export async function updateSession(request: NextRequest) {
  const envOk = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!envOk) {
    const p = request.nextUrl.pathname;
    if (p === "/" || p === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/devis/public")) {
    return supabaseResponse;
  }
  if (pathname.startsWith("/facturation/public")) {
    return supabaseResponse;
  }
  if (pathname.startsWith("/api/webhooks")) {
    return supabaseResponse;
  }

  if (pathname === "/" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (pathname === "/" && user) {
    return NextResponse.redirect(new URL("/accueil", request.url));
  }

  if (isProtectedPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/register") && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_steps_completed")
      .eq("id", user.id)
      .maybeSingle();
    if (profile && profile.onboarding_steps_completed < 3) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return NextResponse.redirect(new URL("/accueil", request.url));
  }

  return supabaseResponse;
}
