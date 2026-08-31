import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { logoUrlValidationError } from "@/lib/security/logo-url";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

function revalidateCompteAll() {
  revalidatePath("/compte");
  revalidatePath("/compte/profil");
  revalidatePath("/compte/entreprise");
  revalidatePath("/compte/devis-apparence");
  revalidatePath("/compte/devis-regles");
  revalidatePath("/accueil");
}

type Body = {
  entreprise?: string;
  siret?: string | null;
  siren?: string | null;
  forme_juridique?: string | null;
  capital_social?: string | null;
  rcs_ville?: string | null;
  numero_tva_intracom?: string | null;
  tva_sur_encaissements?: boolean | null;
  tva_sur_debits_opt_in?: boolean | null;
  decennale_mention?: string | null;
  iban?: string | null;
  bic?: string | null;
  adresse?: string | null;
  email_facturation?: string | null;
  logo_url?: string | null;
  mention_legale?: string | null;
  conditions_paiement?: string | null;
  specialites?: string | null;
  metier?: string | null;
  feature_flag_pdp?: boolean | null;
  feature_flag_ereporting?: boolean | null;
  feature_flag_chorus?: boolean | null;
  feature_flag_esign_advanced?: boolean | null;
};

export async function POST(req: Request) {
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  try {
    const logoRaw = String(raw.logo_url ?? "").trim() || null;
    const logoErr = logoUrlValidationError(logoRaw);
    if (logoErr) {
      return NextResponse.json({ message: logoErr }, { status: 400 });
    }

    await backendFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entreprise: String(raw.entreprise ?? "").trim() || null,
        siret: String(raw.siret ?? "").trim() || null,
        siren: String(raw.siren ?? "").trim() || null,
        forme_juridique: String(raw.forme_juridique ?? "").trim() || null,
        capital_social: String(raw.capital_social ?? "").trim() || null,
        rcs_ville: String(raw.rcs_ville ?? "").trim() || null,
        numero_tva_intracom: String(raw.numero_tva_intracom ?? "").trim() || null,
        tva_sur_encaissements:
          typeof raw.tva_sur_encaissements === "boolean" ? raw.tva_sur_encaissements : undefined,
        tva_sur_debits_opt_in:
          typeof raw.tva_sur_debits_opt_in === "boolean" ? raw.tva_sur_debits_opt_in : undefined,
        decennale_mention: String(raw.decennale_mention ?? "").trim() || null,
        iban: String(raw.iban ?? "").trim() || null,
        bic: String(raw.bic ?? "").trim() || null,
        adresse: String(raw.adresse ?? "").trim() || null,
        email_facturation: String(raw.email_facturation ?? "").trim() || null,
        logo_url: logoRaw,
        mention_legale: String(raw.mention_legale ?? "").trim() || null,
        conditions_paiement: String(raw.conditions_paiement ?? "").trim() || null,
        specialites: String(raw.specialites ?? "").trim() || null,
        metier: String(raw.metier ?? "").trim() || null,
        feature_flag_pdp: typeof raw.feature_flag_pdp === "boolean" ? raw.feature_flag_pdp : undefined,
        feature_flag_ereporting:
          typeof raw.feature_flag_ereporting === "boolean" ? raw.feature_flag_ereporting : undefined,
        feature_flag_chorus: typeof raw.feature_flag_chorus === "boolean" ? raw.feature_flag_chorus : undefined,
        feature_flag_esign_advanced:
          typeof raw.feature_flag_esign_advanced === "boolean" ? raw.feature_flag_esign_advanced : undefined,
      }),
    });
    revalidateCompteAll();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
