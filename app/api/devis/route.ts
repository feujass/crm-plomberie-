import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type LigneIn = {
  section?: string | null;
  designation: string;
  quantite?: number;
  unite?: string;
  prix_ht?: number;
  tva?: number;
};

/**
 * Création de devis sans Server Action (`createDraftDevis`, `createDevisFromIaAction`).
 * Réponse JSON `{ id }` + navigation côté client (évite E394 / reducer `fetchServerAction`).
 */
export async function POST(req: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const mode = raw.mode;

  try {
    if (mode === "draft") {
      const client_id = (raw.client_id as string | null) ?? null;
      const devis = (await backendFetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id,
          notes: "",
          date_expiration: null,
          remise_type: null,
          remise_valeur: 0,
          lignes: [],
        }),
      })) as { id: string };
      return NextResponse.json({ id: devis.id }, { status: 201 });
    }

    if (mode === "from_ia") {
      const client_id = (raw.client_id as string | null) ?? null;
      const notes = typeof raw.notes === "string" ? raw.notes : raw.notes == null ? "" : "";
      const lignesIn = Array.isArray(raw.lignes) ? (raw.lignes as LigneIn[]) : [];

      const devis = (await backendFetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id,
          notes,
          lignes: lignesIn.map((l) => ({
            section: l.section ?? "",
            designation: l.designation,
            quantite: Number(l.quantite ?? 1),
            unite: String(l.unite ?? "u"),
            prix_ht: Number(l.prix_ht ?? 0),
            tva: Number(l.tva ?? 10),
          })),
        }),
      })) as { id: string };

      revalidatePath("/devis");
      return NextResponse.json({ id: devis.id }, { status: 201 });
    }

    return NextResponse.json({ message: "mode requis (draft | from_ia)" }, { status: 400 });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
