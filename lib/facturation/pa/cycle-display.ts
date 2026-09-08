import { FR_STATUS_LABELS } from "@/lib/facturation/pa/cycle-machine";
import type { StatutCycleVie } from "@/lib/facturation/pa/types";

export const MAX_REDEPOSITS = 3;
export const REDEPOSIT_STATUS_CODE = "flowo:redeposit";

const REJECTION_CODES = new Set(["fr:210", "fr:213", "fr:501"]);

const REASON_KEYS = [
  "reason",
  "motif",
  "comment",
  "commentaire",
  "message",
  "detail",
  "rejection_reason",
  "rejectReason",
  "rejectionReason",
] as const;

/** Libellés artisan — pas de jargon plateforme / AFNOR. */
export const CYCLE_STATUS_UI_LABELS: Record<StatutCycleVie, string> = {
  brouillon: "Brouillon",
  emise: "Émise",
  deposee: "Déposée",
  rejetee: "Refusée",
  irrecevable: "Rejetée",
  encaissee: "Encaissée",
};

export const CYCLE_STATUS_LIST_HINT: Partial<Record<StatutCycleVie, string>> = {
  rejetee: "Refusée — à corriger",
  irrecevable: "Rejetée — nouvelle facture",
};

const LOCAL_JOURNAL_LABELS: Record<string, string> = {
  [REDEPOSIT_STATUS_CODE]: "Renvoyée à l’identique",
  "api:sent": "Envoyée",
  "api:uploaded": "Téléversée",
  "api:validated": "Validée",
  "api:invalid": "Rejetée",
  "api:rejected": "Rejetée",
};

export function cycleStatusUiLabel(statut: string): string {
  return CYCLE_STATUS_UI_LABELS[statut as StatutCycleVie] ?? statut.replaceAll("_", " ");
}

export function journalEventLabel(statusCode: string): string {
  return FR_STATUS_LABELS[statusCode] ?? LOCAL_JOURNAL_LABELS[statusCode] ?? statusCode;
}

function isGenericStatusLabel(value: string, statusCode: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const official = FR_STATUS_LABELS[statusCode];
  if (official && trimmed.localeCompare(official, "fr", { sensitivity: "accent" }) === 0) return true;
  const generics = ["refusée", "refusee", "rejetée", "rejetee", "irrecevable"];
  return generics.includes(trimmed.toLowerCase());
}

export function rejectionReasonFromEvent(
  statusCode: string,
  payload: Record<string, unknown> | null | undefined,
  statusText?: string | null,
): string | null {
  if (!REJECTION_CODES.has(statusCode)) return null;
  const bag = payload ?? {};
  for (const key of REASON_KEYS) {
    const raw = bag[key];
    if (typeof raw === "string" && !isGenericStatusLabel(raw, statusCode)) {
      return raw.trim();
    }
  }
  const nested = bag.statusText;
  if (typeof nested === "string" && !isGenericStatusLabel(nested, statusCode)) {
    return nested.trim();
  }
  if (statusText && !isGenericStatusLabel(statusText, statusCode)) {
    return statusText.trim();
  }
  return null;
}

export function latestRejectionReason(
  events: readonly { statusCode: string; payload?: Record<string, unknown> | null }[],
): string | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    const reason = rejectionReasonFromEvent(event.statusCode, event.payload, undefined);
    if (reason) return reason;
  }
  return null;
}

export function countRedeposits(statusCodes: readonly string[]): number {
  return statusCodes.filter((code) => code === REDEPOSIT_STATUS_CODE).length;
}

export function redepositGate(
  statutCycleVie: string,
  redepositCount: number,
): { ok: true; remaining: number } | { ok: false; remaining: number; message: string } {
  const remaining = Math.max(0, MAX_REDEPOSITS - redepositCount);
  if (statutCycleVie !== "rejetee") {
    return {
      ok: false,
      remaining,
      message: "Seule une facture refusée par le client peut être renvoyée à l’identique.",
    };
  }
  if (redepositCount >= MAX_REDEPOSITS) {
    return {
      ok: false,
      remaining: 0,
      message:
        "Cette facture a déjà été renvoyée 3 fois. Ce n’est plus une erreur de manipulation : créez un avoir, puis une nouvelle facture.",
    };
  }
  return { ok: true, remaining };
}

export function latestInformationalAlert(
  events: readonly { statusCode: string }[],
): { statusCode: string; label: string } | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const code = events[i].statusCode;
    if (code === "fr:207" || code === "fr:211") {
      return { statusCode: code, label: journalEventLabel(code) };
    }
  }
  return null;
}
