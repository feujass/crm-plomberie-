import { NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/backend/config";
import { fastApiDetailMessage } from "@/lib/backend/fastApiDetail";

export async function POST(req: Request) {
  let base: string;
  try {
    base = backendBaseUrl();
  } catch {
    return NextResponse.json(
      { error: "Configuration : BACKEND_URL manquant dans .env.local." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as { token?: string; password?: string } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token || !password) {
    return NextResponse.json({ error: "Jeton et mot de passe requis" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mot de passe trop court (6 caractères minimum)" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token, password }),
      cache: "no-store",
    });
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Serveur injoignable. Vérifie que le backend tourne sur ${base}. (${cause})` },
      { status: 503 },
    );
  }

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = fastApiDetailMessage(payload) ?? "Réinitialisation impossible";
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
