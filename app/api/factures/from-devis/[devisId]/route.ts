import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { triggerArtisanNotification } from "@/lib/notifications/trigger";
import { assertFeatureApi, loadProfileForGating } from "@/lib/plans/require-feature";
import type { BackendFactureDetail } from "@/types/backend";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ devisId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { devisId } = await ctx.params;

  const profile = await loadProfileForGating();
  const blocked = assertFeatureApi(profile, "facturation");
  if (blocked) {
    return NextResponse.json({ message: blocked }, { status: 403 });
  }

  try {
    const facture = (await backendFetch(`/api/factures/from-devis/${devisId}`, {
      method: "POST",
    })) as { id: string };

    try {
      const detail = (await backendFetch(`/api/factures/${facture.id}`)) as BackendFactureDetail;
      triggerArtisanNotification("facture_cree", {
        numero: detail.numero,
        clientLabel: detail.client_nom,
        montantTtc: Number(detail.total_ttc ?? 0),
      });
    } catch {
      triggerArtisanNotification("facture_cree", { numero: facture.id });
    }

    revalidatePath("/facturation");
    revalidatePath("/devis");

    return NextResponse.json(facture);
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
