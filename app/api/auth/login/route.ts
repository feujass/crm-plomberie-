import { NextResponse } from "next/server";

import { setAuthCookies } from "@/lib/backend/cookies";
import { backendBaseUrl } from "@/lib/backend/config";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const res = await fetch(`${backendBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof payload?.detail === "string" ? payload.detail : "Erreur de connexion";
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  if (typeof payload?.token !== "string") {
    return NextResponse.json({ error: "Réponse backend invalide" }, { status: 502 });
  }

  await setAuthCookies({ accessToken: payload.token, refreshToken: payload.refresh_token });
  return NextResponse.json({ user: payload.user ?? null }, { status: 200 });
}

