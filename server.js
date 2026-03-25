require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const crypto = require("crypto");
const { google } = require("googleapis");
const { getSupabase, ensureSingleUser, cleanupDemoDataOnce, resetUserData } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
const COMPANY_INFO = {
  name: process.env.COMPANY_NAME || "CRM Plomberie",
  address: process.env.COMPANY_ADDRESS || "Adresse de l'entreprise",
  phone: process.env.COMPANY_PHONE || "Téléphone entreprise",
  email: process.env.COMPANY_EMAIL || "contact@entreprise.fr",
};

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null;

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });

const auth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Non autorisé." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Session expirée. Veuillez vous reconnecter." });
  }
};

const getUserFromToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

const getGoogleRedirectUri = () => GOOGLE_REDIRECT_URI || `${BASE_URL}/auth/google/callback`;

const getGoogleOAuthClient = () => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google Calendar: identifiants non configurés.");
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, getGoogleRedirectUri());
};

const toInitials = (name) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

const mapClient = (r) => ({
  id: r.id, name: r.name, address: r.address, phone: r.phone,
  email: r.email, segment: r.segment, lastProject: r.last_project || "Nouveau projet",
});
const mapService = (r) => ({ id: r.id, name: r.name, basePrice: r.base_price });
const mapMaterial = (r) => ({ id: r.id, name: r.name, price: r.price });
const mapQuote = (r) => ({
  id: r.id, clientId: r.client_id, serviceId: r.service_id, materialId: r.material_id,
  hours: r.hours, discount: r.discount, amount: r.amount, status: r.status,
  sentAt: r.sent_at, ack: Boolean(r.ack), materialsDesc: r.materials_desc || "",
  materialsTotal: r.materials_total || 0, acceptedAt: r.accepted_at || null,
});
const mapProject = (r) => ({
  id: r.id, name: r.name, clientId: r.client_id, status: r.status,
  progress: r.progress, dueDate: r.due_date, responsible: r.responsible || "",
  comment: r.comment || "",
});
const mapNotification = (r) => ({ id: r.id, label: r.label, type: r.type });
const mapIntegration = (r) => ({
  id: r.id, name: r.name, description: r.description, enabled: Boolean(r.enabled),
});

const progressForStatus = (status, fallback) => {
  if (status === "Planifié") return 15;
  if (status === "En cours") return 55;
  if (status === "Urgent") return 75;
  if (status === "Terminé") return 100;
  return fallback;
};

const notificationTypeForStatus = (status) => {
  if (status === "Urgent") return "danger";
  if (status === "Terminé") return "success";
  return "warning";
};

// ── Supabase helpers ──

const db = () => getSupabase();

const ensureSettings = async (userId) => {
  const { data: existing } = await db()
    .from("settings").select("*").eq("user_id", userId).maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await db()
    .from("settings")
    .insert({ user_id: userId, labor_rate: 65, satisfaction_score: 0, satisfaction_responses: 0 })
    .select("*").single();
  if (error) throw error;
  return created;
};

const ensureCustomMaterial = async (userId) => {
  const { data: existing } = await db()
    .from("materials").select("id")
    .eq("user_id", userId).eq("name", "Matériaux personnalisés").maybeSingle();
  if (existing) return existing.id;
  const { data: created } = await db()
    .from("materials")
    .insert({ user_id: userId, name: "Matériaux personnalisés", price: 0 })
    .select("id").single();
  return created.id;
};

const addNotification = async (userId, label, type) => {
  await db().from("notifications").insert({ user_id: userId, label, type });
};

const computeQuote = (service, materialsTotal, hours, laborRate, discount) => {
  const base = service.base_price + materialsTotal + hours * laborRate;
  return Math.round(base - base * (discount / 100));
};

// ── PDF helpers ──

const formatCurrency = (value) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
    .format(value).replace(/\u202F/g, " ").replace(/\u00A0/g, " ");

const formatEuroPlain = (value) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);

