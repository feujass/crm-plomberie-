/**
 * Job de relance e-mail des devis (signature en attente).
 * Sous api/lib/ pour que le bundle Vercel de api/relances-devis-cron.js inclue bien db + ce module.
 */
require("dotenv").config();
const nodemailer = require("nodemailer");
const { getSupabase } = require("../../db");

const PORT = process.env.PORT || 3000;
const BASE_URL = (() => {
  const explicit = process.env.BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${PORT}`;
})();

const COMPANY_INFO = {
  name: process.env.COMPANY_NAME || "CRM Plomberie",
  address: process.env.COMPANY_ADDRESS || "Adresse de l'entreprise",
  phone: process.env.COMPANY_PHONE || "Téléphone entreprise",
  email: process.env.COMPANY_EMAIL || "contact@entreprise.fr",
};

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

const formatCurrency = (value) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
    .format(value)
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ");

const formatDate = (value) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** null = éligible à une relance (hors vérif client email). */
function explainQuoteRelanceBlocker(q) {
  if (!q) return "missing_row";
  if (!["Envoyé", "En attente"].includes(q.status)) return `status_${q.status}`;
  const tok = String(q.accept_token ?? "").trim();
  if (!tok) return "missing_accept_token";
  if (q.relance_envoyee_at != null && String(q.relance_envoyee_at).trim() !== "") return "relance_already_sent";
  const sent = q.sent_at;
  if (!sent) return "missing_sent_at";
  const raw = String(sent);
  const sentTime = new Date(raw.length <= 10 ? `${raw}T12:00:00.000Z` : raw).getTime();
  if (!Number.isFinite(sentTime)) return "bad_sent_at";
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  if (Date.now() - sentTime < twoDaysMs) return "under_48h_since_sent";
  return null;
}

const quoteEligibleForRelanceDevis = (q) => explainQuoteRelanceBlocker(q) === null;

const buildDevisRelanceEmail = ({ quoteRef, montant, dateEnvoi, signUrl, clientName, company }) => {
  const subject = `Votre devis ${quoteRef} est en attente de signature`;
  const safeName = escapeHtml(clientName);
  const safeRef = escapeHtml(quoteRef);
  const safeDate = escapeHtml(dateEnvoi);
  const safeMontant = escapeHtml(montant);
  const href = signUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const text =
    `Bonjour ${clientName},\n\n` +
    `Nous nous permettons de vous recontacter concernant votre devis ${quoteRef}, transmis le ${dateEnvoi}, pour un montant de ${montant} TTC.\n\n` +
    `Pour consulter le détail et signer électroniquement :\n${signUrl}\n\n` +
    `Une question ? Répondez à ce message ou joignez-nous :\n` +
    `${company.name} — ${company.phone} — ${company.email}\n${company.address}\n\n` +
    `Bien cordialement,\nL’équipe ${company.name}`;
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Segoe UI,system-ui,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:0;padding:24px;">
  <p>Bonjour ${safeName},</p>
  <p>Nous faisions un petit rappel concernant votre devis <strong>${safeRef}</strong>, que nous vous avions envoyé le <strong>${safeDate}</strong>, pour un montant de <strong>${safeMontant}</strong> TTC.</p>
  <p>Lorsque vous aurez un moment, vous pouvez consulter le détail et signer électroniquement :</p>
  <p style="margin:28px 0;"><a href="${href}" style="display:inline-block;background:#5662f6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600;">Ouvrir mon devis et signer</a></p>
  <p style="font-size:14px;color:#64748b;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><span style="word-break:break-all;">${href}</span></p>
  <p>Une question ? Répondez à cet e-mail ou contactez-nous :<br>
  <strong>${escapeHtml(company.name)}</strong> — ${escapeHtml(company.phone)} — <a href="mailto:${escapeHtml(company.email)}">${escapeHtml(company.email)}</a><br>
  ${escapeHtml(company.address)}</p>
  <p style="margin-top:28px;">Bien cordialement,<br>L’équipe ${escapeHtml(company.name)}</p>
</body>
</html>`;
  return { subject, text, html };
};

/**
 * @param {import('http').IncomingMessage} req
 * @returns {{ status: number, body: object } | null} null si autorisé
 */
function authorizeCronRequest(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[relances/devis] CRON_SECRET manquant — exécution refusée.");
    return {
      status: 503,
      body: { ok: false, sent: 0, errors: [{ detail: "CRON_SECRET non configuré sur le serveur." }] },
    };
  }
  const h = req.headers?.authorization || req.headers?.Authorization || "";
  const token = typeof h === "string" && h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (token !== secret) {
    console.warn("[relances/devis] Requête refusée (Authorization Bearer invalide ou absent).");
    return { status: 401, body: { ok: false, sent: 0, errors: [{ detail: "Non autorisé." }] } };
  }
  return null;
}

function buildIneligibleBreakdown(candidates, eligibleList) {
  const eligibleIds = new Set(eligibleList.map((q) => q.id));
  const breakdown = {};
  for (const q of candidates || []) {
    if (eligibleIds.has(q.id)) continue;
    const reason = explainQuoteRelanceBlocker(q) || "unknown";
    breakdown[reason] = (breakdown[reason] || 0) + 1;
  }
  return breakdown;
}

/**
 * @param {{ dryRun?: boolean }} [options]
 */
