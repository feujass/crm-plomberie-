import { backendFetch } from "@/lib/backend/server";
import { NextResponse } from "next/server";

export async function GET() {
  // Le reste de l'app s'authentifie via le backend (cookie access_token) :
  // on utilise donc le backend plutôt que Supabase direct.
  let rows: Array<{
    numero?: string;
    statut?: string;
    date_emission?: string;
    date_echeance?: string;
    total_ht?: number;
    total_tva?: number;
    total_ttc?: number;
  }> = [];
  try {
    rows = (await backendFetch("/api/factures")) as typeof rows;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Non authentifié";
    return NextResponse.json({ message: msg }, { status: 401 });
  }

  const header = ["numero", "statut", "date_emission", "date_echeance", "total_ht", "total_tva", "total_ttc"];
  const lines = [header.join(";")];
  for (const r of rows ?? []) {
    lines.push(
      [r.numero, r.statut, r.date_emission, r.date_echeance ?? "", r.total_ht, r.total_tva, r.total_ttc].join(";")
    );
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="factures.csv"',
    },
  });
}
