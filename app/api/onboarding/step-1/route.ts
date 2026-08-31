import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { logoUrlValidationError } from "@/lib/security/logo-url";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = {
  prenom?: string;
  nom?: string;
  entreprise_nom?: string;
  metier?: string;
  logo_url?: string | null;
  siret?: string | null;
  adresse?: string | null;
  tel?: string | null;
  email_facturation?: string | null;
};

export async function POST(req: Request) {
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const prenom = String(raw.prenom || "").trim();
  const nom = String(raw.nom || "").trim();
  const entreprise = String(raw.entreprise_nom || "").trim();
  const metier = String(raw.metier || "artisan_btp").trim();
  const siret = String(raw.siret || "").trim();
  const adresse = String(raw.adresse || "").trim();
  const tel = String(raw.tel || "").trim();

  if (!prenom || !nom || !entreprise || !tel) {
    return NextResponse.json({ message: "Prénom, nom, entreprise et téléphone requis." }, { status: 400 });
  }
  if (siret && siret.replace(/\D/g, "").length !== 14) {
    return NextResponse.json({ message: "Le SIRET doit contenir 14 chiffres." }, { status: 400 });
  }

  const logo_url = raw.logo_url === undefined || raw.logo_url === "" ? null : String(raw.logo_url).trim() || null;
  const logoErr = logoUrlValidationError(logo_url);
  if (logoErr) {
    return NextResponse.json({ message: logoErr }, { status: 400 });
  }

  try {
    await backendFetch("/api/auth/me");
    await backendFetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenom, nom }),
    });

    await backendFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entreprise: entreprise || null,
        metier,
        specialites: metier,
        logo_url,
        siret: siret ? siret.replace(/\D/g, "") : null,
        adresse: adresse || null,
        tel: tel || null,
        email_facturation: String(raw.email_facturation || "").trim() || null,
        onboarding_step: 1,
        onboarding_complete: false,
      }),
    });

    revalidatePath("/onboarding");
    return NextResponse.json({ redirect: "/onboarding/step-2" });
  } catch (err) {
    const e = err as BackendFetchError & { message?: string };
    if (e.message === "Non authentifié") {
      return NextResponse.json({ message: e.message }, { status: 401 });
    }
    const http =
      typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
