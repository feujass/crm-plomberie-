import type { RegimeTva } from "@/lib/facturation/regime-tva";

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
