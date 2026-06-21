import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { setAuthCookies } from "@/lib/backend/cookies";
import { backendBaseUrl } from "@/lib/backend/config";
import { fastApiDetailMessage } from "@/lib/backend/fastApiDetail";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseDataMode, supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";
import { saveSupabaseProfile } from "@/lib/supabase/save-profile";

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
      error: "Cet e-mail est déjà utilisé. Connectez-vous ou réinitialisez votre mot de passe.",
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

  if (isSupabaseDataMode()) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const prenom = typeof body.prenom === "string" ? body.prenom.trim() : "";
    const nom = typeof body.nom === "string" ? body.nom.trim() : "";
    const tel = typeof body.tel === "string" ? body.tel.trim() : "";
    const entreprise = typeof body.entreprise === "string" ? body.entreprise.trim() : "";
    const siret = typeof body.siret === "string" ? body.siret.trim() : "";
    const adresse = typeof body.adresse === "string" ? body.adresse.trim() : "";

    if (!email || !prenom || !nom || !tel || !entreprise || !siret || !adresse) {
      return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caractères." }, { status: 400 });
    }
    if (siretDigits(siret).length !== 14) {
      return NextResponse.json({ error: "Le SIRET doit contenir 14 chiffres." }, { status: 400 });
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { prenom, nom } },
    });

    if (error) {
      const alreadyExists =
        /already registered|already exists|User already registered/i.test(error.message) ||
        error.code === "user_already_exists";

      if (!alreadyExists) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const existing = await signInExistingOrError(supabase, email, password);
      if ("error" in existing) {
        return NextResponse.json({ error: existing.error }, { status: existing.status });
      }
      userId = existing.userId;
    } else if (!data.user?.id) {
      return NextResponse.json({ error: "Inscription incomplète — vérifiez votre e-mail." }, { status: 400 });
    } else if (signupLooksLikeDuplicate(data.user)) {
      const existing = await signInExistingOrError(supabase, email, password);
      if ("error" in existing) {
        return NextResponse.json({ error: existing.error }, { status: existing.status });
      }
      userId = existing.userId;
    } else {
      const { data: adminUser } = await admin.auth.admin.getUserById(data.user.id);
      if (!adminUser.user) {
        const existing = await signInExistingOrError(supabase, email, password);
        if ("error" in existing) {
          return NextResponse.json({ error: existing.error }, { status: existing.status });
        }
        userId = existing.userId;
      } else {
        userId = data.user.id;
        hasSession = Boolean(data.session);
      }
    }

    await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
      user_metadata: { prenom, nom },
    });

    const profileResult = await saveSupabaseProfile(userId, body as Record<string, unknown>, email);
    if (!profileResult.ok) {
      return NextResponse.json(
        {
          error: `Impossible d'enregistrer le profil entreprise : ${profileResult.message}`,
        },
        { status: 503 },
      );
    }

    if (!hasSession) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        return NextResponse.json({ error: signInError.message }, { status: 401 });
      }
    }

    return NextResponse.json(
      {
        user: { id: userId, email, prenom, nom, role: "user" },
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
