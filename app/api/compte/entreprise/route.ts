import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
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
  adresse?: string | null;
  email_facturation?: string | null;
  logo_url?: string | null;
  mention_legale?: string | null;
  conditions_paiement?: string | null;
};

export async function POST(req: Request) {
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  try {
    await backendFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entreprise: String(raw.entreprise ?? "").trim() || null,
        siret: String(raw.siret ?? "").trim() || null,
        adresse: String(raw.adresse ?? "").trim() || null,
        email_facturation: String(raw.email_facturation ?? "").trim() || null,
        logo_url: String(raw.logo_url ?? "").trim() || null,
        mention_legale: String(raw.mention_legale ?? "").trim() || null,
        conditions_paiement: String(raw.conditions_paiement ?? "").trim() || null,
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
