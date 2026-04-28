import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = {
  nom?: string;
  prenom?: string;
  email?: string;
  tel?: string;
  adresse?: string;
  type?: string;
  siret?: string;
  notes?: string;
  inactive?: boolean;
};

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  try {
    await backendFetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: String(raw.nom || "").trim(),
        prenom: String(raw.prenom || "").trim(),
        email: String(raw.email || "").trim(),
        tel: String(raw.tel || "").trim(),
        adresse: String(raw.adresse || "").trim(),
        type: String(raw.type || "particulier"),
        siret: String(raw.siret || "").trim(),
        notes: String(raw.notes || "").trim(),
        inactive: Boolean(raw.inactive),
      }),
    });

    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
