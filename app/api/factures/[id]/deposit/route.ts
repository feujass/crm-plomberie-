import { EinvoicingError, InvoiceValidationError } from "@/lib/facturation/pa/errors";
import { submitFactureToPa } from "@/lib/facturation/pa/submit-facture";
import { requireFactureMutation } from "@/lib/facturation/require-facture-mutation";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireFactureMutation();
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  try {
    const result = await submitFactureToPa(gate.supabase, gate.user.id, id);
    revalidatePath(`/facturation/${id}`);
    revalidatePath("/facturation");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof InvoiceValidationError) {
      return NextResponse.json(
        { message: error.message, code: error.code, failures: error.failures },
        { status: error.httpStatus },
      );
    }
    if (error instanceof EinvoicingError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.httpStatus });
    }
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
