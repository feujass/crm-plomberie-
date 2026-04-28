import { NextResponse } from "next/server";

import { backendFetch, type BackendFetchError } from "@/lib/backend/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const data = await backendFetch(`/api/chantiers/${id}`);
    return NextResponse.json(data);
  } catch (err) {
    const e = err as BackendFetchError;
    return NextResponse.json({ message: e.message ?? "Erreur serveur" }, { status: e.status ?? 502 });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Body JSON invalide" }, { status: 400 });
  }
  try {
    const data = await backendFetch(`/api/chantiers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (err) {
    const e = err as BackendFetchError;
    return NextResponse.json({ message: e.message ?? "Erreur serveur" }, { status: e.status ?? 502 });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const data = await backendFetch(`/api/chantiers/${id}`, { method: "DELETE" });
    return NextResponse.json(data);
  } catch (err) {
    const e = err as BackendFetchError;
    return NextResponse.json({ message: e.message ?? "Erreur serveur" }, { status: e.status ?? 502 });
  }
}

