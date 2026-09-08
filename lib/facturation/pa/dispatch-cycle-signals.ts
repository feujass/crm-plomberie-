import { notifyArtisanForOwner } from "@/lib/notifications/trigger";
import { cycleNotificationEvent } from "@/lib/facturation/pa/cycle-signals";
import type { CycleInformationalSignal } from "@/lib/facturation/pa/ingest-events";

/** Envoie les notifs fr:207 / fr:211 via le système artisan existant. N’échoue jamais le poll. */
export async function dispatchCycleSignalNotifications(signals: CycleInformationalSignal[]): Promise<void> {
  for (const signal of signals) {
    const event = cycleNotificationEvent(signal.statusCode);
    if (!event) continue;
    try {
      await notifyArtisanForOwner(signal.userId, event, {
        numero: signal.numero ?? undefined,
      });
    } catch {
      continue;
    }
  }
}
