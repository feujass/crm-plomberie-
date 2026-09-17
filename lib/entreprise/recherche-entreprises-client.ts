"use client";

import type { EntrepriseGouvResult } from "@/lib/entreprise/recherche-entreprises";

/** Appelle l'API route Next (évite CORS côté navigateur). */
export async function lookupEntrepriseBySiretClient(siret: string): Promise<EntrepriseGouvResult | null> {
  const digits = siret.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  try {
    const res = await fetch(`/api/entreprise/lookup?siret=${encodeURIComponent(digits)}`);
    if (!res.ok) return null;
    return (await res.json()) as EntrepriseGouvResult;
  } catch {
    return null;
  }
}
