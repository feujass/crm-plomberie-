import { REGIME_TVA_LABELS, type RegimeTva } from "@/lib/facturation/regime-tva";

/**
 * Mapping régime TVA Flowo → Super PDP (`vat_regime` + `has_vat_on_debits`).
 *
 * Super PDP `vat_regime` est une **périodicité de déclaration PPF** :
 *   monthly | quarterly | simplified | vat_exemption
 * Ce n’est pas le régime d’exigibilité Flowo (encaissements | debits | franchise_293b).
 *
 * Saisie artisan : Compte → Entreprise → périodicité (`profiles.tva_periodicite_declaration`).
 * Tant qu’elle est nulle, on n’envoie pas `vat_regime` autre que `vat_exemption`
 * (déductible de la franchise 293 B). Les autres cas restent `incomplete`.
 */

export type SuperPdpVatRegime = "monthly" | "quarterly" | "simplified" | "vat_exemption";

export type TvaPeriodiciteDeclaration = "monthly" | "quarterly" | "simplified";

export type TvaMappingStatus = "complete" | "incomplete";

export interface SuperPdpVatMapping {
  vatRegime: SuperPdpVatRegime | null;
  hasVatOnDebits: boolean;
  status: TvaMappingStatus;
  /** Ce que Flowo ne peut pas encore remplir sans saisie artisan. */
  missing: string[];
}

export function mapRegimeTvaToSuperPdp(input: {
  regimeTva: RegimeTva;
  periodicite?: TvaPeriodiciteDeclaration | null;
}): SuperPdpVatMapping {
  const hasVatOnDebits = input.regimeTva === "debits";
  const missing: string[] = [];

  if (input.regimeTva === "franchise_293b") {
    return {
      vatRegime: "vat_exemption",
      hasVatOnDebits: false,
      status: "complete",
      missing: [],
    };
  }

  if (!input.periodicite) {
    missing.push("tva_periodicite_declaration");
    return {
      vatRegime: null,
      hasVatOnDebits,
      status: "incomplete",
      missing,
    };
  }

  return {
    vatRegime: input.periodicite,
    hasVatOnDebits,
    status: "complete",
    missing: [],
  };
}

export const TVA_PERIODICITE_LABELS: Record<TvaPeriodiciteDeclaration, string> = {
  monthly: "tous les mois (réel normal)",
  quarterly: "tous les trimestres (réel normal)",
  simplified: "selon le régime simplifié d’imposition",
};

/** Libellés métier pour l’écran artisan — jamais le mapping PA interne. */
export function artisanTvaSummary(regimeTva: RegimeTva, mapping: SuperPdpVatMapping): string[] {
  if (regimeTva === "franchise_293b") {
    return ["Vous êtes en franchise en base (article 293 B du CGI)."];
  }
  const lines = [`Vous êtes en ${REGIME_TVA_LABELS[regimeTva]}.`];
  if (mapping.vatRegime === "monthly" || mapping.vatRegime === "quarterly" || mapping.vatRegime === "simplified") {
    lines.push(`Vous déclarez la TVA ${TVA_PERIODICITE_LABELS[mapping.vatRegime]}.`);
  }
  return lines;
}
