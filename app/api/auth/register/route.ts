import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  captureLandingLead,
  landingLeadFromRegisterBody,
  resolveRequestCountry,
} from "@/lib/analytics/capture-landing-lead";
import { setAuthCookies } from "@/lib/backend/cookies";
import { backendBaseUrl } from "@/lib/backend/config";
import { fastApiDetailMessage } from "@/lib/backend/fastApiDetail";
import { validatePassword } from "@/lib/security/password-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseDataMode } from "@/lib/supabase/env";
import { attachReferralFromCookie } from "@/lib/affiliate/server";
import { ensureArtisanProfile } from "@/lib/auth/ensure-artisan-profile";
import { registerSupabaseUserWithAdmin } from "@/lib/auth/register-supabase-user";
import { accueilPathWithDemoDevis } from "@/lib/auth/post-auth-redirect";
import { linkDemoQuoteToUser } from "@/lib/demo/link-to-account";
import { demoDevisCookieOptions, DEMO_DEVIS_COOKIE } from "@/lib/demo/cookie";
import { PRIVACY_POLICY_VERSION } from "@/lib/legal/constants";
import { saveMinimalSupabaseProfile } from "@/lib/supabase/save-profile";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const bodyRec = body as Record<string, unknown>;
  const country = resolveRequestCountry(req);

  function trackRegister(success: boolean, error_message?: string | null) {
    captureLandingLead(landingLeadFromRegisterBody(bodyRec, { success, error_message }), country);
  }

  if (isSupabaseDataMode()) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email) {
      trackRegister(false, "E-mail requis.");
      return NextResponse.json({ error: "Entre une adresse e-mail valide.", field: "email" }, { status: 400 });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      trackRegister(false, passwordError);
      return NextResponse.json({ error: passwordError, field: "password" }, { status: 400 });
    }
    if (body.privacy_accepted !== true) {
      trackRegister(false, "CGU non acceptées.");
      return NextResponse.json(
        { error: "Accepte les CGU et la politique de confidentialité pour continuer." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const registered = await registerSupabaseUserWithAdmin(admin, email, password);
    if (!registered.ok) {
      trackRegister(false, registered.error);
      return NextResponse.json(
        { error: registered.error, field: registered.field ?? "email" },
        { status: registered.status },
      );
    }

    const userId = registered.userId;

    const profileResult = await saveMinimalSupabaseProfile(userId, email);
    if (!profileResult.ok) {
      const profileErr = `Impossible d'enregistrer le profil entreprise : ${profileResult.message}`;
      trackRegister(false, profileErr);
      return NextResponse.json(
        {
          error: profileErr,
        },
        { status: 503 },
      );
    }

    await admin
      .from("profiles")
      .update({
        privacy_accepted_at: new Date().toISOString(),
        privacy_policy_version: PRIVACY_POLICY_VERSION,
      })
      .eq("id", userId);

    await attachReferralFromCookie(userId);

    const ensured = await ensureArtisanProfile(userId, email);
    if (!ensured.ok) {
      console.error("[auth/register] ensureArtisanProfile failed", ensured.message);
    }

    let linkedDevisId: string | null = null;
    try {
      const demoCookie = (await cookies()).get("flowo_demo_id")?.value;
      const linked = await linkDemoQuoteToUser(userId, demoCookie);
      if (linked.devisId) {
        linkedDevisId = linked.devisId;
        console.info("[auth/register] demo devis linked", { userId, devisId: linked.devisId });
      } else if (demoCookie) {
        console.warn("[auth/register] demo cookie present but no devis linked", { userId, demoCookie });
      }
    } catch (e) {
      console.error("[auth/register] demo link failed", e);
    }

    trackRegister(true);
    const redirectTo = linkedDevisId ? accueilPathWithDemoDevis(linkedDevisId) : "/accueil";
    const response = NextResponse.json(
      {
        user: { id: userId, email, role: "user" },
        redirect_to: redirectTo,
        linked_devis_id: linkedDevisId,
        client_sign_in: true,
      },
      { status: 200 },
    );
    if (linkedDevisId) {
      response.cookies.set(DEMO_DEVIS_COOKIE, linkedDevisId, demoDevisCookieOptions());
    }
    return response;
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
    res = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Serveur d'inscription injoignable (${base}). (${cause})` },
      { status: 503 },
    );
  }

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = fastApiDetailMessage(payload) ?? "Erreur d'inscription";
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
