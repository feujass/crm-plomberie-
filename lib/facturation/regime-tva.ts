export type RegimeTva = "encaissements" | "debits" | "franchise_293b";

export const REGIME_TVA_LABELS: Record<RegimeTva, string> = {
  encaissements: "TVA sur les encaissements",
  debits: "TVA sur les débits",
  franchise_293b: "Franchise en base (art. 293 B du CGI)",
};

export function parseRegimeTva(value: unknown): RegimeTva {
  if (value === "debits" || value === "franchise_293b" || value === "encaissements") return value;
  return "encaissements";
}

export function optionTvaDebitsFromRegime(regime: RegimeTva): boolean {
  return regime === "debits";
}

export function mentionFranchise293B(regime: RegimeTva): string | null {
  if (regime !== "franchise_293b") return null;
  return "TVA non applicable, art. 293 B du CGI";
}
