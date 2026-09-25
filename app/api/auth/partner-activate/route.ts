import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { findPartnerByEmail } from "@/lib/affiliate/server";
import { validatePassword } from "@/lib/security/password-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseDataMode, supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";

export async function POST(req: Request) {
  if (!isSupabaseDataMode()) {
    return NextResponse.json({ error: "Activation partenaire indisponible." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const passwordError = validatePassword(password);
  if (!email) {
    return NextResponse.json({ error: "E-mail requis." }, { status: 400 });
  }
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const partner = await findPartnerByEmail(email);
  if (!partner) {
    return NextResponse.json(
      { error: "Aucun partenaire actif pour cet e-mail. Attendez la validation de votre candidature." },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = listed.users.find((u) => u.email?.trim().toLowerCase() === email);

  if (existing) {
    return NextResponse.json(
      {
        error:
          "Un compte existe déjà pour cet e-mail. Connectez-vous sur l'espace partenaire ou réinitialisez votre mot de passe.",
        existingAccount: true,
      },
      { status: 409 },
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      prenom: partner.display_name.split(" ")[0] ?? partner.display_name,
      nom: partner.display_name.split(" ").slice(1).join(" ") || partner.brand_name,
      account_type: "partner",
    },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Création du compte impossible." }, { status: 400 });
  }

  await admin.from("affiliate_partners").update({ user_id: created.user.id }).eq("id", partner.id);

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

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json(
      {
        ok: true,
        message: "Compte créé. Connectez-vous avec votre mot de passe.",
        redirectTo: "/partenaire/connexion",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    redirectTo: "/partenaire",
  });
}
