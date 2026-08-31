import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/backend/config";
import { fastApiDetailMessage } from "@/lib/backend/fastApiDetail";
import { validatePassword } from "@/lib/security/password-policy";
import { isSupabaseDataMode, supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: string; password?: string } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  if (isSupabaseDataMode()) {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabasePublicUrl()!, supabaseAnonKey()!, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Session expirée ou lien invalide. Redemande un e-mail depuis « Mot de passe oublié »." },
        { status: 401 },
      );
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  }

  if (!token) {
    return NextResponse.json({ error: "Jeton et mot de passe requis" }, { status: 400 });
  }

  let base: string;
  try {
    base = backendBaseUrl();
  } catch {
    return NextResponse.json(
      { error: "Configuration : BACKEND_URL manquant dans .env.local." },
      { status: 503 },
    );
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
