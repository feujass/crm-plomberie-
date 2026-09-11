import { devisRelanceEmailHtml, factureRelanceEmailHtml } from "@/lib/email/relance-templates";
import { buildClientEmailFrom, sanitizeReplyToEmail } from "@/lib/email/build-email-from";
import { notifyArtisanRelance } from "@/lib/notifications/dispatch-artisan";
import { sendDevisEmail } from "@/lib/resend-mail";
import type { CronRelanceDevisItem, CronRelanceFactureItem } from "@/lib/relances/cron-types";
import type { BackendProfile } from "@/types/backend";

function clientEmailProfile(item: Pick<CronRelanceDevisItem, "entreprise" | "email_facturation">): BackendProfile {
  return {
    entreprise: item.entreprise?.trim() || undefined,
    email_facturation: item.email_facturation?.trim() || undefined,
  };
}

export async function sendDevisRelanceToClient(
  site: string,
  item: CronRelanceDevisItem,
): Promise<boolean> {
  const email = item.client_email?.trim();
  if (!email || !item.public_token) return false;

  const publicUrl = `${site}/devis/public/${encodeURIComponent(item.public_token)}`;
  const numero = item.numero ?? "—";
  const entreprise = item.entreprise?.trim() || undefined;
  const profile = clientEmailProfile(item);
  const html = devisRelanceEmailHtml({
    numero,
    publicUrl,
    entreprise,
    relanceIndex: item.relance_index,
    relanceTotal: item.relance_total,
    daysAfterSend: item.days_after_send,
  });

  const res = await sendDevisEmail({
    to: email,
    subject: entreprise ? `${entreprise} — Rappel devis ${numero}` : `Rappel — Devis ${numero}`,
    html,
    from: buildClientEmailFrom(profile),
    replyTo: sanitizeReplyToEmail(profile.email_facturation),
  });
  return res.ok;
}

export async function sendFactureRelanceToClient(
  site: string,
  item: CronRelanceFactureItem,
): Promise<boolean> {
  const email = item.client_email?.trim();
  if (!email || !item.public_token) return false;

  const publicUrl = `${site}/f/${encodeURIComponent(item.public_token)}`;
  const numero = item.numero ?? "—";
  const html = factureRelanceEmailHtml({
    numero,
    publicUrl,
    relanceIndex: item.relance_index,
    relanceTotal: item.relance_total,
    daysAfterDue: item.days_after_due,
  });

  const res = await sendDevisEmail({
    to: email,
    subject: `Relance — Facture ${numero}`.trim(),
    html,
  });
  return res.ok;
}

export async function notifyArtisanAfterDevisRelance(
  item: CronRelanceDevisItem,
  clientNotified: boolean,
) {
  return notifyArtisanRelance(
    {
      artisanEmail: item.artisan_email,
      artisanTel: item.artisan_tel,
      notificationPreferences: item.notification_preferences,
    },
    {
      event: "devis_relance",
      numero: item.numero ?? "—",
      clientLabel: item.client_nom ?? "Client",
      relanceIndex: item.relance_index,
      relanceTotal: item.relance_total,
      clientNotified,
    },
  );
}

export async function notifyArtisanAfterFactureRelance(
  item: CronRelanceFactureItem,
  clientNotified: boolean,
) {
  return notifyArtisanRelance(
    {
      artisanEmail: item.artisan_email,
      artisanTel: item.artisan_tel,
      notificationPreferences: item.notification_preferences,
    },
    {
      event: "facture_relance",
      numero: item.numero ?? "—",
      clientLabel: item.client_nom ?? "Client",
      relanceIndex: item.relance_index,
      relanceTotal: item.relance_total,
      clientNotified,
    },
  );
}
