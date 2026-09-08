import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { isAdresseComplete } from "@/lib/facturation/adresse";
import { deriveTypeClient, syncCategorieFiscaleFromType } from "@/lib/facturation/snapshots";
import { assertSirenOrSiretForPro } from "@/lib/legal/siren";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = {
  nom?: string;
  prenom?: string;
  email?: string;
  tel?: string;
  adresse?: string;
  type?: string;
  siret?: string;
  siren?: string;
  tva_intracom?: string;
  categorie_fiscale?: string;
  secteur_public?: boolean;
  chorus_service_code?: string;
  notes?: string;
  inactive?: boolean;
  adresse_facturation_ligne1?: string;
  adresse_facturation_ligne2?: string;
  adresse_facturation_cp?: string;
  adresse_facturation_ville?: string;
  adresse_facturation_pays?: string;
  adresse_livraison_ligne1?: string;
  adresse_livraison_ligne2?: string;
  adresse_livraison_cp?: string;
  adresse_livraison_ville?: string;
  adresse_livraison_pays?: string;
  confirmer_adresse_structure?: boolean;
};

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

    const type = String(raw.type || "particulier");
    const secteurPublic = Boolean(raw.secteur_public);
    const categorie = syncCategorieFiscaleFromType(
      type,
      secteurPublic,
      String(raw.categorie_fiscale || "").trim() || null,
    );
    const typeClient = deriveTypeClient({ secteur_public: secteurPublic, categorie_fiscale: categorie });
    const ident = assertSirenOrSiretForPro({
      typeClient,
      siren: String(raw.siren || ""),
      siret: String(raw.siret || ""),
    });
    if (!ident.ok) {
      return NextResponse.json({ message: ident.message }, { status: 400 });
    }

    const facturationComplete = isAdresseComplete({
      ligne1: String(raw.adresse_facturation_ligne1 || ""),
      ligne2: String(raw.adresse_facturation_ligne2 || ""),
      cp: String(raw.adresse_facturation_cp || ""),
      ville: String(raw.adresse_facturation_ville || ""),
      pays: String(raw.adresse_facturation_pays || "FR"),
    });

    try {
    await backendFetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: String(raw.nom || "").trim(),
        prenom: String(raw.prenom || "").trim(),
        email: String(raw.email || "").trim(),
        tel: String(raw.tel || "").trim(),
        adresse: String(raw.adresse || "").trim(),
        type,
        siret: String(raw.siret || "").trim(),
        siren: String(raw.siren || "").trim(),
        tva_intracom: String(raw.tva_intracom || "").trim(),
        categorie_fiscale: categorie,
        secteur_public: secteurPublic,
        chorus_service_code: String(raw.chorus_service_code || "").trim(),
        notes: String(raw.notes || "").trim(),
        inactive: Boolean(raw.inactive),
        adresse_facturation_ligne1: String(raw.adresse_facturation_ligne1 || "").trim() || null,
        adresse_facturation_ligne2: String(raw.adresse_facturation_ligne2 || "").trim() || null,
        adresse_facturation_cp: String(raw.adresse_facturation_cp || "").trim() || null,
        adresse_facturation_ville: String(raw.adresse_facturation_ville || "").trim() || null,
        adresse_facturation_pays: String(raw.adresse_facturation_pays || "FR").trim() || "FR",
        adresse_livraison_ligne1: String(raw.adresse_livraison_ligne1 || "").trim() || null,
        adresse_livraison_ligne2: String(raw.adresse_livraison_ligne2 || "").trim() || null,
        adresse_livraison_cp: String(raw.adresse_livraison_cp || "").trim() || null,
        adresse_livraison_ville: String(raw.adresse_livraison_ville || "").trim() || null,
        adresse_livraison_pays: String(raw.adresse_livraison_pays || "").trim() || null,
        adresse_structure_confirmee_at:
          raw.confirmer_adresse_structure === true && facturationComplete ? new Date().toISOString() : undefined,
      }),
    });

    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
