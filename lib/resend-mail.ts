import { Resend } from "resend";

export async function sendDevisEmail(opts: {
  to: string;
  subject: string;
  html: string;
  pdfBuffer?: Buffer | null;
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

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "Flowo <onboarding@resend.dev>",
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
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
  const html = `
    <p>Bonjour,</p>
    <p>Tu as demandé à réinitialiser ton mot de passe <strong>Flowo</strong>.</p>
    <p><a href="${opts.resetUrl}">Clique ici pour choisir un nouveau mot de passe</a> (lien valable 1 heure).</p>
    <p>Si tu n’es pas à l’origine de cette demande, ignore cet e-mail.</p>
  `;
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "Flowo <onboarding@resend.dev>",
    to: opts.to,
    subject: "Flowo — réinitialisation du mot de passe",
    html,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
