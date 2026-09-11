import { buildFacturesFec } from "@/lib/compta/factures-export";
import { backendFetch } from "@/lib/backend/server";
import type { BackendFactureDetail, BackendMeResponse } from "@/types/backend";
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
    const [factures, me] = await Promise.all([
      loadFactures(),
      backendFetch("/api/auth/me") as Promise<BackendMeResponse>,
    ]);
    const fec = buildFacturesFec(factures, me.profile);
    return new NextResponse(fec, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="flowo-ecritures-ventes.txt"',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Non authentifié";
    return NextResponse.json({ message: msg }, { status: 401 });
  }
}
