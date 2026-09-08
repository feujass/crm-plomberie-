import { cloneFacture } from "@/lib/facturation/clone-facture";
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
    const created = await cloneFacture(gate.supabase, gate.user.id, id, "nouvelle");
    revalidatePath("/facturation");
    revalidatePath(`/facturation/${created.id}`);
    return NextResponse.json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur";
    const status = message.includes("introuvable") ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
}
