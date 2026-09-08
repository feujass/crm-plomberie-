import { IllegalCycleTransitionError } from "@/lib/facturation/pa/errors";
import type { StatutCycleVie } from "@/lib/facturation/pa/types";

const ALLOWED: Record<StatutCycleVie, readonly StatutCycleVie[]> = {
  brouillon: ["emise"],
  emise: ["deposee", "rejetee", "encaissee"],
  deposee: ["rejetee", "encaissee"],
  rejetee: ["deposee"],
  encaissee: [],
};

export const STATUT_CYCLE_VIE_LABELS: Record<StatutCycleVie, string> = {
  brouillon: "Brouillon",
  emise: "Émise",
  deposee: "Déposée auprès de la PA",
  rejetee: "Rejetée par la PA",
  encaissee: "Encaissée (cycle clôturé)",
};

export function isStatutCycleVie(value: string): value is StatutCycleVie {
  return value in ALLOWED;
}

export function canTransitionCycle(from: StatutCycleVie, to: StatutCycleVie): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function assertTransitionCycle(from: StatutCycleVie, to: StatutCycleVie): void {
  if (!canTransitionCycle(from, to)) {
    throw new IllegalCycleTransitionError(from, to);
  }
}

export type CycleEffect = "none" | "deposit" | "reject" | "collect";

/**
 * Codes officiels FR (spec Super PDP / AFNOR) → effet Flowo.
 * Ce n’est pas une machine à états côté PA : un événement s’ajoute.
 * Flowo en déduit au plus une transition de `statut_cycle_vie`.
 */
export const FR_STATUS_EFFECT: Record<string, CycleEffect> = {
  "fr:200": "deposit",
  "fr:201": "deposit",
  "fr:202": "deposit",
  "fr:203": "deposit",
  "fr:204": "deposit",
  "fr:205": "deposit",
  "fr:206": "deposit",
  "fr:207": "none",
  "fr:208": "none",
  "fr:209": "none",
  "fr:210": "reject",
  "fr:211": "none",
  "fr:212": "collect",
  "fr:213": "reject",
  "fr:501": "reject",
  "api:uploaded": "none",
  "api:validated": "none",
  "api:sent": "deposit",
  "api:invalid": "reject",
  "api:rejected": "reject",
};

export const FR_STATUS_LABELS: Record<string, string> = {
  "fr:200": "Déposée",
  "fr:201": "Transmise",
  "fr:202": "Reçue",
  "fr:203": "Mise à disposition",
  "fr:204": "Prise en charge",
  "fr:205": "Approuvée",
  "fr:206": "Approuvée partiellement",
  "fr:207": "Contestée",
  "fr:208": "En suspens",
  "fr:209": "Traitée",
  "fr:210": "Refusée",
  "fr:211": "Paiement émis",
  "fr:212": "Paiement reçu",
  "fr:213": "Rejetée",
  "fr:501": "Irrecevable",
};

export function effectFromStatusCode(statusCode: string): CycleEffect {
  return FR_STATUS_EFFECT[statusCode] ?? "none";
}

export function nextStatutFromEffect(current: StatutCycleVie, effect: CycleEffect): StatutCycleVie {
  if (effect === "none") return current;
  if (effect === "deposit") {
    if (current === "brouillon") return current;
    if (current === "encaissee") return current;
    return "deposee";
  }
  if (effect === "reject") {
    if (current === "brouillon" || current === "encaissee") return current;
    return "rejetee";
  }
  if (current === "brouillon") return current;
  return "encaissee";
}

export function applyCycleEffect(current: StatutCycleVie, effect: CycleEffect): StatutCycleVie {
  const next = nextStatutFromEffect(current, effect);
  assertTransitionCycle(current, next);
  return next;
}
