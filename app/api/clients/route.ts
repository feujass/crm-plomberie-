import { backendFetch } from "@/lib/backend/server";
import { deriveTypeClient, syncCategorieFiscaleFromType } from "@/lib/facturation/snapshots";
import { assertSirenOrSiretForPro } from "@/lib/legal/siren";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const nom = String(input.nom ?? "").trim();
  if (!nom) return NextResponse.json({ message: "Nom requis" }, { status: 400 });

  const type = String(input.type ?? "particulier");
  const secteurPublic = Boolean(input.secteur_public);
  const categorie = syncCategorieFiscaleFromType(
    type,
    secteurPublic,
    String(input.categorie_fiscale ?? "").trim() || null,
  );
  const typeClient = deriveTypeClient({ secteur_public: secteurPublic, categorie_fiscale: categorie });
  const ident = assertSirenOrSiretForPro({
    typeClient,
    siren: String(input.siren ?? ""),
    siret: String(input.siret ?? ""),
  });
  if (!ident.ok) return NextResponse.json({ message: ident.message }, { status: 400 });

  try {
    const created = await backendFetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom,
        prenom: String(input.prenom ?? ""),
        email: String(input.email ?? ""),
        tel: String(input.tel ?? ""),
        adresse: String(input.adresse ?? ""),
        type,
        siret: String(input.siret ?? ""),
        siren: String(input.siren ?? ""),
        tva_intracom: String(input.tva_intracom ?? ""),
        categorie_fiscale: categorie,
        secteur_public: secteurPublic,
        chorus_service_code: String(input.chorus_service_code ?? ""),
        notes: String(input.notes ?? ""),
      }),
    });
    return NextResponse.json(created);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur backend";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
