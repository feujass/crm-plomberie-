import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { syncDevisLignesToCatalogue } from "@/lib/catalogue/sync-from-devis-lignes";
import { revalidatePath } from "next/cache";
import type { BackendDevisDetail } from "@/types/backend";
import { NextResponse } from "next/server";

/** Import catalogue depuis un devis — sans Server Action (évite réponses non‑Flight / E394). */
export async function POST(req: Request) {
  let raw: { devis_id?: string };
  try {
    raw = (await req.json()) as { devis_id?: string };
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }
  const devisId = String(raw.devis_id || "").trim();
  if (!devisId) return NextResponse.json({ message: "devis_id requis" }, { status: 400 });

  try {
    const devis = (await backendFetch(`/api/devis/${devisId}`)) as BackendDevisDetail;
    const lignes = devis.lignes ?? [];
    const sync = lignes.length ? await syncDevisLignesToCatalogue(lignes) : { added: 0, skipped: 0, skippedLimit: 0, errors: [] };

    revalidatePath("/catalogue");
    return NextResponse.json({
      redirect: "/catalogue",
      added: sync.added,
      skipped: sync.skipped,
      skippedLimit: sync.skippedLimit,
    });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
