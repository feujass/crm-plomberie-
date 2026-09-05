import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const data = await backendFetch(`/api/factures/${id}/transmissions/retry`, { method: "POST" });
    revalidatePath("/facturation");
    revalidatePath(`/facturation/${id}`);
    revalidatePath("/compte/conformite");
    return NextResponse.json(data);
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
