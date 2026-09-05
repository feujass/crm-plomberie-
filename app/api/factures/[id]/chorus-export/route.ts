import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const data = await backendFetch(`/api/factures/${id}/chorus-export`);
    // Forcer le téléchargement (Safari iOS peut afficher une page blanche via "Impression élégante"/Reader)
    const pretty = JSON.stringify(data ?? {}, null, 2);
    return new NextResponse(pretty, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename=\"chorus-export-${id}.json\"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
