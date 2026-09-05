import { buildFacturesComptaCsv } from "@/lib/compta/factures-export";
import { backendFetch } from "@/lib/backend/server";
import type { BackendFactureDetail } from "@/types/backend";
import { NextResponse } from "next/server";

async function loadFactures(): Promise<BackendFactureDetail[]> {
  const list = (await backendFetch("/api/factures")) as BackendFactureDetail[];
  const detailed = await Promise.all(
    (list ?? []).map(async (f) => {
      try {
        return (await backendFetch(`/api/factures/${f.id}`)) as BackendFactureDetail;
      } catch {
        return f;
      }
    }),
  );
  return detailed;
}

export async function GET() {
  try {
    const factures = await loadFactures();
    const csv = buildFacturesComptaCsv(factures);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="flowo-factures-compta.csv"',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Non authentifié";
    return NextResponse.json({ message: msg }, { status: 401 });
  }
}
