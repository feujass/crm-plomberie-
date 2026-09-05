import { createServerClient } from "@supabase/ssr";
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
import { isSupabaseDataMode, supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";
import { attachReferralFromCookie } from "@/lib/affiliate/server";
import { linkDemoQuoteToUser } from "@/lib/demo/link-to-account";
import { demoDevisCookieOptions, DEMO_DEVIS_COOKIE } from "@/lib/demo/cookie";
import { PRIVACY_POLICY_VERSION } from "@/lib/legal/constants";
import { translateSupabaseAuthError } from "@/lib/auth/supabase-auth-errors";
import { saveMinimalSupabaseProfile, saveSupabaseProfile } from "@/lib/supabase/save-profile";

function siretDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Supabase renvoie parfois un « succès » sans créer l'utilisateur si l'e-mail existe déjà. */
function signupLooksLikeDuplicate(user: { identities?: { identity_id: string }[] } | null | undefined): boolean {
  const identities = user?.identities;
  return Array.isArray(identities) && identities.length === 0;
}

async function signInExistingOrError(
  supabase: ReturnType<typeof createServerClient>,
  email: string,
  password: string,
): Promise<{ userId: string } | { error: string; status: number }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return {
      error: "Cet e-mail est déjà utilisé. Connecte-toi ou réinitialise ton mot de passe.",
      status: 400,
    };
  }
  return { userId: data.user.id };
}

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

    const admin = createAdminClient();
    let userId: string | undefined;
    let hasSession = false;

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      const alreadyExists =
        /already registered|already exists|User already registered/i.test(error.message) ||
        error.code === "user_already_exists";

      if (!alreadyExists) {
        const translated = translateSupabaseAuthError(error.message);
        const field = /mot de passe|password/i.test(translated) ? "password" : "email";
        trackRegister(false, translated);
        return NextResponse.json({ error: translated, field }, { status: 400 });
      }

      const existing = await signInExistingOrError(supabase, email, password);
      if ("error" in existing) {
        trackRegister(false, existing.error);
        return NextResponse.json({ error: existing.error }, { status: existing.status });
      }
      userId = existing.userId;
    } else if (!data.user?.id) {
      trackRegister(false, "Inscription incomplète — vérifiez votre e-mail.");
      return NextResponse.json({ error: "Inscription incomplète — vérifiez votre e-mail." }, { status: 400 });
    } else if (signupLooksLikeDuplicate(data.user)) {
      const existing = await signInExistingOrError(supabase, email, password);
      if ("error" in existing) {
        trackRegister(false, existing.error);
        return NextResponse.json({ error: existing.error }, { status: existing.status });
      }
      userId = existing.userId;
    } else {
      const { data: adminUser } = await admin.auth.admin.getUserById(data.user.id);
      if (!adminUser.user) {
        const existing = await signInExistingOrError(supabase, email, password);
        if ("error" in existing) {
          trackRegister(false, existing.error);
          return NextResponse.json({ error: existing.error }, { status: existing.status });
        }
        userId = existing.userId;
      } else {
        userId = data.user.id;
        hasSession = Boolean(data.session);
      }
    }

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

    let redirectTo: string | null = null;
    try {
      const demoCookie = (await cookies()).get("flowo_demo_id")?.value;
      const linked = await linkDemoQuoteToUser(userId, demoCookie);
      if (linked.devisId) {
        redirectTo = `/devis/${linked.devisId}?view=preview&from=demo`;
      }
    } catch (e) {
      console.error("[auth/register] demo link", e);
    }

    if (!hasSession && userId) {
      const { error: confirmError } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (confirmError) {
        console.error("[auth/register] Confirmation e-mail impossible:", confirmError.message);
        trackRegister(true);
        return NextResponse.json(
          {
            needsEmailConfirmation: true,
            message: "Compte créé. Confirme ton e-mail via le lien reçu avant de te connecter.",
            user: { id: userId, email, role: "user" },
          },
          { status: 200 },
        );
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !signInData.session) {
        console.error("[auth/register] Connexion auto après inscription:", signInError?.message ?? "session absente");
        trackRegister(true);
        return NextResponse.json(
          {
            user: { id: userId, email, role: "user" },
            message: "Compte créé. Tu peux te connecter.",
          },
          { status: 200 },
        );
      }
      hasSession = true;
    }

    if (!hasSession) {
      trackRegister(true);
      return NextResponse.json(
        {
          needsEmailConfirmation: true,
          message:
            "Compte créé. Consultez votre boîte e-mail et cliquez sur le lien de confirmation avant de vous connecter.",
          user: { id: userId, email, role: "user" },
        },
        { status: 200 },
      );
    }

    trackRegister(true);
    const successBody: Record<string, unknown> = {
      user: { id: userId, email, role: "user" },
    };
    if (redirectTo) successBody.redirect_to = redirectTo;

    const successRes = NextResponse.json(successBody, { status: 200 });
    if (redirectTo) {
      const devisId = redirectTo.split("/devis/")[1]?.split("?")[0];
      if (devisId) successRes.cookies.set(DEMO_DEVIS_COOKIE, devisId, demoDevisCookieOptions());
    }
    return successRes;
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
