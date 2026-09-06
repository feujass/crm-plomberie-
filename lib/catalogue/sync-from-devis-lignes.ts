import {
  findBestCatalogueMatch,
  normalizeCatalogueText,
} from "@/lib/catalogue/apply-catalogue-prices";
import { backendFetch } from "@/lib/backend/server";
import { catalogueLimitMessage } from "@/lib/plans/limits";
import { loadSubscriptionContext } from "@/lib/plans/subscription-context";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BackendDevisLine, BackendOuvrage } from "@/types/backend";

export type SyncCatalogueResult = {
  added: number;
  skipped: number;
  skippedLimit: number;
  errors: string[];
};

function ouvrageTypeFromLigne(ligne_type?: string): string {
  if (ligne_type === "fourniture") return "fourniture";
  if (ligne_type === "pose") return "main_oeuvre";
  return "ouvrage";
}

function ligneToOuvragePayload(ligne: BackendDevisLine) {
  return {
    nom: String(ligne.designation || "").trim().slice(0, 200),
    description: String(ligne.section || "").trim().slice(0, 400),
    type: ouvrageTypeFromLigne(ligne.ligne_type),
    prix_ht: Number(ligne.prix_ht ?? 0),
    unite: String(ligne.unite || "u").trim() || "u",
    tva: Number(ligne.tva ?? 10),
    tags: [] as string[],
  };
}

/**
 * Ajoute au catalogue tarif les lignes de devis qui n’y figurent pas encore.
 * Best-effort : respecte les limites d’abonnement et ne bloque pas la création du devis.
 */
export async function syncDevisLignesToCatalogue(
  lignes: BackendDevisLine[],
  options?: { ouvrages?: BackendOuvrage[] },
): Promise<SyncCatalogueResult> {
  const result: SyncCatalogueResult = { added: 0, skipped: 0, skippedLimit: 0, errors: [] };

  const validLignes = lignes.filter((l) => String(l.designation || "").trim());
  if (!validLignes.length) return result;

  let ouvrages = options?.ouvrages;
  if (!ouvrages) {
    try {
      ouvrages = (await backendFetch("/api/ouvrages")) as BackendOuvrage[];
    } catch {
      ouvrages = [];
    }
  }

  const pendingKeys = new Set<string>();
  const toCreate: BackendDevisLine[] = [];

  for (const ligne of validLignes) {
    const designation = ligne.designation.trim();
    if (findBestCatalogueMatch(designation, ouvrages)) {
      result.skipped += 1;
      continue;
    }

    const key = normalizeCatalogueText(designation);
    if (!key || pendingKeys.has(key)) {
      result.skipped += 1;
      continue;
    }

    pendingKeys.add(key);
    toCreate.push(ligne);
  }

  if (!toCreate.length) return result;

  let ctx;
  try {
    ctx = await loadSubscriptionContext();
  } catch {
    result.errors.push("Contexte abonnement indisponible");
    return result;
  }

  let currentCount = ctx.ouvrageCount;

  for (let i = 0; i < toCreate.length; i++) {
    const ligne = toCreate[i]!;
    const limitMsg = catalogueLimitMessage(ctx.plan, currentCount, 1, ctx.profile);
    if (limitMsg) {
      result.skippedLimit = toCreate.length - i;
      break;
    }

    try {
      const created = (await backendFetch("/api/ouvrages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ligneToOuvragePayload(ligne)),
      })) as BackendOuvrage;

      result.added += 1;
      currentCount += 1;
      if (created?.nom) ouvrages.push(created);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur création ouvrage";
      result.errors.push(msg);
    }
  }

  return result;
}

/** Sync catalogue pour un userId donné (ex. rattachement démo LP) — best-effort, sans session. */
export async function syncDevisLignesToCatalogueForUser(
  userId: string,
  lignes: BackendDevisLine[],
): Promise<SyncCatalogueResult> {
  const result: SyncCatalogueResult = { added: 0, skipped: 0, skippedLimit: 0, errors: [] };
  const validLignes = lignes.filter((l) => String(l.designation || "").trim());
  if (!validLignes.length) return result;

  const admin = createAdminClient();
  const { data: existingRows } = await admin.from("ouvrages").select("*").eq("user_id", userId);
  const ouvrages: BackendOuvrage[] = (existingRows ?? []).map((row) => ({
    id: String(row.id),
    nom: String(row.nom ?? ""),
    description: (row.description as string) ?? undefined,
    type: (row.type as string) ?? undefined,
    prix_ht: row.prix_ht != null ? Number(row.prix_ht) : undefined,
    unite: (row.unite as string) ?? undefined,
    tva: row.tva != null ? Number(row.tva) : undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : undefined,
  }));

  const pendingKeys = new Set<string>();
  const toCreate: BackendDevisLine[] = [];

  for (const ligne of validLignes) {
    const designation = ligne.designation.trim();
    if (findBestCatalogueMatch(designation, ouvrages)) {
      result.skipped += 1;
      continue;
    }
    const key = normalizeCatalogueText(designation);
    if (!key || pendingKeys.has(key)) {
      result.skipped += 1;
      continue;
    }
    pendingKeys.add(key);
    toCreate.push(ligne);
  }

  for (const ligne of toCreate) {
    const payload = ligneToOuvragePayload(ligne);
    const { error } = await admin.from("ouvrages").insert({
      user_id: userId,
      nom: payload.nom,
      description: payload.description,
      type: payload.type,
      prix_ht: payload.prix_ht,
      unite: payload.unite,
      tva: payload.tva,
      tags: payload.tags,
    });
    if (error) {
      result.errors.push(error.message);
      continue;
    }
    result.added += 1;
    ouvrages.push({
      id: `pending-${result.added}`,
      nom: payload.nom,
      type: payload.type,
      prix_ht: payload.prix_ht,
      unite: payload.unite,
      tva: payload.tva,
    });
  }

  return result;
}