const formatDate = (value) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildQuotePdf = async ({ quoteRef, client, company, items, totals, signature }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, compress: true });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor("#111827").text(company.name, { align: "left" });
    doc.fontSize(10).fillColor("#6b7280").text(company.address);
    doc.text(`Tél : ${company.phone}`);
    if (company.email) doc.text(`Email : ${company.email}`);

    doc.moveUp(4);
    doc.fontSize(16).fillColor("#111827").text("Devis", { align: "right" });
    doc.fontSize(10).fillColor("#6b7280").text(`Réf. devis : ${quoteRef}`, { align: "right" });
    doc.text(`Date de devis : ${formatDate(totals.date)}`, { align: "right" });

    doc.moveDown(2);
    doc.fontSize(11).fillColor("#111827").text("Adressé à :", { underline: true });
    doc.fontSize(10).fillColor("#111827").text(client.name);
    if (client.address) doc.text(client.address);
    if (client.phone) doc.text(`Tél : ${client.phone}`);
    if (client.email) doc.text(`Email : ${client.email}`);

    doc.moveDown(2);
    doc.fontSize(11).fillColor("#111827").text("Description", { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const colDesc = 50, colQty = 360, colUnit = 430, colTotal = 510;

    doc.fontSize(9).fillColor("#6b7280");
    doc.text("Description", colDesc, tableTop);
    doc.text("Qté", colQty, tableTop, { width: 40, align: "right" });
    doc.text("Prix Unitaire", colUnit, tableTop, { width: 70, align: "right" });
    doc.text("Prix HT", colTotal, tableTop, { width: 70, align: "right" });

    doc.moveDown(0.6);
    doc.moveTo(48, doc.y).lineTo(548, doc.y).strokeColor("#e5e7eb").stroke();
    doc.moveDown(0.6);

    doc.fontSize(9).fillColor("#111827");
    const rowGap = 6;
    items.forEach((item) => {
      const rowY = doc.y;
      if (item.isSection) {
        doc.fontSize(9).fillColor("#6b7280").text(item.label.toUpperCase(), colDesc, rowY, { width: 300 });
        doc.moveDown(0.4);
        doc.moveTo(48, doc.y).lineTo(548, doc.y).strokeColor("#e5e7eb").stroke();
        doc.moveDown(0.6);
        doc.fontSize(9).fillColor("#111827");
        return;
      }
      const descHeight = doc.heightOfString(item.label, { width: 300 });
      const rowHeight = Math.max(descHeight, 12);
      doc.text(item.label, colDesc, rowY, { width: 300 });
      doc.text(item.quantity, colQty, rowY, { width: 40, align: "right" });
      doc.text(formatCurrency(item.unitPrice), colUnit, rowY, { width: 70, align: "right" });
      doc.text(formatCurrency(item.total), colTotal, rowY, { width: 70, align: "right" });
      doc.y = rowY + rowHeight + rowGap;
    });

    doc.moveDown(1);
    doc.moveTo(320, doc.y).lineTo(548, doc.y).strokeColor("#e5e7eb").stroke();
    doc.moveDown(0.8);
    doc.fontSize(10).fillColor("#111827");
    doc.text("Total HT", 360, doc.y, { width: 120, align: "right" });
    doc.text(formatCurrency(totals.subtotal), colTotal, doc.y, { width: 70, align: "right" });
    if (totals.discount && totals.discount > 0) {
      doc.moveDown(0.4);
      doc.text(`Remise (${totals.discount}%)`, 360, doc.y, { width: 120, align: "right" });
      doc.text(`- ${formatCurrency(totals.discountAmount)}`, colTotal, doc.y, { width: 70, align: "right" });
    }
    doc.moveDown(0.4);
    doc.text(`TVA ${totals.taxRate}%`, 360, doc.y, { width: 120, align: "right" });
    doc.text(formatCurrency(totals.tax), colTotal, doc.y, { width: 70, align: "right" });
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#111827").text("Total TTC", 360, doc.y, { width: 120, align: "right" });
    doc.text(formatCurrency(totals.total), colTotal, doc.y, { width: 70, align: "right" });

    doc.moveDown(2);
    doc.fontSize(10).fillColor("#111827").text("Signature du client", 48, doc.y);
    doc.moveDown(0.5);
    const boxX = 48, boxY = doc.y, boxW = 220, boxH = 80;
    doc.rect(boxX, boxY, boxW, boxH).lineWidth(1).strokeColor("#e5e7eb").stroke();
    if (signature?.data) {
      const base64 = signature.data.split(",")[1];
      const imageBuffer = Buffer.from(base64, "base64");
      doc.image(imageBuffer, boxX + 8, boxY + 8, { width: boxW - 16, height: boxH - 16 });
    }
    doc.y = boxY + boxH + 12;
    if (signature?.name) {
      doc.fontSize(9).fillColor("#6b7280").text(`Signé par : ${signature.name}`, 48, doc.y);
    }
    doc.end();
  });

const buildItemsForQuote = (service, hours, settings, materialsValue) => {
  const items = [];
  const section = (label) => ({ label, quantity: "", unitPrice: 0, total: 0, isSection: true });
  items.push(section("Prestation"));
  items.push({ label: service.name, quantity: "1", unitPrice: service.base_price, total: service.base_price });
  if (materialsValue > 0) {
    items.push(section("Matériaux"));
    items.push({ label: "Matériaux", quantity: "1", unitPrice: materialsValue, total: materialsValue });
  }
  items.push(section("Main-d'œuvre"));
  items.push({
    label: `Main-d'œuvre (${hours}h)`,
    quantity: Number(hours).toFixed(2),
    unitPrice: settings.labor_rate,
    total: settings.labor_rate * Number(hours),
  });
  return items;
};

// ── PDF storage via Supabase Storage ──

const BUCKET = "quotes";

const ensureBucket = async () => {
  const supabase = db();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
};

const uploadPdf = async (filename, buffer) => {
  const supabase = db();
  await ensureBucket();
  await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
};

const getQuotePdfPublicUrl = (quoteRef) => {
  const filename = `${quoteRef}.pdf`;
  const { data } = db().storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
};

