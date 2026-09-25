import { NextResponse } from "next/server";

import { backendFetch, type BackendFetchError } from "@/lib/backend/server";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await backendFetch(`/api/devis/${id}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as BackendFetchError;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: e.status ?? 502 });
  }
}
