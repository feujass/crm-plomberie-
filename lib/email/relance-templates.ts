import { APP_NAME } from "@/lib/app-branding";
import { devisClientEmailCtas, renderDevisClientEmailCtas } from "@/lib/email/devis-client-email";
import { flowoEmailLayout } from "@/lib/email/flowo-email-layout";

export function devisInitialEmailHtml(opts: { numero: string; publicUrl: string; entreprise?: string }) {
  const brand = opts.entreprise?.trim();
  return flowoEmailLayout({
    title: `Devis ${opts.numero}`,
    preview: brand
      ? `${brand} — votre devis ${opts.numero} est prêt.`
      : `Votre devis ${opts.numero} est prêt à consulter.`,
    brandName: brand,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour,</p>
      <p style="margin:0 0 12px;">${brand ? `<strong>${brand}</strong> vous adresse` : "Voici"} votre devis <strong>${opts.numero}</strong>.</p>
      <p style="margin:0;">Consultez le détail, les totaux et la TVA, puis répondez directement ci-dessous (accepter ou refuser).</p>
    `,
    ctaHtml: renderDevisClientEmailCtas(devisClientEmailCtas(opts.publicUrl)),
  });
}

export function devisRelanceEmailHtml(opts: {
  numero: string;
  publicUrl: string;
  relanceIndex: number;
  relanceTotal: number;
  daysAfterSend: number;
  entreprise?: string;
}) {
  const brand = opts.entreprise?.trim();
  const n = opts.relanceIndex + 1;
  const suffix =
    opts.relanceTotal > 1
      ? ` (relance ${n}/${opts.relanceTotal}, J+${opts.daysAfterSend})`
      : ` (J+${opts.daysAfterSend})`;

  return flowoEmailLayout({
    title: brand ? `${brand} — Devis ${opts.numero}` : `Devis ${opts.numero}`,
    preview: brand
      ? `${brand} — rappel pour votre devis ${opts.numero}.`
      : `Rappel concernant votre devis ${opts.numero}.`,
    brandName: brand,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour,</p>
      <p style="margin:0 0 12px;">
        ${
          brand
            ? `<strong>${brand}</strong> n&apos;a pas encore reçu votre retour`
            : "Nous n&apos;avons pas encore reçu votre retour"
        }
        sur le devis <strong>${opts.numero}</strong>${suffix}.
      </p>
      <p style="margin:0;">Merci de consulter le devis et de nous indiquer votre décision en un clic.</p>
    `,
    ctaHtml: renderDevisClientEmailCtas(devisClientEmailCtas(opts.publicUrl)),
  });
}

export function factureRelanceEmailHtml(opts: {
  numero: string;
  publicUrl: string;
  relanceIndex: number;
  relanceTotal: number;
  daysAfterDue: number;
}) {
  const n = opts.relanceIndex + 1;
  const delayLabel =
    opts.daysAfterDue === 0 ? "à échéance" : `${opts.daysAfterDue} jour${opts.daysAfterDue > 1 ? "s" : ""} après échéance`;
  const suffix =
    opts.relanceTotal > 1 ? ` (relance ${n}/${opts.relanceTotal}, ${delayLabel})` : ` (${delayLabel})`;

  return flowoEmailLayout({
    title: `Relance — Facture ${opts.numero}`,
    preview: `Rappel de règlement pour la facture ${opts.numero}.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour,</p>
      <p style="margin:0 0 12px;">
        Votre facture <strong>${opts.numero}</strong> est en attente de règlement${suffix}.
      </p>
      <p style="margin:0;">Merci de consulter le détail et de procéder au paiement si ce n&apos;est pas déjà fait.</p>
    `,
    ctaLabel: "Voir la facture",
    ctaHref: opts.publicUrl,
  });
}

export function artisanRelanceEmailHtml(opts: {
  kind: "devis" | "facture";
  numero: string;
  clientLabel: string;
  relanceIndex: number;
  relanceTotal: number;
  clientNotified: boolean;
}) {
  const kindLabel = opts.kind === "devis" ? "devis" : "facture";
  const n = opts.relanceIndex + 1;
  const title = opts.kind === "devis" ? "Devis à relancer" : "Facture impayée";

  return flowoEmailLayout({
    title: `${APP_NAME} — ${title}`,
    preview: `${title} : ${opts.numero} (${opts.clientLabel}).`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour,</p>
      <p style="margin:0 0 12px;">
        ${opts.kind === "devis" ? "Le devis" : "La facture"} <strong>${opts.numero}</strong>
        pour <strong>${opts.clientLabel}</strong>
        ${opts.relanceTotal > 1 ? `entre dans la relance automatique <strong>${n}/${opts.relanceTotal}</strong>.` : "doit être relancé(e)."}
      </p>
      <p style="margin:0;">
        ${
          opts.clientNotified
            ? `Une relance a été envoyée au client par e-mail via ${APP_NAME}.`
            : `Aucun e-mail client n'a pu être envoyé (adresse manquante ou erreur d'envoi).`
        }
      </p>
    `,
  });
}
