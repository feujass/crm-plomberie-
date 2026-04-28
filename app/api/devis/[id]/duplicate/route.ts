import { NextResponse } from "next/server";

import { backendFetch, type BackendFetchError } from "@/lib/backend/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const src = (await backendFetch(`/api/devis/${id}`)) as {
      client_id?: string;
      notes?: string;
      internal_notes?: string;
      date_expiration?: string;
      remise_type?: string;
      remise_valeur?: number;
      lignes?: Array<{
        section?: string;
        designation: string;
        quantite?: number;
        unite?: string;
        prix_ht?: number;
        tva?: number;
      }>;
    };

    const copy = (await backendFetch("/api/devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: src.client_id ?? null,
        notes: src.notes ?? "",
        internal_notes: src.internal_notes ?? "",
        date_expiration: src.date_expiration ?? null,
        remise_type: src.remise_type ?? null,
        remise_valeur: src.remise_valeur ?? 0,
        lignes: (src.lignes ?? []).map((l) => ({
          section: l.section ?? "",
          designation: l.designation,
          quantite: Number(l.quantite ?? 1),
          unite: String(l.unite ?? "u"),
          prix_ht: Number(l.prix_ht ?? 0),
          tva: Number(l.tva ?? 10),
        })),
      }),
    })) as { id: string };

    return NextResponse.json({ id: copy.id });
  } catch (err) {
    const e = err as BackendFetchError;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: e.status ?? 502 });
  }
}