async function executeDevisRelances(options = {}) {
  const { dryRun = false } = options;
  console.log(`[relances/devis] Démarrage batch…${dryRun ? " (dryRun)" : ""}`);

  if (!dryRun) {
    const transporter = getTransporter();
    if (!transporter) {
      console.error("[relances/devis] Aucun transporteur SMTP (SMTP_HOST / SMTP_USER / SMTP_PASS).");
      return {
        ok: false,
        sent: 0,
        errors: [{ detail: "Envoi e-mail impossible : SMTP non configuré." }],
        scanned: 0,
        eligible: 0,
        ineligibleBreakdown: {},
      };
    }
  }

  const { data: candidates, error } = await db().from("quotes").select("*").in("status", ["Envoyé", "En attente"]);

  if (error) {
    console.error("[relances/devis] Lecture Supabase :", error.message);
    let hint = error.message;
    if (/relance_envoyee_at|column|schema/i.test(error.message)) {
      hint +=
        " — Exécutez la migration SQL docs/migrations/003_quotes_relance_envoyee_at.sql sur Supabase.";
    }
    return {
      ok: false,
      sent: 0,
      errors: [{ detail: hint }],
      scanned: 0,
      eligible: 0,
      ineligibleBreakdown: {},
    };
  }

  const list = (candidates || []).filter(quoteEligibleForRelanceDevis);
  const ineligibleBreakdown = buildIneligibleBreakdown(candidates, list);
  console.log(`[relances/devis] Éligibles après filtre : ${list.length} / ${(candidates || []).length} (statut Envoyé/En attente).`);

  if (dryRun) {
    const previews = [];
    for (const q of list) {
      const quoteRef = `DV-${String(q.id).padStart(5, "0")}`;
      const { data: client } = await db()
        .from("clients")
        .select("id,email,name")
        .eq("id", q.client_id)
        .eq("user_id", q.user_id)
        .maybeSingle();
      const emailTo = client?.email?.trim() || null;
      previews.push({
        quoteId: q.id,
        quoteRef,
        clientEmail: emailTo,
        sentAt: q.sent_at,
        blocker: emailTo ? null : "client_no_email",
      });
    }
    return {
      ok: true,
      dryRun: true,
      sent: 0,
      errors: [],
      scanned: (candidates || []).length,
      eligible: list.length,
      ineligibleBreakdown,
      previews,
    };
  }

  const transporter = getTransporter();
  const errors = [];
  let sent = 0;

  for (const quote of list) {
    const quoteId = quote.id;
    try {
      const { data: current } = await db().from("quotes").select("*").eq("id", quoteId).single();
      if (!quoteEligibleForRelanceDevis(current)) {
        console.log(`[relances/devis] #${quoteId} ignoré (relu : plus éligible).`);
        continue;
      }

      const { data: client } = await db()
        .from("clients")
        .select("*")
        .eq("id", current.client_id)
        .eq("user_id", current.user_id)
        .maybeSingle();

      const emailTo = client?.email?.trim();
      if (!emailTo) {
        const msg = "Client sans adresse e-mail";
        errors.push({ quoteId, detail: msg });
        console.warn(`[relances/devis] #${quoteId} : ${msg}`);
        continue;
      }

      const quoteRef = `DV-${String(current.id).padStart(5, "0")}`;
      const signUrl = `${BASE_URL}/api/sign/${current.accept_token}`;
      const montant = formatCurrency(Number(current.amount));
      const dateEnvoi = formatDate(current.sent_at || new Date().toISOString());
      const { subject, text, html } = buildDevisRelanceEmail({
        quoteRef,
        montant,
        dateEnvoi,
        signUrl,
        clientName: client.name || "Madame, Monsieur",
        company: COMPANY_INFO,
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "PlombiCRM <no-reply@plombicrm.fr>",
        to: emailTo,
        subject,
        text,
        html,
      });

      const nowIso = new Date().toISOString();
      const { data: updatedRows, error: upErr } = await db()
        .from("quotes")
        .update({ relance_envoyee_at: nowIso })
        .eq("id", quoteId)
        .in("status", ["Envoyé", "En attente"])
        .is("relance_envoyee_at", null)
        .select("id");

      if (upErr) {
        errors.push({ quoteId, detail: upErr.message });
        console.error(`[relances/devis] #${quoteId} envoi OK mais BDD :`, upErr.message);
        continue;
      }
      if (!updatedRows?.length) {
        const msg = "Aucune mise à jour (le devis a peut‑être été signé ou refusé entre‑temps)";
        errors.push({ quoteId, detail: msg });
        console.warn(`[relances/devis] #${quoteId} : ${msg}`);
        continue;
      }

      sent += 1;
      console.log(`[relances/devis] OK ${quoteRef} → ${emailTo}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ quoteId, detail: msg });
      console.error(`[relances/devis] #${quoteId} erreur :`, msg);
    }
  }

  console.log(`[relances/devis] Fin — envoyées: ${sent}, erreurs: ${errors.length}`);
  return {
    ok: errors.length === 0,
    sent,
    errors,
    scanned: (candidates || []).length,
    eligible: list.length,
    ineligibleBreakdown,
  };
}

module.exports = {
  authorizeCronRequest,
  executeDevisRelances,
  quoteEligibleForRelanceDevis,
  explainQuoteRelanceBlocker,
};
