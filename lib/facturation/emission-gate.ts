import { isAdresseComplete, type AdresseStructuree } from "@/lib/facturation/adresse";
import type { RegimeTva } from "@/lib/facturation/regime-tva";
import type { SnapshotClient, SnapshotEmetteur } from "@/lib/facturation/snapshots";
import type { NatureOperation } from "@/lib/facturation/type-ligne";
import { assertSirenOrSiretForPro } from "@/lib/legal/siren";

export type EmissionFacturXBlocker =
  | "adresse_emetteur"
  | "adresse_client"
  | "siren_client"
  | "periode_prestation"
  | "snapshot"
  | "numero";

export const FACTURX_BLOCKER_LABEL: Record<EmissionFacturXBlocker, string> = {
  adresse_emetteur: "Adresse de l’émetteur incomplète ou non confirmée.",
  adresse_client: "Adresse du client incomplète ou non confirmée.",
  siren_client: "SIREN ou SIRET du client professionnel / public manquant ou invalide.",
  periode_prestation: "Période de prestation obligatoire pour une opération de services ou mixte.",
  snapshot: "Identité émetteur / client non figée (snapshot manquant).",
  numero: "La facture n’a pas encore de numéro (brouillon).",
};

export function blockersEmissionFacturX(input: {
  emetteurAdresse: AdresseStructuree | null;
  emetteurConfirmeeAt: string | null | undefined;
  clientType: "particulier" | "entreprise" | "public";
  clientAdresse: AdresseStructuree | null;
  clientConfirmeeAt: string | null | undefined;
  natureOperation: NatureOperation | null | undefined;
  datePrestationDebut: string | null | undefined;
  datePrestationFin: string | null | undefined;
  regimeTva: RegimeTva;
  snapshotEmetteur?: SnapshotEmetteur | null;
  snapshotClient?: SnapshotClient | null;
  numero?: string | null;
}): EmissionFacturXBlocker[] {
  const out: EmissionFacturXBlocker[] = [];
  if (!input.emetteurConfirmeeAt || !isAdresseComplete(input.emetteurAdresse)) {
    out.push("adresse_emetteur");
  }
  if (input.clientType !== "particulier") {
    if (!input.clientConfirmeeAt || !isAdresseComplete(input.clientAdresse)) {
      out.push("adresse_client");
    }
    if (input.snapshotClient) {
      const sirenCheck = assertSirenOrSiretForPro({
        typeClient: input.clientType,
        siren: input.snapshotClient.siren,
        siret: input.snapshotClient.siret,
      });
      if (!sirenCheck.ok) out.push("siren_client");
    }
  }
  if (
    (input.natureOperation === "services" || input.natureOperation === "mixte") &&
    (!input.datePrestationDebut || !input.datePrestationFin)
  ) {
    out.push("periode_prestation");
  }
  if (input.snapshotEmetteur !== undefined || input.snapshotClient !== undefined) {
    if (!input.snapshotEmetteur || !input.snapshotClient) {
      out.push("snapshot");
    }
  }
  if (input.numero !== undefined && !String(input.numero ?? "").trim()) {
    out.push("numero");
  }
  return out;
}

export function clientExcluEinvoicing(typeClient: "particulier" | "entreprise" | "public"): boolean {
  return typeClient === "particulier";
}

export function eligibilityFacturX(input: Parameters<typeof blockersEmissionFacturX>[0] & {
  clientType: "particulier" | "entreprise" | "public";
}): { ok: true } | { ok: false; reason: string; blockers: EmissionFacturXBlocker[] } {
  if (clientExcluEinvoicing(input.clientType)) {
    return {
      ok: false,
      reason: "Les factures aux particuliers sont hors périmètre de la facturation électronique (B2C).",
      blockers: [],
    };
  }
  const blockers = blockersEmissionFacturX(input);
  if (blockers.length > 0) {
    return {
      ok: false,
      reason: blockers.map((b) => FACTURX_BLOCKER_LABEL[b]).join(" "),
      blockers,
    };
  }
  return { ok: true };
}
