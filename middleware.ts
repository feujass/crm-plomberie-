import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/devis/public") ||
    pathname.startsWith("/facturation/public") ||
    pathname.startsWith("/api/webhooks");

  if (isPublic) return NextResponse.next();

  const protectedRoots = [
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
  ];
  const isProtected = protectedRoots.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (!isProtected) return NextResponse.next();

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
