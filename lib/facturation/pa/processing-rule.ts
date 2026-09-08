import type { ProcessingRule } from "@/lib/facturation/pa/types";

/** B2C = particulier (e-reporting). B2B = entreprise / public (e-invoicing). */
export function processingRuleForTypeClient(typeClient: string): ProcessingRule {
  return typeClient === "particulier" ? "B2C" : "B2B";
}
