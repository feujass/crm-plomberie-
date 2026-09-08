import { EinvoicingError } from "@/lib/facturation/pa/errors";
import { ingestFacturePaEvents } from "@/lib/facturation/pa/submit-facture";
import { requireFactureMutation } from "@/lib/facturation/require-facture-mutation";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Poll ciblé d’une facture déjà déposée (UI 5 s / 30 s après le dépôt). */
export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireFactureMutation();
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  try {
    await ingestFacturePaEvents(gate.supabase, gate.user.id, id);
    revalidatePath(`/facturation/${id}`);
    revalidatePath("/facturation");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof EinvoicingError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.httpStatus });
    }
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
