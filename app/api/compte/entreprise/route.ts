import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { isAdresseComplete, proposerAdresseDepuisBlob } from "@/lib/facturation/adresse";
import { getEInvoicingProvider } from "@/lib/facturation/pa/get-provider";
import { syncConnectedVatRegime } from "@/lib/facturation/pa/sync-vat-regime";
import { parseRegimeTva } from "@/lib/facturation/regime-tva";
import { isValidSiren, isValidSiret } from "@/lib/legal/siren";
import { logoUrlValidationError } from "@/lib/security/logo-url";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

function revalidateCompteAll() {
  revalidatePath("/compte");
  revalidatePath("/compte/profil");
  revalidatePath("/compte/entreprise");
  revalidatePath("/compte/devis-apparence");
  revalidatePath("/compte/devis-regles");
  revalidatePath("/compte/e-facturation");
  revalidatePath("/accueil");
}

function parsePeriodicite(
  raw: unknown,
): "monthly" | "quarterly" | "simplified" | null {
  if (raw === "monthly" || raw === "quarterly" || raw === "simplified") return raw;
  return null;
}

type Body = {
  entreprise?: string;
  siret?: string | null;
  siren?: string | null;
  forme_juridique?: string | null;
  capital_social?: string | null;
  rcs_ville?: string | null;
  numero_tva_intracom?: string | null;
  regime_tva?: "encaissements" | "debits" | "franchise_293b" | null;
  tva_periodicite_declaration?: "monthly" | "quarterly" | "simplified" | "" | null;
  tva_sur_encaissements?: boolean | null;
  tva_sur_debits_opt_in?: boolean | null;
  decennale_mention?: string | null;
  iban?: string | null;
  bic?: string | null;
  adresse?: string | null;
  adresse_ligne1?: string | null;
  adresse_ligne2?: string | null;
  adresse_cp?: string | null;
  adresse_ville?: string | null;
  adresse_pays?: string | null;
  confirmer_adresse_structure?: boolean | null;
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

    const siren = String(raw.siren ?? "").trim() || null;
    const siret = String(raw.siret ?? "").trim() || null;
    if (siren && !isValidSiren(siren)) {
      return NextResponse.json({ message: "SIREN invalide (9 chiffres, clé Luhn)." }, { status: 400 });
    }
    if (siret && !isValidSiret(siret)) {
      return NextResponse.json({ message: "SIRET invalide (14 chiffres, clé Luhn)." }, { status: 400 });
    }

    const adresseBlob = String(raw.adresse ?? "").trim() || null;
    const structured = {
      adresse_ligne1: String(raw.adresse_ligne1 ?? "").trim() || null,
      adresse_ligne2: String(raw.adresse_ligne2 ?? "").trim() || null,
      adresse_cp: String(raw.adresse_cp ?? "").trim() || null,
      adresse_ville: String(raw.adresse_ville ?? "").trim() || null,
      adresse_pays: (String(raw.adresse_pays ?? "").trim() || "FR").toUpperCase(),
    };
    const complete = isAdresseComplete({
      ligne1: structured.adresse_ligne1 ?? "",
      ligne2: structured.adresse_ligne2 ?? "",
      cp: structured.adresse_cp ?? "",
      ville: structured.adresse_ville ?? "",
      pays: structured.adresse_pays,
    });
    const confirmee = raw.confirmer_adresse_structure === true && complete;

    await backendFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entreprise: String(raw.entreprise ?? "").trim() || null,
        siret,
        siren,
        forme_juridique: String(raw.forme_juridique ?? "").trim() || null,
        capital_social: String(raw.capital_social ?? "").trim() || null,
        rcs_ville: String(raw.rcs_ville ?? "").trim() || null,
        numero_tva_intracom: String(raw.numero_tva_intracom ?? "").trim() || null,
        regime_tva: parseRegimeTva(raw.regime_tva),
        tva_periodicite_declaration: parsePeriodicite(raw.tva_periodicite_declaration),
        decennale_mention: String(raw.decennale_mention ?? "").trim() || null,
        iban: String(raw.iban ?? "").trim() || null,
        bic: String(raw.bic ?? "").trim() || null,
        adresse: adresseBlob,
        ...structured,
        adresse_structure_proposition: proposerAdresseDepuisBlob(adresseBlob),
        adresse_structure_confirmee_at: confirmee ? new Date().toISOString() : undefined,
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
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await syncConnectedVatRegime(supabase, getEInvoicingProvider(), user.id);
      }
    } catch {
      /* PATCH PA optionnel — la fiche entreprise est déjà enregistrée */
    }
    revalidateCompteAll();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
