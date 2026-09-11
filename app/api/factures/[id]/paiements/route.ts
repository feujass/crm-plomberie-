import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = {
  montant?: number;
  date?: string;
  mode?: "virement" | "cheque" | "especes" | "cb" | "autre";
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const montant = Number(raw.montant ?? 0);
  const mode = String(raw.mode || "virement") as "virement" | "cheque" | "especes" | "cb" | "autre";

  try {
    await backendFetch(`/api/factures/${id}/paiements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        montant,
        date: String(raw.date || new Date().toISOString().slice(0, 10)),
        mode,
      }),
    });

    revalidatePath("/facturation");
    revalidatePath(`/facturation/${id}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
