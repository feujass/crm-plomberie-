import type { ProcessingRule } from "@/lib/facturation/pa/types";

/** B2C = particulier (e-reporting Flowo). B2B = entreprise / public.
 *  Ne pas envoyer à Super PDP : la PA calcule processing_rule et rejette toute divergence. */
export function processingRuleForTypeClient(typeClient: string): ProcessingRule {
  return typeClient === "particulier" ? "B2C" : "B2B";
}
