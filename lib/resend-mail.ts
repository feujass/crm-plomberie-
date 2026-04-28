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
