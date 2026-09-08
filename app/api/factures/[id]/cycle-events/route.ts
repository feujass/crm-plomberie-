import { listFactureCycleEvents } from "@/lib/facturation/pa/redeposit";
import { requireFactureMutation } from "@/lib/facturation/require-facture-mutation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireFactureMutation();
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  try {
    const events = await listFactureCycleEvents(gate.supabase, gate.user.id, id);
    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
