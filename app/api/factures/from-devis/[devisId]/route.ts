import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ devisId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { devisId } = await ctx.params;

  try {
    const facture = (await backendFetch(`/api/factures/from-devis/${devisId}`, {
      method: "POST",
    })) as { id: string };

    revalidatePath("/facturation");
    revalidatePath("/devis");

    return NextResponse.json(facture);
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
