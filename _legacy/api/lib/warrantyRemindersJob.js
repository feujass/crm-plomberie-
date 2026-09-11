/**
 * Rappels automatiques fin de garantie (e-mail client + marquage colonnes).
 */
require("dotenv").config();
const nodemailer = require("nodemailer");
const { getSupabase } = require("../../db");

const db = () => getSupabase();

const getTransporter = () =>
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null;

const COMPANY_INFO = {
  name: process.env.COMPANY_NAME || "CRM Plomberie",
  address: process.env.COMPANY_ADDRESS || "",
  phone: process.env.COMPANY_PHONE || "",
  email: process.env.COMPANY_EMAIL || "",
};

function daysUntil(dateStr) {
  const end = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * @returns {{ ok: boolean, sent30: number, sent7: number, skipped: number, errors: { detail: string }[] }}
 */
async function executeWarrantyReminders({ dryRun = false } = {}) {
  const transporter = getTransporter();
  const errors = [];
  let sent30 = 0;
  let sent7 = 0;
  let skipped = 0;

  if (!transporter && !dryRun) {
    errors.push({ detail: "SMTP non configuré — aucun e-mail de garantie envoyé." });
  }

  const { data: warranties, error } = await db().from("warranties").select("*");
  if (error) {
    return { ok: false, sent30: 0, sent7: 0, skipped: 0, errors: [{ detail: error.message }] };
  }

  for (const w of warranties || []) {
    const d = daysUntil(w.end_date);
    if (d < 0) continue;

    const { data: client } = await db().from("clients").select("*").eq("id", w.client_id).maybeSingle();
    if (!client?.email) {
      skipped++;
      continue;
    }

    const need7 = d <= 7 && !w.reminder_7d_sent_at;
    const need30 = d <= 30 && d > 7 && !w.reminder_30d_sent_at;
    if (!need7 && !need30) continue;

    const kind = need7 ? "7" : "30";
    const subject =
      kind === "7"
        ? `Garantie : il reste ${d} jour(s) — ${COMPANY_INFO.name}`
        : `Rappel garantie : échéance dans ${d} jours — ${COMPANY_INFO.name}`;

    const text =
      `Bonjour ${client.name},\n\n` +
      `Concernant les travaux « ${w.label || "votre installation"} », la période de garantie se termine le ${w.end_date}.\n\n` +
      (kind === "7"
        ? `N'hésitez pas à nous contacter en cas de dysfonctionnement avant cette date.\n\n`
        : `Pensez à vérifier le bon fonctionnement de vos équipements.\n\n`) +
      `Cordialement,\n${COMPANY_INFO.name}\n${COMPANY_INFO.phone}\n${COMPANY_INFO.email}`;

    if (dryRun) {
      if (kind === "7") sent7++;
      else sent30++;
      continue;
    }

    if (!transporter) continue;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "PlombiCRM <no-reply@plombicrm.fr>",
        to: client.email,
        subject,
        text,
      });
      const nowIso = new Date().toISOString();
      const patch =
        kind === "7"
          ? { reminder_7d_sent_at: nowIso }
          : { reminder_30d_sent_at: nowIso };
      await db().from("warranties").update(patch).eq("id", w.id);
      if (kind === "7") sent7++;
      else sent30++;
    } catch (e) {
      errors.push({ detail: e instanceof Error ? e.message : String(e) });
    }
  }

  return {
    ok: errors.length === 0 || sent30 > 0 || sent7 > 0,
    sent30,
    sent7,
    skipped,
    errors,
  };
}

module.exports = { executeWarrantyReminders };
