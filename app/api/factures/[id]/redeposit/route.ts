import { EinvoicingError } from "@/lib/facturation/pa/errors";
import { getEInvoicingProvider } from "@/lib/facturation/pa/get-provider";
import { redepositRejectedInvoice } from "@/lib/facturation/pa/redeposit";
import { requireFactureMutation } from "@/lib/facturation/require-facture-mutation";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireFactureMutation();
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  try {
    const result = await redepositRejectedInvoice(gate.supabase, gate.user.id, id, getEInvoicingProvider().id);
    revalidatePath(`/facturation/${id}`);
    revalidatePath("/facturation");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof EinvoicingError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.httpStatus });
    }
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
