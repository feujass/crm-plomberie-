import {
  loadArtisanNotifyContext,
  loadArtisanNotifyContextForOwner,
} from "@/lib/notifications/load-artisan-context";
import { notifyArtisan } from "@/lib/notifications/notify-artisan";
import type { NotificationEventId } from "@/lib/notifications/preferences";
import type { ZeusMessageOpts } from "@/lib/notifications/zeus-messages";
import { after } from "next/server";

function logNotifyDebug(
  event: NotificationEventId,
  payload: { channels: string[]; errors: string[] } | { error: unknown },
) {
  if (process.env.NODE_ENV === "production") return;
  if ("error" in payload) {
    console.warn("[Flowo notify]", event, payload.error);
    return;
  }
  if (payload.errors.length) {
    console.warn("[Flowo notify]", event, payload.errors);
  } else if (payload.channels.length) {
    console.info("[Flowo notify]", event, payload.channels);
  } else {
    console.warn("[Flowo notify]", event, "aucun canal envoyé (vérifiez préférences, tel, Twilio, Resend)");
  }
}

async function runArtisanNotification(
  load: () => Promise<Awaited<ReturnType<typeof loadArtisanNotifyContext>>>,
  event: NotificationEventId,
  opts: ZeusMessageOpts,
) {
  try {
    const ctx = await load();
    if (!ctx) {
      logNotifyDebug(event, { channels: [], errors: ["contexte artisan introuvable (session ou profil)"] });
      return { channels: [] as string[], errors: ["contexte artisan introuvable"] };
    }
    const result = await notifyArtisan(ctx, event, opts);
    logNotifyDebug(event, result);
    return result;
  } catch (error) {
    logNotifyDebug(event, { error });
    return { channels: [] as string[], errors: [error instanceof Error ? error.message : "Erreur notification"] };
  }
}

/** Envoie une notification artisan sans bloquer la réponse HTTP. */
export function triggerArtisanNotification(event: NotificationEventId, opts: ZeusMessageOpts = {}) {
  after(() => runArtisanNotification(() => loadArtisanNotifyContext(), event, opts));
}

/** Notification pour le propriétaire du devis (page publique client, sans session artisan). */
export function triggerArtisanNotificationForOwner(
  ownerUserId: string,
  event: NotificationEventId,
  opts: ZeusMessageOpts = {},
) {
  after(() => runArtisanNotification(() => loadArtisanNotifyContextForOwner(ownerUserId), event, opts));
}

/** Acceptation / refus client — envoi attendu pour ne pas perdre la notif. */
export async function notifyArtisanDevisDecision(
  ownerUserId: string,
  event: Extract<NotificationEventId, "devis_accepte" | "devis_refuse">,
  opts: ZeusMessageOpts = {},
) {
  return runArtisanNotification(() => loadArtisanNotifyContextForOwner(ownerUserId), event, opts);
}

/** Changement de statut depuis l’éditeur (session artisan). */
export async function notifyArtisanDevisDecisionFromSession(
  event: Extract<NotificationEventId, "devis_accepte" | "devis_refuse">,
  opts: ZeusMessageOpts = {},
) {
  return runArtisanNotification(() => loadArtisanNotifyContext(), event, opts);
}
