import { flowoEmailLayout } from "@/lib/email/flowo-email-layout";
import { artisanRelanceEmailHtml } from "@/lib/email/relance-templates";
import { APP_NAME } from "@/lib/app-branding";
import {
  defaultNotificationPreferences,
  isNotificationEnabled,
  type NotificationEventId,
  type NotificationPreferences,
} from "@/lib/notifications/preferences";
import { normalizeFrenchPhone } from "@/lib/notifications/phone";
import { sendTwilioSms, sendTwilioWhatsApp } from "@/lib/notifications/twilio";
import { zeusWhatsAppBody, type ZeusMessageOpts } from "@/lib/notifications/zeus-messages";
import { sendDevisEmail } from "@/lib/resend-mail";

export type ArtisanNotifyContext = {
  artisanEmail?: string | null;
  artisanTel?: string | null;
  notificationPreferences?: NotificationPreferences;
};

function emailSubject(event: NotificationEventId, numero?: string): string | null {
  const n = numero?.trim() || "—";
  switch (event) {
    case "devis_cree":
      return `${APP_NAME} — Devis ${n} créé`;
    case "devis_accepte":
      return `${APP_NAME} — Devis ${n} accepté`;
    case "devis_refuse":
      return `${APP_NAME} — Devis ${n} refusé`;
    case "devis_relance":
      return `${APP_NAME} — Devis ${n} relancé`;
    case "facture_cree":
      return `${APP_NAME} — Facture ${n} créée`;
    case "facture_relance":
      return `${APP_NAME} — Facture ${n} en relance`;
    default:
      return null;
  }
}

function relanceEmailKind(event: NotificationEventId): "devis" | "facture" | null {
  if (event === "devis_relance") return "devis";
  if (event === "facture_relance") return "facture";
  return null;
}

export async function notifyArtisan(
  ctx: ArtisanNotifyContext,
  event: NotificationEventId,
  opts: ZeusMessageOpts = {},
): Promise<{ channels: string[]; errors: string[] }> {
  const prefs: NotificationPreferences =
    ctx.notificationPreferences ?? defaultNotificationPreferences();
  const channels: string[] = [];
  const errors: string[] = [];

  const subject = emailSubject(event, opts.numero);
  const relanceKind = relanceEmailKind(event);

  if (isNotificationEnabled(prefs, event, "email") && ctx.artisanEmail?.trim() && subject) {
    const html =
      relanceKind && opts.numero
        ? artisanRelanceEmailHtml({
            kind: relanceKind,
            numero: opts.numero,
            clientLabel: opts.clientLabel ?? "Client",
            relanceIndex: opts.relanceIndex ?? 0,
            relanceTotal: opts.relanceTotal ?? 1,
            clientNotified: opts.clientNotified ?? false,
          })
        : flowoEmailLayout({
            title: subject,
            preview: subject,
            bodyHtml: `<p style="margin:0 0 12px;">${zeusWhatsAppBody(event, opts).replace(/\n/g, "<br/>")}</p>`,
          });
    const res = await sendDevisEmail({ to: ctx.artisanEmail.trim(), subject, html });
    if (res.ok) channels.push("email");
    else errors.push(`email: ${res.error}`);
  }

  const telRaw = ctx.artisanTel?.trim();
  const tel = telRaw ? normalizeFrenchPhone(telRaw) : null;
  if (telRaw && !tel) errors.push("sms/whatsapp: numéro de téléphone invalide");
  const waBody = zeusWhatsAppBody(event, opts);

  if (tel && isNotificationEnabled(prefs, event, "sms")) {
    const res = await sendTwilioSms(tel, waBody);
    if (res.ok) channels.push("sms");
    else if (res.error !== "not_configured") errors.push(`sms: ${res.error}`);
  }

  if (isNotificationEnabled(prefs, event, "whatsapp")) {
    if (!tel) {
      errors.push("whatsapp: numéro manquant — renseignez-le dans Compte → Notifications");
    } else {
      const res = await sendTwilioWhatsApp(tel, waBody);
      if (res.ok) channels.push("whatsapp");
      else if (res.error !== "not_configured") errors.push(`whatsapp: ${res.error}`);
    }
  }

  if (isNotificationEnabled(prefs, event, "push")) {
    errors.push("push: nécessite l'app ouverte (non envoyé depuis le serveur)");
  }

  return { channels, errors };
}

/** Relances cron — compatibilité avec l'ancien nom. */
export async function notifyArtisanRelance(
  ctx: ArtisanNotifyContext,
  opts: {
    event: Extract<NotificationEventId, "devis_relance" | "facture_relance">;
    numero: string;
    clientLabel: string;
    relanceIndex: number;
    relanceTotal: number;
    clientNotified: boolean;
  },
) {
  return notifyArtisan(ctx, opts.event, {
    numero: opts.numero,
    clientLabel: opts.clientLabel,
    relanceIndex: opts.relanceIndex,
    relanceTotal: opts.relanceTotal,
    clientNotified: opts.clientNotified,
  });
}
