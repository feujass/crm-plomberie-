import { NextResponse } from "next/server";

import { backendFetch, type BackendFetchError } from "@/lib/backend/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const clientId = url.searchParams.get("client_id") ?? "";
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (status) qs.set("status", status);
  if (clientId) qs.set("client_id", clientId);
  const path = `/api/chantiers${qs.toString() ? `?${qs.toString()}` : ""}`;

  try {
    const data = await backendFetch(path);
    return NextResponse.json(data);
  } catch (err) {
    const e = err as BackendFetchError;
    return NextResponse.json({ message: e.message ?? "Erreur serveur" }, { status: e.status ?? 502 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Body JSON invalide" }, { status: 400 });
  }
  try {
    const data = await backendFetch("/api/chantiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const e = err as BackendFetchError;
    return NextResponse.json({ message: e.message ?? "Erreur serveur" }, { status: e.status ?? 502 });
  }
}

