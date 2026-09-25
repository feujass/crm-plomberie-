import { NextResponse } from "next/server";

import { backendFetch, type BackendFetchError } from "@/lib/backend/server";

/**
 * Délègue au backend FastAPI (MongoDB) — même données que l’accueil.
 * L’ancienne implémentation lisait Supabase (`factures` payées) et restait souvent à zéro.
 */
export async function GET() {
  try {
    const data = await backendFetch("/api/dashboard/rentabilite");
    return NextResponse.json(data);
  } catch (err) {
    const e = err as BackendFetchError;
    return NextResponse.json({ message: e.message ?? "Erreur serveur" }, { status: e.status ?? 502 });
  }
}