const buildElectronicSignPageHtml = (p) => `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Signature du devis ${escapeHtml(p.quoteRef)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f5f4f0;
    color: #1a1a18;
    min-height: 100vh;
    padding: 32px 16px 64px;
  }
  .container { max-width: 600px; margin: 0 auto; }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28px;
  }
  .logo { font-size: 20px; font-weight: 600; color: #1a1a18; letter-spacing: -0.3px; }
  .logo span { color: #3d3aba; }
  .badge-ref {
    background: #e8e8f8; color: #3d3aba;
    font-size: 12px; font-weight: 600;
    padding: 4px 10px; border-radius: 20px;
    letter-spacing: 0.03em;
  }

  .card {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #e4e2db;
    overflow: hidden;
    margin-bottom: 20px;
  }
  .card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #f0eeea;
  }
  .card-header h2 { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
  .card-header p { font-size: 13px; color: #6b6960; }
  .card-body { padding: 20px 24px; }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 8px 0;
    font-size: 14px;
    border-bottom: 1px solid #f5f4f0;
  }
  .summary-row:last-child { border-bottom: none; }
  .summary-row .label { color: #6b6960; }
  .summary-row .value { font-weight: 500; }
  .summary-row.total { border-bottom: none; padding-top: 12px; margin-top: 4px; border-top: 2px solid #f0eeea; }
  .summary-row.total .label { font-weight: 600; font-size: 15px; color: #1a1a18; }
  .summary-row.total .value { font-weight: 700; font-size: 18px; color: #1a1a18; }

  .pdf-link {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f5f4f0;
    border-radius: 10px;
    padding: 12px 16px;
    margin-top: 16px;
    font-size: 13px;
    color: #3d3aba;
    text-decoration: none;
    font-weight: 500;
    transition: background .15s;
  }
  .pdf-link:hover { background: #eeedf8; }
  .pdf-icon {
    width: 32px; height: 32px;
    background: #3d3aba;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .pdf-icon svg { fill: #fff; }

  .sig-label {
    font-size: 13px;
    font-weight: 500;
    color: #6b6960;
    margin-bottom: 8px;
  }
  .sig-input {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid #e4e2db;
    border-radius: 10px;
    font-size: 15px;
    font-family: inherit;
    margin-bottom: 16px;
    outline: none;
    transition: border-color .15s;
    background: #fff;
  }
  .sig-input:focus { border-color: #3d3aba; }

  .canvas-wrap {
    position: relative;
    border: 1.5px solid #e4e2db;
    border-radius: 12px;
    overflow: hidden;
    background: #fafaf8;
    margin-bottom: 10px;
    cursor: crosshair;
    transition: border-color .15s;
  }
  .canvas-wrap:hover { border-color: #b0aee8; }
  .canvas-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: #b0ae9e;
    pointer-events: none;
    gap: 6px;
  }
  .canvas-placeholder.hidden { display: none; }
  canvas { display: block; width: 100%; height: 180px; }

  .clear-btn {
    background: none;
    border: none;
    font-size: 12px;
    color: #6b6960;
    cursor: pointer;
    padding: 4px 0;
    text-decoration: underline;
  }
  .clear-btn:hover { color: #1a1a18; }

  .consent {
    font-size: 12px;
    color: #6b6960;
    line-height: 1.5;
    margin: 16px 0;
    padding: 12px 14px;
    background: #f5f4f0;
    border-radius: 10px;
  }
  .consent strong { color: #1a1a18; }

  .submit-btn {
    width: 100%;
    padding: 15px;
    background: #3d3aba;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background .15s, opacity .15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .submit-btn:hover:not(:disabled) { background: #2e2b8a; }
  .submit-btn:disabled { opacity: .55; cursor: not-allowed; }

  .msg { margin-top: 16px; font-size: 14px; text-align: center; padding: 12px; border-radius: 10px; display: none; }
  .msg.success { background: #e1f5ee; color: #085041; display: block; }
  .msg.error { background: #fcebeb; color: #791f1f; display: block; }

  .success-screen {
    display: none;
    text-align: center;
    padding: 40px 24px;
  }
  .success-screen.show { display: block; }
  .success-icon {
    width: 64px; height: 64px;
    background: #1D9E75;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px;
  }
  .success-icon svg { stroke: #fff; }
  .success-screen h3 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
  .success-screen p { font-size: 14px; color: #6b6960; line-height: 1.6; }

  .form-area.hidden { display: none; }

  .signed-banner {
    display: none;
    background: #e1f5ee;
    border: 1px solid #9FE1CB;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 20px;
    font-size: 14px;
    color: #085041;
    font-weight: 500;
    align-items: center;
    gap: 10px;
  }
  .signed-banner.show { display: flex; }
</style>
</head>
<body>
<!-- plombicrm-sign-ui-v2 -->
<div class="container">

  <div class="header">
    <div class="logo">Plombi<span>CRM</span></div>
    <div class="badge-ref">${escapeHtml(p.quoteRef)}</div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>Devis pour ${escapeHtml(p.clientName)}</h2>
      <p>Émis le ${escapeHtml(p.quoteDate)} · ${escapeHtml(p.serviceName)}</p>
    </div>
    <div class="card-body">
      <div class="summary-row">
        <span class="label">Prestation</span>
        <span class="value">${escapeHtml(p.serviceAmount)} €</span>
      </div>
      <div class="summary-row">
        <span class="label">Matériaux</span>
        <span class="value">${escapeHtml(p.materialsAmount)} €</span>
      </div>
      <div class="summary-row">
        <span class="label">Main-d'œuvre</span>
        <span class="value">${escapeHtml(p.laborAmount)} €</span>
      </div>
      ${p.discountRowHtml}
      <div class="summary-row total">
        <span class="label">Total TTC</span>
        <span class="value">${escapeHtml(p.totalAmount)} €</span>
      </div>
      <a class="pdf-link" href="${escapeHtml(p.pdfUrl)}" target="_blank" rel="noopener noreferrer">
        <div class="pdf-icon">
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 2a1 1 0 011-1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2zm5 0v3h3M6 9h4M6 11h2"/></svg>
        </div>
        Consulter le devis complet en PDF
      </a>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>Signature électronique</h2>
      <p>Signez ci-dessous pour accepter le devis</p>
    </div>
    <div class="card-body">

      <div class="signed-banner" id="signed-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Ce devis a déjà été signé et accepté.
      </div>

      <div class="form-area" id="form-area">
        <div class="sig-label">Nom et prénom *</div>
        <input class="sig-input" id="signerName" type="text" placeholder="Jean Dupont" autocomplete="name"/>

        <div class="sig-label">Signature *</div>
        <div class="canvas-wrap" id="canvas-wrap">
          <canvas id="sig" width="1040" height="360"></canvas>
          <div class="canvas-placeholder" id="placeholder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            Signez ici avec votre doigt ou votre souris
          </div>
        </div>
        <button type="button" class="clear-btn" id="clear">Effacer la signature</button>

        <div class="consent">
          En validant, vous acceptez le devis <strong>${escapeHtml(p.quoteRef)}</strong> pour un montant de <strong>${escapeHtml(p.totalAmount)} €</strong> et reconnaissez avoir pris connaissance des conditions associées.
        </div>

        <button type="button" class="submit-btn" id="submit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Accepter et signer le devis
        </button>

        <p class="msg" id="msg"></p>
      </div>

      <div class="success-screen" id="success-screen">
        <div class="success-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3>Devis accepté !</h3>
        <p>Votre signature a bien été enregistrée.<br>${escapeHtml(p.clientName)}, merci de votre confiance.</p>
      </div>

    </div>
  </div>

  <p style="text-align:center;font-size:11px;color:#b0ae9e;margin-top:12px">Propulsé par PlombiCRM · Signature sécurisée</p>
</div>

<script>
const SUBMIT_DEFAULT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Accepter et signer le devis';
const canvas = document.getElementById('sig');
const ctx = canvas.getContext('2d');
ctx.lineWidth = 2.5;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.strokeStyle = '#1a1a18';
let drawing = false;
let hasSig = false;

const getPos = e => {
  const r = canvas.getBoundingClientRect();
  const scaleX = canvas.width / r.width;
  const scaleY = canvas.height / r.height;
  const src = e.touches ? e.touches[0] : e;
  return { x: (src.clientX - r.left) * scaleX, y: (src.clientY - r.top) * scaleY };
};

const start = e => {
  drawing = true;
  hasSig = true;
  document.getElementById('placeholder').classList.add('hidden');
  const pt = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pt.x, pt.y);
};
const move = e => {
  if (!drawing) return;
  e.preventDefault();
  const pt = getPos(e);
  ctx.lineTo(pt.x, pt.y);
  ctx.stroke();
};
const end = () => { drawing = false; };

canvas.addEventListener('mousedown', start);
canvas.addEventListener('mousemove', move);
canvas.addEventListener('mouseup', end);
canvas.addEventListener('mouseleave', end);
canvas.addEventListener('touchstart', start, { passive: true });
canvas.addEventListener('touchmove', move, { passive: false });
canvas.addEventListener('touchend', end);

document.getElementById('clear').onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSig = false;
  document.getElementById('placeholder').classList.remove('hidden');
};

function showMsg(text, type) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg ' + type;
}

document.getElementById('submit').onclick = async () => {
  const signerName = document.getElementById('signerName').value.trim();
  if (!signerName) {
    showMsg('Veuillez entrer votre nom et prénom.', 'error');
    document.getElementById('signerName').focus();
    return;
  }
  if (!hasSig) {
    showMsg('Veuillez apposer votre signature dans le cadre.', 'error');
    return;
  }
  const btn = document.getElementById('submit');
  btn.disabled = true;
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Enregistrement…';
  const dataUrl = canvas.toDataURL('image/png');
  try {
    const r = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signerName, signature: dataUrl })
    });
    let payload = {};
    try { payload = await r.json(); } catch (e) {}
    if (r.ok) {
      if (payload.alreadySigned) {
        document.getElementById('signed-banner').classList.add('show');
        document.getElementById('form-area').classList.add('hidden');
      } else {
        document.getElementById('form-area').classList.add('hidden');
        document.getElementById('success-screen').classList.add('show');
      }
    } else {
      showMsg(payload.message || "Erreur lors de l'enregistrement. Réessayez.", 'error');
      btn.disabled = false;
      btn.innerHTML = SUBMIT_DEFAULT;
    }
  } catch (err) {
    showMsg('Connexion impossible. Vérifiez votre réseau et réessayez.', 'error');
    btn.disabled = false;
    btn.innerHTML = SUBMIT_DEFAULT;
  }
};

(async () => {
  try {
    const r = await fetch(window.location.pathname + '?status=1');
    if (r.ok) {
      const p = await r.json();
      if (p.alreadySigned) {
        document.getElementById('signed-banner').classList.add('show');
        document.getElementById('form-area').classList.add('hidden');
      }
    }
  } catch (e) {}
})();
</script>
</body>
</html>`;

