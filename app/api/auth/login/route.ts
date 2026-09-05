import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { captureLandingLead, resolveRequestCountry } from "@/lib/analytics/capture-landing-lead";
import { setAuthCookies } from "@/lib/backend/cookies";
import { backendBaseUrl } from "@/lib/backend/config";
import { fastApiDetailMessage } from "@/lib/backend/fastApiDetail";
import { profileHasCrmAccess } from "@/lib/auth/crm-access";
import { isSupabaseDataMode, supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const country = resolveRequestCountry(req);
  const analyticsSessionId =
    typeof body.analytics_session_id === "string" ? body.analytics_session_id.trim() : null;

  function trackLoginAttempt(success: boolean, error_message?: string | null) {
    if (!email) return;
    captureLandingLead(
      {
        source_page: "login",
        email,
        session_id: analyticsSessionId,
        success,
        error_message: error_message ?? null,
      },
      country,
    );
  }

  if (isSupabaseDataMode()) {
    const url = supabasePublicUrl()!;
    const key = supabaseAnonKey()!;
    const cookieStore = await cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      trackLoginAttempt(false, error.message);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_steps_completed, entreprise_nom")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profileHasCrmAccess(profile)) {
      await supabase.auth.signOut();
      const noAccessMsg =
        "Ce compte n'a pas d'accès CRM Flowo. Utilisez l'espace partenaire si vous êtes affilié, ou créez un compte artisan.";
      trackLoginAttempt(false, noAccessMsg);
      return NextResponse.json(
        {
          error: noAccessMsg,
          partnerPortal: true,
        },
        { status: 403 },
      );
    }

    trackLoginAttempt(true);
    const u = data.user;
    return NextResponse.json(
      {
        user: {
          id: u.id,
          email: u.email,
          prenom: u.user_metadata?.prenom ?? "",
          nom: u.user_metadata?.nom ?? "",
          role: "user",
        },
      },
      { status: 200 },
    );
  }

  let base: string;
  try {
    base = backendBaseUrl();
  } catch {
    return NextResponse.json(
      { error: "Configuration : BACKEND_URL manquant dans .env.local (voir .env.example)." },
      { status: 503 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: `Connexion impossible : le backend ne répond pas (${base}). (${cause})`,
      },
      { status: 503 },
    );
  }

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = fastApiDetailMessage(payload) ?? "Erreur de connexion";
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  if (typeof payload?.token !== "string") {
    return NextResponse.json({ error: "Réponse backend invalide" }, { status: 502 });
  }

  await setAuthCookies({
    accessToken: payload.token,
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : undefined,
  });
  return NextResponse.json({ user: payload.user ?? null }, { status: 200 });
}
