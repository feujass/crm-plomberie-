import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

/** Concatène une note interne sans Server Action (E394). */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ message: "Texte vide" }, { status: 400 });
  }

  try {
    const d = (await backendFetch(`/api/devis/${id}/internal-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })) as { internal_notes?: string };

    revalidatePath("/devis");
    revalidatePath(`/devis/${id}`);

    return NextResponse.json({ ok: true, internal_notes: d.internal_notes ?? "" });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
