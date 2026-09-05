import { ASSISTANT_DISPLAY_NAME } from "@/lib/assistant-branding";
import type { NotificationEventId } from "@/lib/notifications/preferences";
import { publicSiteUrl } from "@/lib/supabase/env";

/** Image Zeus jointe aux WhatsApp (URL publique HTTPS uniquement — Twilio ne peut pas lire localhost). */
export function zeusAvatarMediaUrl(): string | null {
  const site = publicSiteUrl();
  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(site)) return null;
  return `${site}/zeus-avatar.png`;
}

export type ZeusMessageOpts = {
  numero?: string;
  clientLabel?: string;
  relanceIndex?: number;
  relanceTotal?: number;
  clientNotified?: boolean;
  montantTtc?: number;
};

function clientName(label?: string) {
  const n = label?.trim();
  return n && n !== "—" ? n : "ton client";
}

function zeusLine(body: string): string {
  return `🐾 *${ASSISTANT_DISPLAY_NAME}*\n${body}`;
}

export function zeusWhatsAppBody(event: NotificationEventId, opts: ZeusMessageOpts = {}): string {
  const numero = opts.numero?.trim() || "—";
  const client = clientName(opts.clientLabel);

  switch (event) {
    case "devis_cree":
      return zeusLine(`Salut ! Ton devis *${numero}* pour *${client}* est prêt. Relis-le et envoie-le quand tu veux.`);
    case "devis_accepte":
      return zeusLine(`Bonne nouvelle ! 🎉\n*${client}* vient d'accepter ton devis *${numero}*. Tu peux passer à la facturation.`);
    case "devis_refuse":
      return zeusLine(`Courage — *${client}* a refusé le devis *${numero}*.\nOn passe au suivant ?`);
    case "devis_relance": {
      const n = (opts.relanceIndex ?? 0) + 1;
      const total = opts.relanceTotal ?? 1;
      const step = total > 1 ? ` (relance ${n}/${total})` : "";
      const sent = opts.clientNotified
        ? "J'ai relancé ton client par e-mail."
        : "La relance client n'a pas pu partir (e-mail manquant ou erreur).";
      return zeusLine(`Devis *${numero}* · *${client}*${step}\n${sent}`);
    }
    case "facture_cree": {
      const montant =
        opts.montantTtc != null && Number.isFinite(opts.montantTtc)
          ? ` — ${opts.montantTtc.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`
          : "";
      return zeusLine(`Ta facture *${numero}* pour *${client}* est créée${montant}.\nTu peux l'envoyer au client.`);
    }
    case "facture_relance": {
      const n = (opts.relanceIndex ?? 0) + 1;
      const total = opts.relanceTotal ?? 1;
      const step = total > 1 ? ` (relance ${n}/${total})` : "";
      const sent = opts.clientNotified
        ? "J'ai relancé ton client par e-mail."
        : "La relance client n'a pas pu partir (e-mail manquant ou erreur).";
      return zeusLine(`Facture *${numero}* · *${client}*${step}\n${sent}`);
    }
    case "resume_hebdo":
      return zeusLine("Ton résumé de la semaine est prêt dans Flowo.");
    default:
      return zeusLine("Tu as une nouvelle alerte Flowo.");
  }
}

export function zeusTestWhatsAppBody(): string {
  return zeusLine("Salut ! Tes notifications WhatsApp sont bien branchées. Je te préviendrai pour tes devis et factures.");
}