// ── Google Calendar ──

const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

const getGoogleCalendarClient = async (userId) => {
  const settings = await ensureSettings(userId);
  if (!settings.google_refresh_token) {
    return { ok: false, message: "Google Calendar non connecté." };
  }
  const oauthClient = getGoogleOAuthClient();
  oauthClient.setCredentials({ refresh_token: settings.google_refresh_token });
  return {
    ok: true,
    calendar: google.calendar({ version: "v3", auth: oauthClient }),
    calendarId: settings.google_calendar_id || "primary",
  };
};

const createGoogleCalendarEvent = async ({ userId, project, client }) => {
  let calendarPayload;
  try {
    calendarPayload = await getGoogleCalendarClient(userId);
  } catch (error) {
    return { ok: false, message: error.message };
  }
  if (!calendarPayload.ok) return { ok: false, message: calendarPayload.message };
  const { calendar, calendarId } = calendarPayload;
  const eventBody = {
    summary: `Chantier - ${project.name}`,
    description: [
      `Client: ${client?.name || ""}`,
      `Statut: ${project.status}`,
      project.responsible ? `Responsable: ${project.responsible}` : "",
      project.comment ? `Commentaire: ${project.comment}` : "",
    ].filter(Boolean).join("\n"),
    location: "Chantier",
    start: { dateTime: `${project.due_date}T08:00:00`, timeZone: "Europe/Paris" },
    end: { dateTime: `${project.due_date}T09:00:00`, timeZone: "Europe/Paris" },
  };

  let event;
  if (project.google_event_id) {
    try {
      const response = await calendar.events.update({
        calendarId, eventId: project.google_event_id, requestBody: eventBody,
      });
      event = response.data;
    } catch (err) {
      if (err?.code !== 404) {
        return { ok: false, message: "Google Calendar: impossible de mettre à jour l'événement." };
      }
    }
  }
  if (!event) {
    const response = await calendar.events.insert({ calendarId, requestBody: eventBody });
    event = response.data;
  }
  if (event?.id) {
    await db().from("projects").update({ google_event_id: event.id })
      .eq("id", project.id).eq("user_id", userId);
  }
  return { ok: true, url: event?.htmlLink || "" };
};

