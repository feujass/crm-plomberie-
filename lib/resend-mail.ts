import { Resend } from "resend";

import { APP_NAME } from "@/lib/app-branding";
import { buildPlatformEmailFrom, sanitizeReplyToEmail } from "@/lib/email/build-email-from";
import { flowoEmailLayout } from "@/lib/email/flowo-email-layout";

export async function sendDevisEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  pdfBuffer?: Buffer | null;
  /** Surcharge l’expéditeur (ex. nom entreprise artisan). */
  from?: string;
  replyTo?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY manquant — email non envoyé.");
    return { ok: false as const, error: "missing_key" };
  }
  const resend = new Resend(key);
  const attachments = opts.pdfBuffer
    ? [{ filename: "devis.pdf", content: opts.pdfBuffer.toString("base64") }]
    : undefined;

  const replyTo = sanitizeReplyToEmail(opts.replyTo);

  const { error } = await resend.emails.send({
    from: opts.from?.trim() || process.env.RESEND_FROM || "Flowo <onboarding@resend.dev>",
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    ...(replyTo ? { replyTo } : {}),
    attachments: attachments as { filename: string; content: string }[] | undefined,
  });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/**
 * Test minimal type tutoriel Resend — même clé que le reste de l’app (`RESEND_API_KEY` dans `.env.local`).
 * Ne jamais mettre la clé `re_…` dans le code source.
 */
export async function sendResendHelloWorldEmail(to: string) {
  return sendDevisEmail({
    to: to.trim(),
    subject: "Hello World",
    html: "<p>Congrats on sending your first email!</p>",
  });
}

export async function sendPasswordResetEmail(opts: { to: string; resetUrl: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY manquant — e-mail de réinitialisation non envoyé.");
    return { ok: false as const, error: "missing_key" };
  }
  const resend = new Resend(key);
  const html = flowoEmailLayout({
    title: `${APP_NAME} — réinitialisation du mot de passe`,
    preview: `Choisis un nouveau mot de passe pour ton compte ${APP_NAME}.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour,</p>
      <p style="margin:0 0 12px;">Tu as demandé à réinitialiser ton mot de passe <strong>${APP_NAME}</strong>.</p>
      <p style="margin:0;">Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable <strong>1 heure</strong>.</p>
    `,
    ctaLabel: "Choisir un nouveau mot de passe",
    ctaHref: opts.resetUrl,
  });
  const { error } = await resend.emails.send({
    from: buildPlatformEmailFrom(),
    to: opts.to,
    subject: `${APP_NAME} — réinitialisation du mot de passe`,
    html,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
