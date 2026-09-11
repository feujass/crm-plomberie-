import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { resolvePartnerForUser } from "@/lib/affiliate/server";
import { isSupabaseDataMode, supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";

export async function POST(req: Request) {
  if (!isSupabaseDataMode()) {
    return NextResponse.json({ error: "Connexion partenaire indisponible." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });
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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const partner = await resolvePartnerForUser(data.user.id, data.user.email);
  if (!partner || partner.status !== "active") {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error:
          "Aucun espace partenaire actif pour cet e-mail. Candidatez sur /affiliation ou activez votre accès après validation.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      displayName: partner.display_name,
      brandName: partner.brand_name,
    },
    redirectTo: "/partenaire",
  });
}
