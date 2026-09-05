import { APP_NAME } from "@/lib/app-branding";
import { getAffiliateAdminEmails } from "@/lib/affiliate/admin";
import { flowoEmailLayout } from "@/lib/email/flowo-email-layout";
import { publicSiteUrl } from "@/lib/supabase/env";
import { sendDevisEmail } from "@/lib/resend-mail";
import { formatCurrencyEUR } from "@/lib/format";
import { buildReferralUrl } from "@/lib/affiliate/constants";

const AUDIENCE_LABELS: Record<string, string> = {
  formateur: "Formateur / centre de formation",
  influenceur: "Influenceur / créateur de contenu",
  fournisseur: "Fournisseur / distributeur",
  coach: "Coach / consultant BTP",
  autre: "Autre",
};

export async function sendAffiliateApplicationToSupport(params: {
  displayName: string;
  email: string;
  brandName: string;
  phone?: string | null;
  audienceType: string;
  audienceSize?: string | null;
  websiteOrSocial?: string | null;
  pitch: string;
}) {
  const to = getAffiliateAdminEmails();
  if (!to.length) {
    console.warn("[affiliate] Aucun e-mail admin configuré (FLOWO_ADMIN_EMAILS) — notification non envoyée.");
    return { ok: false as const, error: "no_admin_email" };
  }

  const site = publicSiteUrl();
  const adminUrl = `${site}/admin/affiliation`;
  const html = flowoEmailLayout({
    title: `Nouvelle candidature partenaire — ${APP_NAME}`,
    preview: `${params.displayName} souhaite rejoindre le programme d'affiliation.`,
    bodyHtml: `
      <p style="margin:0 0 12px;"><strong>Nouvelle candidature affiliation</strong></p>
      <ul style="margin:0;padding-left:20px;line-height:1.7;">
        <li><strong>Nom :</strong> ${escapeHtml(params.displayName)}</li>
        <li><strong>E-mail :</strong> ${escapeHtml(params.email)}</li>
        <li><strong>Marque :</strong> ${escapeHtml(params.brandName)}</li>
        <li><strong>Téléphone :</strong> ${escapeHtml(params.phone || "—")}</li>
        <li><strong>Profil :</strong> ${escapeHtml(AUDIENCE_LABELS[params.audienceType] ?? params.audienceType)}</li>
        <li><strong>Audience :</strong> ${escapeHtml(params.audienceSize || "—")}</li>
        <li><strong>Site / réseaux :</strong> ${escapeHtml(params.websiteOrSocial || "—")}</li>
      </ul>
      <p style="margin:16px 0 8px;"><strong>Motivation</strong></p>
      <p style="margin:0;white-space:pre-wrap;">${escapeHtml(params.pitch)}</p>
    `,
    ctaLabel: "Voir la candidature",
    ctaHref: adminUrl,
  });
  return sendDevisEmail({ to, subject: `[Affiliation] Candidature — ${params.brandName}`, html });
}

export async function sendAffiliateApplicationConfirmation(params: {
  email: string;
  displayName: string;
  brandName: string;
}) {
  const site = publicSiteUrl();
  const html = flowoEmailLayout({
    title: `Candidature reçue — ${APP_NAME}`,
    preview: "Nous avons bien reçu ta candidature au programme partenaire.",
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour ${escapeHtml(params.displayName)},</p>
      <p style="margin:0 0 12px;">Merci pour ta candidature au programme partenaire <strong>${APP_NAME}</strong> pour <strong>${escapeHtml(params.brandName)}</strong>.</p>
      <p style="margin:0;">Notre équipe l'examine sous 48 h. Tu recevras un e-mail avec ton lien de parrainage et l'accès à ton espace partenaire dès validation.</p>
    `,
    ctaLabel: "Découvrir Flowo",
    ctaHref: site,
  });
  return sendDevisEmail({
    to: params.email,
    subject: `${APP_NAME} — candidature partenaire reçue`,
    html,
  });
}

export async function sendAffiliateApprovedEmail(params: {
  email: string;
  displayName: string;
  brandName: string;
  referralCode: string;
}) {
  const site = publicSiteUrl();
  const referralUrl = buildReferralUrl(params.referralCode, site);
  const html = flowoEmailLayout({
    title: `Bienvenue dans le programme partenaire — ${APP_NAME}`,
    preview: "Ta candidature est validée. Voici ton lien de parrainage.",
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour ${escapeHtml(params.displayName)},</p>
      <p style="margin:0 0 12px;">Ta candidature pour <strong>${escapeHtml(params.brandName)}</strong> est <strong>validée</strong>. Tu gagnes <strong>20 %</strong> sur chaque abonnement généré via ton lien.</p>
      <p style="margin:0 0 8px;"><strong>Ton lien :</strong></p>
      <p style="margin:0;word-break:break-all;font-family:monospace;font-size:13px;">${escapeHtml(referralUrl)}</p>
      <p style="margin:12px 0 0;">Active ton accès sur <strong>${escapeHtml(`${site}/partenaire/activer`)}</strong> ou connecte-toi sur <strong>${escapeHtml(`${site}/partenaire/connexion`)}</strong> (aucun compte CRM requis).</p>
    `,
    ctaLabel: "Activer mon espace partenaire",
    ctaHref: `${site}/partenaire/activer`,
  });
  return sendDevisEmail({
    to: params.email,
    subject: `${APP_NAME} — ton espace partenaire est prêt`,
    html,
  });
}

export async function sendAffiliateNewReferralEmail(params: {
  partnerEmail: string;
  partnerName: string;
  brandName: string;
}) {
  const site = publicSiteUrl();
  const html = flowoEmailLayout({
    title: `Nouveau filleul — ${APP_NAME}`,
    preview: "Un artisan vient de s'inscrire via ton lien.",
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour ${escapeHtml(params.partnerName)},</p>
      <p style="margin:0;">Bonne nouvelle pour <strong>${escapeHtml(params.brandName)}</strong> : un artisan vient de s'inscrire via ton lien de parrainage. S'il souscrit à un abonnement, tu toucheras ta commission automatiquement.</p>
    `,
    ctaLabel: "Voir mon tableau de bord",
    ctaHref: `${site}/partenaire`,
  });
  return sendDevisEmail({
    to: params.partnerEmail,
    subject: `${APP_NAME} — nouveau filleul inscrit 🎉`,
    html,
  });
}

export async function sendAffiliateNewCommissionEmail(params: {
  partnerEmail: string;
  partnerName: string;
  brandName: string;
  commissionEur: number;
  grossEur: number;
}) {
  const site = publicSiteUrl();
  const html = flowoEmailLayout({
    title: `Nouvelle commission — ${APP_NAME}`,
    preview: `+${formatCurrencyEUR(params.commissionEur)} de commission.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour ${escapeHtml(params.partnerName)},</p>
      <p style="margin:0 0 12px;">Un de tes filleuls vient de payer son abonnement. Tu viens de gagner <strong>${formatCurrencyEUR(params.commissionEur)}</strong> (sur ${formatCurrencyEUR(params.grossEur)}).</p>
      <p style="margin:0;">Le montant apparaît dans ton espace partenaire. Dès le seuil atteint, le virement part via Stripe Connect.</p>
    `,
    ctaLabel: "Voir mes commissions",
    ctaHref: `${site}/partenaire/commissions`,
  });
  return sendDevisEmail({
    to: params.partnerEmail,
    subject: `${APP_NAME} — nouvelle commission ${formatCurrencyEUR(params.commissionEur)}`,
    html,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