// ── Lazy init ──

let _initialized = false;
const ensureInit = async () => {
  if (_initialized) return;
  _initialized = true;
  try {
    const userId = await ensureSingleUser();
    cleanupDemoDataOnce(userId).catch((err) => console.error("Cleanup error:", err.message));
  } catch (err) {
    console.error("Init error:", err.message);
    _initialized = false;
  }
};

const isHealthCheck = (req) => req.path === "/api/health" || req.path === "/health";

app.use(async (req, res, next) => {
  if (isHealthCheck(req)) return next();
  await ensureInit();
  next();
});

// ── Routes ──

const healthHandler = (_req, res) => res.json({ ok: true });
app.get("/api/health", healthHandler);
app.get("/health", healthHandler);

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const { data: user } = await db().from("users").select("*").eq("email", email).maybeSingle();
  if (!user) return res.status(401).json({ message: "Identifiants invalides." });
  const ok = await bcrypt.compare(password || "", user.password_hash);
  if (!ok) return res.status(401).json({ message: "Identifiants invalides." });
  res.json({ token: signToken(user) });
});

app.get("/auth/google", async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send("Token manquant.");
  const user = getUserFromToken(token);
  if (!user) return res.status(401).send("Session invalide.");
  try {
    const oauthClient = getGoogleOAuthClient();
    const authUrl = oauthClient.generateAuthUrl({
      access_type: "offline", prompt: "consent", scope: GOOGLE_SCOPES, state: token,
    });
    res.redirect(authUrl);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.get("/auth/google/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send("Autorisation invalide.");
  const user = getUserFromToken(state);
  if (!user) return res.status(401).send("Session invalide.");
  try {
    const oauthClient = getGoogleOAuthClient();
    const { tokens } = await oauthClient.getToken(code);
    const settings = await ensureSettings(user.id);
    const refreshToken = tokens.refresh_token || settings.google_refresh_token;
    if (!refreshToken) {
      return res.status(400).send("Autorisation incomplète. Relancez la connexion Google Calendar.");
    }
    await db().from("settings").update({
      google_refresh_token: refreshToken,
      google_calendar_id: settings.google_calendar_id || "primary",
    }).eq("user_id", user.id);
    res.redirect(`${BASE_URL}/?google=connected`);
  } catch {
    res.status(400).send("Impossible de finaliser la connexion Google Calendar.");
  }
});

app.get("/api/google/status", auth, async (req, res) => {
  const settings = await ensureSettings(req.user.id);
  res.json({
    connected: Boolean(settings.google_refresh_token),
    configured: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
  });
});

app.post("/api/google/disconnect", auth, async (req, res) => {
  await db().from("settings").update({ google_refresh_token: null }).eq("user_id", req.user.id);
  res.json({ ok: true });
});

app.get("/api/bootstrap", auth, async (req, res) => {
  const userId = req.user.id;
  const { data: user } = await db().from("users").select("id, name, email").eq("id", userId).single();
  const { data: clients } = await db().from("clients").select("*").eq("user_id", userId);
  const { data: services } = await db().from("services").select("*").eq("user_id", userId);
  const { data: materials } = await db().from("materials").select("*").eq("user_id", userId);
  const { data: quotes } = await db().from("quotes").select("*").eq("user_id", userId).order("id", { ascending: false });
  const { data: projects } = await db().from("projects").select("*").eq("user_id", userId);
  const { data: notifications } = await db().from("notifications").select("*").eq("user_id", userId);
  const { data: integrations } = await db().from("integrations").select("*").eq("user_id", userId);
  const settings = await ensureSettings(userId);

  res.json({
    user: { ...user, initials: toInitials(user.name) },
    data: {
      clients: (clients || []).map(mapClient),
      services: (services || []).map(mapService),
      materials: (materials || []).map(mapMaterial),
      laborRate: settings?.labor_rate || 65,
      quotes: (quotes || []).map(mapQuote),
      projects: (projects || []).map(mapProject),
      notifications: (notifications || []).map(mapNotification),
      integrations: (integrations || []).map(mapIntegration),
      satisfaction: {
        score: settings?.satisfaction_score || 4.6,
        responses: settings?.satisfaction_responses || 0,
      },
    },
  });
});

app.post("/api/clients", auth, async (req, res) => {
  const { name, address, phone, email, segment, lastProject } = req.body || {};
  if (!name || !address || !phone || !segment) {
    return res.status(400).json({ message: "Champs client incomplets." });
  }
  const { data: client, error } = await db().from("clients")
    .insert({ user_id: req.user.id, name, address, phone, email: email || null, segment, last_project: lastProject || "Nouveau projet" })
    .select("*").single();
  if (error) return res.status(500).json({ message: error.message });
  res.json({ client: mapClient(client) });
});

app.post("/api/services", auth, async (req, res) => {
  const { name, basePrice } = req.body || {};
  if (!name || !Number.isFinite(Number(basePrice))) {
    return res.status(400).json({ message: "Service invalide." });
  }
  const { data: service, error } = await db().from("services")
    .insert({ user_id: req.user.id, name, base_price: Number(basePrice) })
    .select("*").single();
  if (error) return res.status(500).json({ message: error.message });
  res.json({ service: mapService(service) });
});

app.post("/api/quotes", auth, async (req, res) => {
  const { clientId, serviceId, materialId, hours, discount, sendEmail, materials, materialsTotal } = req.body || {};
  if (!clientId || !serviceId || !hours) {
    return res.status(400).json({ message: "Devis incomplet." });
  }
  const { data: clientExists } = await db().from("clients").select("id").eq("id", clientId).eq("user_id", req.user.id).maybeSingle();
  if (!clientExists) return res.status(400).json({ message: "Client introuvable." });

  const { data: service } = await db().from("services").select("*").eq("id", serviceId).eq("user_id", req.user.id).maybeSingle();
  if (!service) return res.status(400).json({ message: "Service introuvable." });

  const resolvedMaterialId = materialId || (await ensureCustomMaterial(req.user.id));
  const { data: material } = await db().from("materials").select("*").eq("id", resolvedMaterialId).eq("user_id", req.user.id).maybeSingle();

  const settings = await ensureSettings(req.user.id);
  const materialsValue = Number.isFinite(Number(materialsTotal)) ? Number(materialsTotal) : Number(material?.price || 0);
  const amount = computeQuote(service, materialsValue, Number(hours), settings.labor_rate, Number(discount || 0));
  const status = sendEmail ? "Envoyé" : "En attente";
  const sentAt = new Date().toISOString().slice(0, 10);
  const materialsDesc = Array.isArray(materials)
    ? materials.map((m) => `${m.name || "Matériau"} (${Number(m.price || 0)}€)`).join(", ")
    : null;

  const { data: quote, error } = await db().from("quotes")
    .insert({
      user_id: req.user.id, client_id: clientId, service_id: serviceId,
      material_id: resolvedMaterialId, hours, discount: discount || 0,
      amount, status, sent_at: sentAt, ack: false, materials_desc: materialsDesc,
      materials_total: materialsValue,
    })
    .select("*").single();
  if (error) return res.status(500).json({ message: error.message });

  let emailSent = false;
  if (sendEmail && transporter) {
    const { data: client } = await db().from("clients").select("*").eq("id", clientId).eq("user_id", req.user.id).maybeSingle();
    if (client?.email) {
      try {
        const quoteRef = `DV-${String(quote.id).padStart(5, "0")}`;
        const acceptToken = crypto.randomBytes(24).toString("hex");
        const laborTotal = settings.labor_rate * Number(hours);
        const materialsLineTotal = Number(materialsValue || 0);
        const pdfItems = Array.isArray(materials) && materials.length > 0
          ? (() => {
              const sec = (label) => ({ label, quantity: "", unitPrice: 0, total: 0, isSection: true });
              const list = [];
              list.push(sec("Prestation"));
              list.push({ label: service.name, quantity: "1", unitPrice: service.base_price, total: service.base_price });
              list.push(sec("Matériaux"));
              materials.forEach((m) => {
                const u = Number(m.price || 0);
                list.push({ label: m.name || "Matériau", quantity: "1", unitPrice: u, total: u });
              });
              list.push(sec("Main-d'œuvre"));
              list.push({ label: `Main-d'œuvre (${hours}h)`, quantity: Number(hours).toFixed(2), unitPrice: settings.labor_rate, total: laborTotal });
              return list;
            })()
          : buildItemsForQuote(service, hours, settings, materialsLineTotal);

        const subtotal = pdfItems.reduce((a, i) => a + (i.total || 0), 0);
        const discountRate = Number(discount || 0);
        const discountAmount = subtotal * (discountRate / 100);
        const subtotalAfterDiscount = subtotal - discountAmount;
        const taxRate = 10;
        const tax = subtotalAfterDiscount * (taxRate / 100);
        const total = subtotalAfterDiscount + tax;

        const pdfBuffer = await buildQuotePdf({
          quoteRef,
          client: { name: client.name, address: client.address, phone: client.phone, email: client.email },
          company: COMPANY_INFO, items: pdfItems,
          totals: { subtotal, tax, total, taxRate, date: sentAt, discount: discountRate, discountAmount },
        });

        const downloadUrl = await uploadPdf(`${quoteRef}.pdf`, pdfBuffer);
        await db().from("quotes").update({ accept_token: acceptToken }).eq("id", quote.id);

        const signUrl = `${BASE_URL}/public/sign/${acceptToken}`;
        await transporter.sendMail({
          from: process.env.SMTP_FROM || "PlombiCRM <no-reply@plombicrm.fr>",
          to: client.email,
          subject: "Votre devis plomberie BTP",
          text: `Bonjour ${client.name},\n\nVoici votre devis pour ${service.name}. Total estimé : ${amount} €.\n\nTélécharger le devis : ${downloadUrl}\n\nSigner électroniquement : ${signUrl}\n\nMerci,\nPlombiCRM`,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("Email error:", emailErr.message);
      }
    }
  }

  const { data: freshQuote } = await db().from("quotes").select("*").eq("id", quote.id).single();
  res.json({ quote: mapQuote(freshQuote || quote), emailSent });
});

app.post("/api/projects", auth, async (req, res) => {
  const { name, clientId, status, dueDate, responsible, comment } = req.body || {};
  if (!name || !clientId || !dueDate) {
    return res.status(400).json({ message: "Champs projet incomplets." });
  }
  const { data: clientExists } = await db().from("clients").select("id").eq("id", clientId).eq("user_id", req.user.id).maybeSingle();
  if (!clientExists) return res.status(400).json({ message: "Client introuvable." });

  const projectStatus = status || "Planifié";
  const progress = progressForStatus(projectStatus, 0);
  const { data: project, error } = await db().from("projects")
    .insert({
      user_id: req.user.id, name, client_id: clientId, status: projectStatus,
      progress, due_date: dueDate, responsible: responsible || "", comment: comment || "",
    })
    .select("*").single();
  if (error) return res.status(500).json({ message: error.message });

  await addNotification(req.user.id, `Nouveau chantier : ${name} (${projectStatus})`, notificationTypeForStatus(projectStatus));

  const { data: client } = await db().from("clients").select("*").eq("id", project.client_id).maybeSingle();
  const googleResult = await createGoogleCalendarEvent({ userId: req.user.id, project, client });
  if (googleResult && !googleResult.ok) console.warn(googleResult.message);

  res.json({ project: mapProject(project) });
});

app.patch("/api/quotes/:id/ack", auth, async (req, res) => {
  const quoteId = req.params.id;
  const { data: current } = await db().from("quotes").select("*").eq("id", quoteId).eq("user_id", req.user.id).maybeSingle();
  if (!current) return res.status(404).json({ message: "Devis introuvable." });
  const nextAck = !current.ack;
  await db().from("quotes").update({ ack: nextAck }).eq("id", quoteId).eq("user_id", req.user.id);
  const { data: quote } = await db().from("quotes").select("*").eq("id", quoteId).single();
  res.json({ quote: mapQuote(quote) });
});

app.patch("/api/quotes/:id/status", auth, async (req, res) => {
  const quoteId = req.params.id;
  const status = req.body?.status;
  const allowed = ["En attente", "Envoyé", "Accepté", "Refusé"];
  if (!allowed.includes(status)) return res.status(400).json({ message: "Statut invalide." });
  const { data: current } = await db().from("quotes").select("*").eq("id", quoteId).eq("user_id", req.user.id).maybeSingle();
  if (!current) return res.status(404).json({ message: "Devis introuvable." });
  await db().from("quotes").update({ status }).eq("id", quoteId).eq("user_id", req.user.id);
  const { data: quote } = await db().from("quotes").select("*").eq("id", quoteId).single();
  res.json({ quote: mapQuote(quote) });
});

app.get("/public/accept/:token", async (req, res) => {
  const { data: quote } = await db().from("quotes").select("*").eq("accept_token", req.params.token).maybeSingle();
  if (!quote) return res.status(404).send("Lien invalide.");
  if (quote.status !== "Accepté") {
    await db().from("quotes").update({ status: "Accepté", ack: true, accepted_at: new Date().toISOString() }).eq("id", quote.id);
  }
  res.send(`<html><body style="font-family:Arial,sans-serif;padding:40px;"><h2>Devis accepté</h2><p>Merci, votre devis est maintenant marqué comme accepté.</p></body></html>`);
});

app.get("/public/sign/:token", async (req, res) => {
  const { data: quote } = await db().from("quotes").select("*").eq("accept_token", req.params.token).maybeSingle();
  if (!quote) {
    if (req.query.status === "1") return res.status(404).json({ alreadySigned: false });
    return res.status(404).send("Lien invalide.");
  }
  if (req.query.status === "1") {
    return res.json({ alreadySigned: Boolean(quote.signature_data) });
  }

  const [{ data: client }, { data: service }, { data: settings }] = await Promise.all([
    db().from("clients").select("*").eq("id", quote.client_id).maybeSingle(),
    db().from("services").select("*").eq("id", quote.service_id).maybeSingle(),
    db().from("settings").select("*").eq("user_id", quote.user_id).maybeSingle(),
  ]);

  if (!service || !settings) {
    return res.status(500).send("Devis incomplet : impossible d'afficher la page.");
  }

  const quoteRef = `DV-${String(quote.id).padStart(5, "0")}`;
  const items = buildItemsForQuote(service, quote.hours, settings, Number(quote.materials_total || 0));
  const subtotal = items.reduce((a, i) => a + (i.total || 0), 0);
  const discountRate = Number(quote.discount || 0);
  const discountAmountNum = subtotal * (discountRate / 100);
  const subtotalAfterDiscount = subtotal - discountAmountNum;
  const taxRate = 10;
  const tax = subtotalAfterDiscount * (taxRate / 100);
  const totalTtc = subtotalAfterDiscount + tax;

  const serviceAmount = service.base_price;
  const materialsAmount = Number(quote.materials_total || 0);
  const laborAmount = settings.labor_rate * Number(quote.hours);

  const discountRowHtml =
    discountRate > 0
      ? `<div class="summary-row">
        <span class="label">Remise (${escapeHtml(String(discountRate))}%)</span>
        <span class="value">- ${escapeHtml(formatEuroPlain(discountAmountNum))} €</span>
      </div>`
      : "";

  let pdfUrl;
  try {
    pdfUrl = getQuotePdfPublicUrl(quoteRef);
  } catch {
    pdfUrl = "";
  }

  const html = buildElectronicSignPageHtml({
    quoteRef,
    clientName: client?.name || "Client",
    quoteDate: formatDate(quote.sent_at || new Date().toISOString()),
    serviceName: service.name,
    serviceAmount: formatEuroPlain(serviceAmount),
    materialsAmount: formatEuroPlain(materialsAmount),
    laborAmount: formatEuroPlain(laborAmount),
    totalAmount: formatEuroPlain(totalTtc),
    discountRowHtml,
    pdfUrl,
  });

  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    "X-PlombiCRM-Sign-Page": "v2",
  });
  res.type("html").send(html);
});

app.post("/public/sign/:token", async (req, res) => {
  const { signerName, signature } = req.body || {};
  const { data: quote } = await db().from("quotes").select("*").eq("accept_token", req.params.token).maybeSingle();
  if (!quote) return res.status(404).json({ message: "Lien invalide." });
  if (quote.signature_data) return res.json({ ok: true, alreadySigned: true });
  if (!signerName || !signature) return res.status(400).json({ message: "Signature invalide." });

  await db().from("quotes").update({
    status: "Accepté", ack: true, accepted_at: new Date().toISOString(),
    signature_name: signerName, signature_data: signature,
  }).eq("id", quote.id);

  const { data: client } = await db().from("clients").select("*").eq("id", quote.client_id).maybeSingle();
  const { data: service } = await db().from("services").select("*").eq("id", quote.service_id).maybeSingle();
  const { data: settings } = await db().from("settings").select("*").eq("user_id", quote.user_id).maybeSingle();

  if (service && settings) {
    const quoteRef = `DV-${String(quote.id).padStart(5, "0")}`;
    const items = buildItemsForQuote(service, quote.hours, settings, Number(quote.materials_total || 0));
    const subtotal = items.reduce((a, i) => a + (i.total || 0), 0);
    const discountRate = Number(quote.discount || 0);
    const discountAmount = subtotal * (discountRate / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxRate = 10;
    const tax = subtotalAfterDiscount * (taxRate / 100);
    const total = subtotalAfterDiscount + tax;
    const pdfBuffer = await buildQuotePdf({
      quoteRef,
      client: { name: client?.name, address: client?.address, phone: client?.phone, email: client?.email },
      company: COMPANY_INFO, items,
      totals: { subtotal, tax, total, taxRate, date: quote.sent_at, discount: discountRate, discountAmount },
      signature: { name: signerName, data: signature },
    });
    if (transporter && COMPANY_INFO.email) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || "PlombiCRM <no-reply@plombicrm.fr>",
          to: COMPANY_INFO.email,
          subject: `Devis signé ${quoteRef}`,
          text: `Le devis ${quoteRef} a été signé par ${signerName}.`,
          attachments: [{ filename: `${quoteRef}-signe.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
        });
      } catch (emailErr) {
        console.error("Email error:", emailErr.message);
      }
    }
  }
  res.json({ ok: true });
});

app.patch("/api/projects/:id", auth, async (req, res) => {
  const projectId = req.params.id;
  const { data: current } = await db().from("projects").select("*").eq("id", projectId).eq("user_id", req.user.id).maybeSingle();
  if (!current) return res.status(404).json({ message: "Projet introuvable." });

  const hasStatus = typeof req.body.status === "string" && req.body.status.trim() !== "";
  const progressRaw = req.body.progress ?? current.progress;
  const parsedProgress = Number(progressRaw);
  const progress = Number.isFinite(parsedProgress) ? Math.max(0, Math.min(100, parsedProgress)) : Number(current.progress || 0);
  let status = current.status;
  if (hasStatus) status = req.body.status;
  else if (progress >= 100) status = "Terminé";
  const finalProgress = hasStatus ? progressForStatus(status, progress) : progress;
  const responsible = typeof req.body.responsible === "string" ? req.body.responsible : current.responsible;
  const comment = typeof req.body.comment === "string" ? req.body.comment : current.comment;

  await db().from("projects").update({ progress: finalProgress, status, responsible, comment })
    .eq("id", projectId).eq("user_id", req.user.id);

  if (status !== current.status) {
    await addNotification(req.user.id, `Statut modifié : ${current.name} → ${status}`, notificationTypeForStatus(status));
  }

  const { data: project } = await db().from("projects").select("*").eq("id", projectId).single();
  res.json({ project: mapProject(project) });
});

app.post("/api/projects/:id/sync-calendar", auth, async (req, res) => {
  const projectId = req.params.id;
  const { data: project } = await db().from("projects").select("*").eq("id", projectId).eq("user_id", req.user.id).maybeSingle();
  if (!project) return res.status(404).json({ message: "Projet introuvable." });
  const { data: client } = await db().from("clients").select("*").eq("id", project.client_id).eq("user_id", req.user.id).maybeSingle();
  const googleResult = await createGoogleCalendarEvent({ userId: req.user.id, project, client });
  if (googleResult && !googleResult.ok) return res.status(400).json({ message: googleResult.message });
  res.json({ ok: true, url: googleResult.url });
});

app.patch("/api/integrations/:id", auth, async (req, res) => {
  await db().from("integrations").update({ enabled: Boolean(req.body.enabled) })
    .eq("id", req.params.id).eq("user_id", req.user.id);
  const { data: integration } = await db().from("integrations").select("*").eq("id", req.params.id).single();
  res.json({ integration: mapIntegration(integration) });
});

app.post("/api/reset", auth, async (req, res) => {
  await resetUserData(req.user.id);
  res.json({ ok: true });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// For local development
if (require.main === module) {
  app.listen(PORT, () => console.log(`PlombiCRM prêt sur http://localhost:${PORT}`));
}

module.exports = app;
