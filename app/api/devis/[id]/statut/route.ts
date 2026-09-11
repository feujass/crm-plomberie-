import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { notifyArtisanDevisDecisionFromSession } from "@/lib/notifications/trigger";
import type { BackendDevisDetail } from "@/types/backend";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

const ALLOWED = new Set(["envoye", "accepte", "archive", "refuse"]);

type Ctx = { params: Promise<{ id: string }> };

/** Remplace les actions serveur (PUT statut + revalidatePath) sans Flight / E394 */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let body: { statut?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }
  const statut = typeof body.statut === "string" ? body.statut.trim() : "";
  if (!statut || !ALLOWED.has(statut)) {
    return NextResponse.json({ message: "Statut invalide" }, { status: 400 });
  }

  try {
    await backendFetch(`/api/devis/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });

    let notify: { channels: string[]; errors: string[] } | undefined;
    if (statut === "accepte" || statut === "refuse") {
      try {
        const detail = (await backendFetch(`/api/devis/${id}`)) as BackendDevisDetail;
        notify = await notifyArtisanDevisDecisionFromSession(
          statut === "accepte" ? "devis_accepte" : "devis_refuse",
          {
            numero: detail.numero,
            clientLabel: detail.client_nom,
          },
        );
      } catch {
        notify = await notifyArtisanDevisDecisionFromSession(
          statut === "accepte" ? "devis_accepte" : "devis_refuse",
          { numero: id },
        );
      }
    }

    revalidatePath("/devis");
    revalidatePath(`/devis/${id}`);

    return NextResponse.json({ ok: true, notify });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
