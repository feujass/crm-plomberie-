import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type SaveBody = {
  client_id: string | null;
  notes: string | null;
  date_expiration: string | null;
  remise_type: "percent" | "fixed" | null;
  remise_value: number | null;
  lignes: Array<{
    section: string | null;
    designation: string;
    quantite: number;
    unite: string;
    prix_ht: number;
    tva: number;
    ordre?: number;
    ligne_type?: string;
  }>;
};

type Ctx = { params: Promise<{ id: string }> };

/**
 * Sauvegarde via Route Handler JSON (pas d’action serveur) pour éviter E394 /
 * « An unexpected response was received » sur le reducer `fetchServerAction`.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Corps de requête invalide" }, { status: 400 });
  }

  const remise_type =
    body.remise_type === "percent" ? "pourcentage" : body.remise_type === "fixed" ? "montant" : null;
  const remise_valeur = body.remise_value ?? 0;

  try {
    await backendFetch(`/api/devis/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: body.client_id,
        notes: body.notes ?? "",
        date_expiration: body.date_expiration,
        remise_type,
        remise_valeur,
      }),
    });

    await backendFetch(`/api/devis/${id}/lignes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        (body.lignes ?? []).map((l) => ({
          section: l.section ?? "",
          designation: l.designation,
          quantite: Number(l.quantite ?? 1),
          unite: l.unite,
          prix_ht: Number(l.prix_ht ?? 0),
          tva: Number(l.tva ?? 10),
        })),
      ),
    });

    revalidatePath("/devis");
    revalidatePath(`/devis/${id}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as BackendFetchError;
    const status = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status });
  }
}
