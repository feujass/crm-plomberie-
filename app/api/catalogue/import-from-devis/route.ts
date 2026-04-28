import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
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
    if (lignes.length) {
      await Promise.all(
        lignes.map((l) =>
          backendFetch("/api/ouvrages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nom: String(l.designation || "").slice(0, 200),
              description: String(l.section || "").slice(0, 400),
              type: "ouvrage",
              prix_ht: Number(l.prix_ht || 0),
              unite: String(l.unite || "u"),
              tva: Number(l.tva || 10),
              tags: [],
            }),
          }),
        ),
      );
    }
    revalidatePath("/catalogue");
    return NextResponse.json({ redirect: "/catalogue" });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
