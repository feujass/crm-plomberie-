import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = {
  nom?: string;
  description?: string;
  type?: string;
  prix_ht?: number;
  unite?: string;
  tva?: number;
  tags?: string;
};

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const tagsRaw = typeof raw.tags === "string" ? raw.tags : "";
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  try {
    await backendFetch(`/api/ouvrages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: String(raw.nom || "").trim(),
        description: String(raw.description || "").trim(),
        type: String(raw.type || "ouvrage"),
        prix_ht: Number(raw.prix_ht ?? 0),
        unite: String(raw.unite || "forfait").trim(),
        tva: Number(raw.tva ?? 10),
        tags: tags.length ? tags : [],
      }),
    });

    revalidatePath("/catalogue");
    revalidatePath(`/catalogue/${id}`);
    return NextResponse.json({ redirect: "/catalogue" });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await backendFetch(`/api/ouvrages/${id}`, { method: "DELETE" });
    revalidatePath("/catalogue");
    return NextResponse.json({ redirect: "/catalogue" });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
