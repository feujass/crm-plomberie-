import type { NotificationEventId } from "@/lib/notifications/preferences";

/**
 * Codes de cycle qui ne changent pas `statut_cycle_vie` mais que l’artisan
 * doit voir : journal (`facture_cycle_events`) + notification.
 */
export const CYCLE_NOTIFICATION_BY_CODE: Readonly<Record<string, NotificationEventId>> = {
  "fr:207": "facture_contestee",
  "fr:211": "facture_paiement_emis",
};

export function cycleNotificationEvent(statusCode: string): NotificationEventId | null {
  return CYCLE_NOTIFICATION_BY_CODE[statusCode] ?? null;
}

export function isInformationalCycleSignal(statusCode: string): boolean {
  return cycleNotificationEvent(statusCode) !== null;
}
