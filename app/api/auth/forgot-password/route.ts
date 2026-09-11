import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { backendBaseUrl } from "@/lib/backend/config";
import { fastApiDetailMessage } from "@/lib/backend/fastApiDetail";
import { sendPasswordResetEmail } from "@/lib/resend-mail";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseDataMode, publicSiteUrl, supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";

const GENERIC_SUCCESS =
  "Si un compte Flowo existe pour cette adresse, un e-mail avec un lien de réinitialisation vient d’être envoyé (vérifie aussi les courriers indésirables). Le lien est valable 1 heure.";

function isRateLimitError(message: string): boolean {
  return /rate limit|too many requests|over_email_send_rate_limit/i.test(message);
}

async function sendFlowoResetEmail(email: string, siteOrigin: string | undefined) {
  const site = (siteOrigin || publicSiteUrl()).replace(/\/+$/, "");
  const redirectTo = `${site}/reset-password`;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    if (isRateLimitError(error.message)) {
      return NextResponse.json(
        {
          error:
            "Limite d’envoi Supabase atteinte. Réessaie dans une heure ou utilise le lien affiché ci-dessous en développement.",
        },
        { status: 429 },
      );
    }
    console.warn("[forgot-password] Supabase generateLink:", error.message);
    return NextResponse.json({ message: GENERIC_SUCCESS });
  }

  const resetUrl = data?.properties?.action_link ?? null;
  let emailSent = false;
  if (resetUrl) {
    const sent = await sendPasswordResetEmail({ to: email, resetUrl });
    emailSent = sent.ok;
    if (!sent.ok) {
      console.warn("[forgot-password] E-mail non envoyé:", sent.error, "| URL (serveur) :", resetUrl);
    }
  }

  const dev = process.env.NODE_ENV === "development";
  return NextResponse.json({
    message: emailSent
      ? GENERIC_SUCCESS
      : "Lien de réinitialisation généré. En développement, utilise le lien ci-dessous si l’e-mail n’arrive pas.",
    email_sent: emailSent,
    ...(dev && resetUrl ? { dev_reset_url: resetUrl } : {}),
  });
}

async function forgotPasswordSupabaseFallback(email: string, siteOrigin: string | undefined) {
  const site = (siteOrigin || publicSiteUrl()).replace(/\/+$/, "");
  const redirectTo = `${site}/reset-password`;

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

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    console.warn("[forgot-password] resetPasswordForEmail:", error.message);
    if (isRateLimitError(error.message)) {
      return NextResponse.json(
        {
          error:
            "Trop de demandes d’e-mail récentes (limite Supabase). Attends environ 1 h, ou ajoute SUPABASE_SERVICE_ROLE_KEY dans .env.local pour envoyer via Resend.",
        },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: "Impossible d’envoyer l’e-mail pour le moment. Réessaie plus tard." }, { status: 503 });
  }

  const dev = process.env.NODE_ENV === "development";
  return NextResponse.json({
    message: GENERIC_SUCCESS,
    ...(dev
      ? {
          dev_note:
            "E-mail envoyé par Supabase (template par défaut). Pour un e-mail Flowo via Resend, ajoute SUPABASE_SERVICE_ROLE_KEY dans .env.local puis redémarre le serveur.",
        }
      : {}),
  });
}

async function forgotPasswordSupabase(email: string, siteOrigin?: string) {
  try {
    return await sendFlowoResetEmail(email, siteOrigin);
  } catch (adminError) {
    console.warn("[forgot-password] Admin client indisponible, fallback Supabase Auth:", adminError);
    return forgotPasswordSupabaseFallback(email, siteOrigin);
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; origin?: string } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const origin = typeof body?.origin === "string" ? body.origin.trim() : undefined;
  if (!email) {
    return NextResponse.json({ error: "Adresse e-mail requise" }, { status: 400 });
  }

  if (isSupabaseDataMode()) {
    return forgotPasswordSupabase(email, origin);
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
    res = await fetch(`${base}/api/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(process.env.INTERNAL_API_SECRET?.trim()
          ? { "X-Internal-Secret": process.env.INTERNAL_API_SECRET.trim() }
          : {}),
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: `Serveur injoignable (${base}). Démarre MongoDB puis : cd backend && uvicorn server:app --reload --host 127.0.0.1 --port 8000. (${cause})`,
      },
      { status: 503 },
    );
  }

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = fastApiDetailMessage(payload) ?? "Demande impossible";
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const token = typeof payload.token === "string" ? payload.token : null;
  const site = publicSiteUrl();
  const resetUrl = token ? `${site}/reset-password?token=${encodeURIComponent(token)}` : null;

  let emailSent = false;
  if (resetUrl) {
    const sent = await sendPasswordResetEmail({ to: email, resetUrl });
    emailSent = sent.ok;
    if (!sent.ok) {
      console.warn("[forgot-password] E-mail non envoyé:", sent.error, "| URL (serveur) :", resetUrl);
    }
  }

  const dev = process.env.NODE_ENV === "development";
  return NextResponse.json({
    message: GENERIC_SUCCESS,
    ...(dev && resetUrl ? { dev_reset_url: resetUrl } : {}),
    ...(dev && resetUrl && !emailSent ? {} : {}),
  });
}
