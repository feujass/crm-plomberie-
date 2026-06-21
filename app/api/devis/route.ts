import { normalizeLignesWithProfile } from "@/lib/devis-ouvrage-mode";
import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import type { BackendMeResponse, BackendProfile } from "@/types/backend";
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

      let profile: BackendProfile | undefined;
      try {
        const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
        profile = me.profile;
      } catch {
        profile = undefined;
      }

      const normalized = normalizeLignesWithProfile(
        lignesIn.map((l, i) => ({
          section: l.section,
          designation: l.designation,
          quantite: l.quantite,
          unite: l.unite,
          prix_ht: l.prix_ht,
          tva: l.tva,
          ordre: i,
        })),
        profile,
      );

      const devis = (await backendFetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id,
          notes,
          lignes: normalized.map((l) => ({
            section: l.section ?? "",
            designation: l.designation,
            quantite: l.quantite,
            unite: l.unite,
            prix_ht: l.prix_ht,
            tva: l.tva,
            ligne_type: l.ligne_type,
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
