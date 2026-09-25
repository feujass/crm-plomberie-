import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = { action?: string };

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }
  const action = String(raw.action || "init").trim();
  try {
    const data = await backendFetch(`/api/devis/${id}/esign-stub`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    revalidatePath("/devis");
    revalidatePath(`/devis/${id}`);
    return NextResponse.json(data);
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
