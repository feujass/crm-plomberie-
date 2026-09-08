import { IllegalCycleTransitionError } from "@/lib/facturation/pa/errors";
import type { StatutCycleVie } from "@/lib/facturation/pa/types";

const ALLOWED: Record<StatutCycleVie, readonly StatutCycleVie[]> = {
  brouillon: ["emise"],
  emise: ["deposee", "rejetee", "irrecevable", "encaissee"],
  deposee: ["rejetee", "irrecevable", "encaissee"],
  rejetee: ["deposee", "irrecevable"],
  irrecevable: [],
  encaissee: [],
};

export const STATUT_CYCLE_VIE_LABELS: Record<StatutCycleVie, string> = {
  brouillon: "Brouillon",
  emise: "Émise",
  deposee: "Déposée auprès de la PA",
  rejetee: "Refusée par le destinataire (corrigeable)",
  irrecevable: "Irrecevable (rejet définitif)",
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

/**
 * Effet Flowo d’un code de cycle.
 * - none : événement conservé, statut inchangé
 * - deposit : la facture est dans le circuit PA → deposee
 * - refuse : refus destinataire (fr:210) → rejetee, redépôt possible
 * - reject_final : rejet circuit / irrecevable (fr:213, fr:501) → irrecevable, terminal
 * - collect : paiement reçu (fr:212) → encaissee
 */
export type CycleEffect = "none" | "deposit" | "refuse" | "reject_final" | "collect";

export type FrLifecycleMapping = {
  code: string;
  label: string;
  effect: CycleEffect;
  /** Statut visé si la transition est licite ; null = aucun changement de statut. */
  target: StatutCycleVie | null;
  notes: string;
};

/**
 * Mapping officiel AFNOR / Super PDP (fr:200–fr:213, fr:501) → statut Flowo.
 * Ce n’est pas une machine à états côté PA : un événement s’ajoute.
 * Flowo en déduit au plus une transition de `statut_cycle_vie`.
 */
export const FR_LIFECYCLE_MAPPING: readonly FrLifecycleMapping[] = [
  {
    code: "fr:200",
    label: "Déposée",
    effect: "deposit",
    target: "deposee",
    notes: "Entrée dans le circuit. Flowo n’a pas d’état intermédiaire « en cours de dépôt ».",
  },
  {
    code: "fr:201",
    label: "Transmise",
    effect: "deposit",
    target: "deposee",
    notes: "Acheminement PA → PA destinataire. Toujours dans le circuit.",
  },
  {
    code: "fr:202",
    label: "Reçue",
    effect: "deposit",
    target: "deposee",
    notes: "Réception par la PA du destinataire.",
  },
  {
    code: "fr:203",
    label: "Mise à disposition",
    effect: "deposit",
    target: "deposee",
    notes: "Consultable par le destinataire.",
  },
  {
    code: "fr:204",
    label: "Prise en charge",
    effect: "deposit",
    target: "deposee",
    notes: "Le destinataire a ouvert / pris le document.",
  },
  {
    code: "fr:205",
    label: "Approuvée",
    effect: "deposit",
    target: "deposee",
    notes: "Accord métier. Pas encore un encaissement Flowo (attendre fr:212).",
  },
  {
    code: "fr:206",
    label: "Approuvée partiellement",
    effect: "deposit",
    target: "deposee",
    notes: "Accord partiel. Reste déposée ; pas de statut Flowo dédié.",
  },
  {
    code: "fr:207",
    label: "Contestée",
    effect: "none",
    target: null,
    notes: "Litige destinataire. Conservé en événement ; le statut Flowo ne change pas (pas un refus ni un paiement).",
  },
  {
    code: "fr:208",
    label: "En suspens",
    effect: "none",
    target: null,
    notes: "Attente destinataire / PA. Informel, pas de transition.",
  },
  {
    code: "fr:209",
    label: "Traitée",
    effect: "none",
    target: null,
    notes: "Clôture administrative côté destinataire, distincte du paiement reçu.",
  },
  {
    code: "fr:210",
    label: "Refusée",
    effect: "refuse",
    target: "rejetee",
    notes: "Refus du destinataire. Corrigeable : rejetee → deposee (nouvelle version / avoir + redépôt).",
  },
  {
    code: "fr:211",
    label: "Paiement émis",
    effect: "none",
    target: null,
    notes: "Le destinataire a initié le paiement. Flowo clôture uniquement sur fr:212 (paiement reçu).",
  },
  {
    code: "fr:212",
    label: "Paiement reçu",
    effect: "collect",
    target: "encaissee",
    notes: "Encaissement constaté. Terminal.",
  },
  {
    code: "fr:213",
    label: "Rejetée",
    effect: "reject_final",
    target: "irrecevable",
    notes: "Rejet par le circuit PA (règles, routage). Ce document est mort ; il faut une nouvelle facture.",
  },
  {
    code: "fr:501",
    label: "Irrecevable",
    effect: "reject_final",
    target: "irrecevable",
    notes: "Document non admissible (syntaxe, identité, schéma). Terminal pour cet identifiant.",
  },
];

const FR_EFFECTS = Object.fromEntries(FR_LIFECYCLE_MAPPING.map((row) => [row.code, row.effect])) as Record<
  string,
  CycleEffect
>;

/** Codes hors liste AFNOR (transport Super PDP) — pas des fr:*. */
const API_STATUS_EFFECT: Record<string, CycleEffect> = {
  "api:uploaded": "none",
  "api:validated": "none",
  "api:sent": "deposit",
  "api:invalid": "reject_final",
  "api:rejected": "reject_final",
};

export const FR_STATUS_EFFECT: Record<string, CycleEffect> = {
  ...FR_EFFECTS,
  ...API_STATUS_EFFECT,
};

export const FR_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  FR_LIFECYCLE_MAPPING.map((row) => [row.code, row.label]),
);

export function effectFromStatusCode(statusCode: string): CycleEffect {
  return FR_STATUS_EFFECT[statusCode] ?? "none";
}

export function nextStatutFromEffect(current: StatutCycleVie, effect: CycleEffect): StatutCycleVie {
  if (effect === "none") return current;
  if (effect === "deposit") {
    if (current === "brouillon" || current === "encaissee" || current === "irrecevable") return current;
    return "deposee";
  }
  if (effect === "refuse") {
    if (current === "brouillon" || current === "encaissee" || current === "irrecevable") return current;
    return "rejetee";
  }
  if (effect === "reject_final") {
    if (current === "brouillon" || current === "encaissee") return current;
    return "irrecevable";
  }
  if (current === "brouillon" || current === "irrecevable") return current;
  return "encaissee";
}

export function applyCycleEffect(current: StatutCycleVie, effect: CycleEffect): StatutCycleVie {
  const next = nextStatutFromEffect(current, effect);
  assertTransitionCycle(current, next);
  return next;
}
