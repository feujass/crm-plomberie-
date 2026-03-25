require("dotenv").config();
const path = require("path");
const fs = require("fs/promises");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const crypto = require("crypto");
const { google } = require("googleapis");
const { initDb, ensureSingleUser, resetUserData, cleanupDemoDataOnce } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
const QUOTES_DIR = path.join(__dirname, "public", "quotes");
const CALDAV_URL = process.env.ICLOUD_CALDAV_URL || "";
const CALDAV_CALENDAR_URL = process.env.ICLOUD_CALDAV_CALENDAR_URL || "";
const CALDAV_USER = process.env.ICLOUD_CALDAV_USER || "";
const CALDAV_PASS = process.env.ICLOUD_CALDAV_PASS || "";
const COMPANY_INFO = {
  name: process.env.COMPANY_NAME || "CRM Plomberie",
  address: process.env.COMPANY_ADDRESS || "Adresse de l'entreprise",
  phone: process.env.COMPANY_PHONE || "Téléphone entreprise",
  email: process.env.COMPANY_EMAIL || "contact@entreprise.fr",
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
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
  } catch (error) {
    res.status(401).json({ message: "Session expirée. Veuillez vous reconnecter." });
  }
};

const getUserFromToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const getGoogleRedirectUri = () => {
  if (GOOGLE_REDIRECT_URI) return GOOGLE_REDIRECT_URI;
  return `${BASE_URL}/auth/google/callback`;
};

const getGoogleOAuthClient = () => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google Calendar: identifiants non configurés.");
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, getGoogleRedirectUri());
};

const toInitials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const mapClient = (row) => ({
  id: row.id,
  name: row.name,
  address: row.address,
  phone: row.phone,
  email: row.email,
  segment: row.segment,
  lastProject: row.last_project || "Nouveau projet",
});

const mapService = (row) => ({
  id: row.id,
  name: row.name,
  basePrice: row.base_price,
});

const mapMaterial = (row) => ({
  id: row.id,
  name: row.name,
  price: row.price,
});

const mapQuote = (row) => ({
  id: row.id,
  clientId: row.client_id,
  serviceId: row.service_id,
  materialId: row.material_id,
  hours: row.hours,
  discount: row.discount,
  amount: row.amount,
  status: row.status,
  sentAt: row.sent_at,
  ack: Boolean(row.ack),
  materialsDesc: row.materials_desc || "",
  materialsTotal: row.materials_total || 0,
  acceptedAt: row.accepted_at || null,
});

const mapProject = (row) => ({
  id: row.id,
  name: row.name,
  clientId: row.client_id,
  status: row.status,
  progress: row.progress,
  dueDate: row.due_date,
  responsible: row.responsible || "",
  comment: row.comment || "",
});

const mapNotification = (row) => ({
  id: row.id,
  label: row.label,
  type: row.type,
});

const mapIntegration = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  enabled: Boolean(row.enabled),
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

const formatDateForIcs = (value) => value.replace(/-/g, "");
const formatDateTimeForIcs = (value, time = "080000") => `${formatDateForIcs(value)}T${time}`;

const extractHrefByLocalName = (xml, localName) => {
  const regex = new RegExp(
    `<[^>]*${localName}[^>]*>[\\s\\S]*?<[^>]*href[^>]*>([^<]+)</[^>]*href>`,
    "i"
  );
  const match = xml.match(regex);
  return match ? match[1] : null;
};

const propfind = async (url, depth, body) => {
  const auth = Buffer.from(`${CALDAV_USER}:${CALDAV_PASS}`).toString("base64");
  const response = await fetch(url, {
    method: "PROPFIND",
    headers: {
      Authorization: `Basic ${auth}`,
      Depth: String(depth),
      "Content-Type": "application/xml; charset=utf-8",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`PROPFIND ${response.status}`);
  }
  return response.text();
};

let resolvedCalDavUrl = null;

const normalizeCalendarUrl = (value) => (value.endsWith("/") ? value : `${value}/`);

const resolveCalDavCalendarUrl = async () => {
  if (!CALDAV_URL || !CALDAV_USER || !CALDAV_PASS) return null;
  if (resolvedCalDavUrl) return resolvedCalDavUrl;
  if (CALDAV_CALENDAR_URL) {
    resolvedCalDavUrl = normalizeCalendarUrl(CALDAV_CALENDAR_URL.trim());
    return resolvedCalDavUrl;
  }
  const baseUrl = CALDAV_URL.replace(/\/$/, "");
  if (baseUrl.includes("/calendars/")) {
    resolvedCalDavUrl = normalizeCalendarUrl(baseUrl);
    return resolvedCalDavUrl;
  }
  const principalXml = await propfind(
    baseUrl,
    0,
    `<?xml version="1.0" encoding="UTF-8"?>
      <D:propfind xmlns:D="DAV:">
        <D:prop>
          <D:current-user-principal/>
        </D:prop>
      </D:propfind>`
  );
  const principalHref = extractHrefByLocalName(principalXml, "current-user-principal");
  if (!principalHref) return null;
  const principalUrl = new URL(principalHref, baseUrl).toString();
  const homeXml = await propfind(
    principalUrl,
    0,
    `<?xml version="1.0" encoding="UTF-8"?>
      <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
        <D:prop>
          <C:calendar-home-set/>
        </D:prop>
      </D:propfind>`
  );
  const homeHref = extractHrefByLocalName(homeXml, "calendar-home-set");
  if (!homeHref) return null;
  const homeUrl = new URL(homeHref, baseUrl).toString();
  const calendarsXml = await propfind(
    homeUrl,
    1,
    `<?xml version="1.0" encoding="UTF-8"?>
      <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
        <D:prop>
          <D:resourcetype/>
        </D:prop>
      </D:propfind>`
  );
  const responses = calendarsXml.split(/<D:response>|<d:response>/i).slice(1);
  for (const response of responses) {
    if (!response.match(/<[^>]*:calendar\s*\/>/i)) continue;
    const hrefMatch = response.match(/<D:href>([^<]+)<\/D:href>|<d:href>([^<]+)<\/d:href>/i);
    const href = hrefMatch ? hrefMatch[1] || hrefMatch[2] : null;
    if (!href) continue;
    const calendarUrl = new URL(href, baseUrl).toString();
    resolvedCalDavUrl = normalizeCalendarUrl(calendarUrl);
    return resolvedCalDavUrl;
  }
  return null;
};

const createCalDavEvent = async ({ project, client }) => {
  if (!CALDAV_URL || !CALDAV_USER || !CALDAV_PASS) {
    return { ok: false, message: "CalDAV: identifiants non configurés." };
  }
  let calendarUrl;
  try {
    calendarUrl = await resolveCalDavCalendarUrl();
  } catch (error) {
    return { ok: false, message: `CalDAV: ${error.message}` };
  }
  if (!calendarUrl) {
    return { ok: false, message: "CalDAV: URL calendrier introuvable." };
  }
  const dtStart = formatDateTimeForIcs(project.due_date, "080000");
  const dtEnd = formatDateTimeForIcs(project.due_date, "090000");
  const description = [
    `Client: ${client?.name || ""}`,
    `Statut: ${project.status}`,
    project.responsible ? `Responsable: ${project.responsible}` : "",
    project.comment ? `Commentaire: ${project.comment}` : "",
  ]
    .filter(Boolean)
    .join("\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlombiCRM//FR",
    "CALSCALE:GREGORIAN",
    "X-WR-TIMEZONE:Europe/Paris",
    "BEGIN:VEVENT",
    `UID:project-${project.id}@plombicrm`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;TZID=Europe/Paris:${dtStart}`,
    `DTEND;TZID=Europe/Paris:${dtEnd}`,
    `SUMMARY:Chantier - ${project.name}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    `DESCRIPTION:${description}`,
    "LOCATION:Chantier",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const auth = Buffer.from(`${CALDAV_USER}:${CALDAV_PASS}`).toString("base64");
  const eventUrl = `${calendarUrl}project-${project.id}.ics`;
  const response = await fetch(eventUrl, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "text/calendar; charset=utf-8",
    },
    body: ics,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { ok: false, message: `CalDAV: erreur ${response.status}. ${text}`.trim() };
  }
  const verify = await fetch(eventUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  if (!verify.ok) {
    return { ok: false, message: `CalDAV: création OK, mais lecture impossible (${verify.status}).` };
  }
  return { ok: true, url: eventUrl };
};

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
  if (!calendarPayload.ok) {
    return { ok: false, message: calendarPayload.message };
  }
  const { calendar, calendarId } = calendarPayload;
  const startDate = `${project.due_date}T08:00:00`;
  const endDate = `${project.due_date}T09:00:00`;
  const description = [
    `Client: ${client?.name || ""}`,
    `Statut: ${project.status}`,
    project.responsible ? `Responsable: ${project.responsible}` : "",
    project.comment ? `Commentaire: ${project.comment}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const eventBody = {
    summary: `Chantier - ${project.name}`,
    description,
    location: "Chantier",
    start: { dateTime: startDate, timeZone: "Europe/Paris" },
    end: { dateTime: endDate, timeZone: "Europe/Paris" },
  };

  let event;
  if (project.google_event_id) {
    try {
      const response = await calendar.events.update({
        calendarId,
        eventId: project.google_event_id,
        requestBody: eventBody,
      });
      event = response.data;
    } catch (error) {
      if (error?.code !== 404) {
        return { ok: false, message: "Google Calendar: impossible de mettre à jour l'événement." };
      }
    }
  }

  if (!event) {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventBody,
    });
    event = response.data;
  }

  if (event?.id) {
    await db.run(`UPDATE projects SET google_event_id = ? WHERE id = ? AND user_id = ?`, [
      event.id,
      project.id,
      userId,
    ]);
  }

  return { ok: true, url: event?.htmlLink || "" };
};

const addNotification = async (userId, label, type) => {
  await db.run(`INSERT INTO notifications (user_id, label, type) VALUES (?, ?, ?)`, [
    userId,
    label,
    type,
  ]);
};

const computeQuote = (service, materialsTotal, hours, laborRate, discount) => {
  const base = service.base_price + materialsTotal + hours * laborRate;
  return Math.round(base - base * (discount / 100));
};

const ensureSettings = async (userId) => {
  let settings = await db.get(`SELECT * FROM settings WHERE user_id = ?`, [userId]);
  if (!settings) {
    await db.run(
      `INSERT INTO settings (user_id, labor_rate, satisfaction_score, satisfaction_responses)
       VALUES (?, ?, ?, ?)`,
      [userId, 65, 0, 0]
    );
    settings = await db.get(`SELECT * FROM settings WHERE user_id = ?`, [userId]);
  }
  return settings;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
    .format(value)
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ");

const formatDate = (value) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));

const buildQuotePdf = async ({ quoteRef, client, company, items, totals, signature }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, compress: true });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
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
    const colDesc = 50;
    const colQty = 360;
    const colUnit = 430;
    const colTotal = 510;

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
    doc.text(`Total HT`, 360, doc.y, { width: 120, align: "right" });
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
    const boxX = 48;
    const boxY = doc.y;
    const boxW = 220;
    const boxH = 80;
    doc
      .rect(boxX, boxY, boxW, boxH)
      .lineWidth(1)
      .strokeColor("#e5e7eb")
      .stroke();
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
  const sectionLine = (label) => ({
    label,
    quantity: "",
    unitPrice: 0,
    total: 0,
    isSection: true,
  });
  items.unshift(sectionLine("Prestation"));
  items.unshift({
    label: service.name,
    quantity: "1",
    unitPrice: service.base_price,
    total: service.base_price,
  });
  if (materialsValue > 0) {
    items.push(sectionLine("Matériaux"));
    items.push({ label: "Matériaux", quantity: "1", unitPrice: materialsValue, total: materialsValue });
  }
  items.push(sectionLine("Main-d'œuvre"));
  items.push({
    label: `Main-d'œuvre (${hours}h)`,
    quantity: Number(hours).toFixed(2),
    unitPrice: settings.labor_rate,
    total: settings.labor_rate * Number(hours),
  });
  return items;
};

const ensureCustomMaterial = async (userId) => {
  const existing = await db.get(
    `SELECT id FROM materials WHERE user_id = ? AND name = ?`,
    [userId, "Matériaux personnalisés"]
  );
  if (existing) return existing.id;
  const result = await db.run(
    `INSERT INTO materials (user_id, name, price) VALUES (?, ?, ?)`,
    [userId, "Matériaux personnalisés", 0]
  );
  return result.lastID;
};

let db;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);
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
  let oauthClient;
  try {
    oauthClient = getGoogleOAuthClient();
  } catch (error) {
    return res.status(400).send(error.message);
  }
  const authUrl = oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state: token,
  });
  res.redirect(authUrl);
});

app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  if (!code || !state) return res.status(400).send("Autorisation invalide.");
  const user = getUserFromToken(state);
  if (!user) return res.status(401).send("Session invalide.");
  let oauthClient;
  try {
    oauthClient = getGoogleOAuthClient();
  } catch (error) {
    return res.status(400).send(error.message);
  }
  try {
    const { tokens } = await oauthClient.getToken(code);
    const settings = await ensureSettings(user.id);
    const refreshToken = tokens.refresh_token || settings.google_refresh_token;
    if (!refreshToken) {
      return res
        .status(400)
        .send("Autorisation incomplète. Relancez la connexion Google Calendar.");
    }
    await db.run(
      `UPDATE settings SET google_refresh_token = ?, google_calendar_id = ? WHERE user_id = ?`,
      [refreshToken, settings.google_calendar_id || "primary", user.id]
    );
    res.redirect(`${BASE_URL}/?google=connected`);
  } catch (error) {
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
  await db.run(`UPDATE settings SET google_refresh_token = NULL WHERE user_id = ?`, [req.user.id]);
  res.json({ ok: true });
});

app.get("/api/bootstrap", auth, async (req, res) => {
  const userId = req.user.id;
  const user = await db.get(`SELECT id, name, email FROM users WHERE id = ?`, [userId]);

  const clients = (await db.all(`SELECT * FROM clients WHERE user_id = ?`, [userId])).map(mapClient);
  const services = (await db.all(`SELECT * FROM services WHERE user_id = ?`, [userId])).map(mapService);
  const materials = (await db.all(`SELECT * FROM materials WHERE user_id = ?`, [userId])).map(mapMaterial);
  const quotes = (await db.all(`SELECT * FROM quotes WHERE user_id = ? ORDER BY id DESC`, [userId])).map(
    mapQuote
  );
  const projects = (await db.all(`SELECT * FROM projects WHERE user_id = ?`, [userId])).map(mapProject);
  const notifications = (await db.all(`SELECT * FROM notifications WHERE user_id = ?`, [userId])).map(
    mapNotification
  );
  const integrations = (await db.all(`SELECT * FROM integrations WHERE user_id = ?`, [userId])).map(
    mapIntegration
  );
  const settings = await ensureSettings(userId);

  res.json({
    user: { ...user, initials: toInitials(user.name) },
    data: {
      clients,
      services,
      materials,
      laborRate: settings?.labor_rate || 65,
      quotes,
      projects,
      notifications,
      integrations,
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
  const result = await db.run(
    `INSERT INTO clients (user_id, name, address, phone, email, segment, last_project)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, name, address, phone, email || null, segment, lastProject || "Nouveau projet"]
  );
  const client = await db.get(`SELECT * FROM clients WHERE id = ?`, [result.lastID]);
  res.json({ client: mapClient(client) });
});

app.post("/api/services", auth, async (req, res) => {
  const { name, basePrice } = req.body || {};
  if (!name || !Number.isFinite(Number(basePrice))) {
    return res.status(400).json({ message: "Service invalide." });
  }
  const result = await db.run(
    `INSERT INTO services (user_id, name, base_price) VALUES (?, ?, ?)`,
    [req.user.id, name, Number(basePrice)]
  );
  const service = await db.get(`SELECT * FROM services WHERE id = ?`, [result.lastID]);
  res.json({ service: mapService(service) });
});

app.post("/api/quotes", auth, async (req, res) => {
  const { clientId, serviceId, materialId, hours, discount, sendEmail, materials, materialsTotal } =
    req.body || {};
  if (!clientId || !serviceId || !hours) {
    return res.status(400).json({ message: "Devis incomplet." });
  }
  const clientExists = await db.get(`SELECT id FROM clients WHERE id = ? AND user_id = ?`, [
    clientId,
    req.user.id,
  ]);
  if (!clientExists) {
    return res.status(400).json({ message: "Client introuvable." });
  }
  const service = await db.get(`SELECT * FROM services WHERE id = ? AND user_id = ?`, [
    serviceId,
    req.user.id,
  ]);
  if (!service) {
    return res.status(400).json({ message: "Service introuvable." });
  }
  const resolvedMaterialId = materialId || (await ensureCustomMaterial(req.user.id));
  const material = await db.get(`SELECT * FROM materials WHERE id = ? AND user_id = ?`, [
    resolvedMaterialId,
    req.user.id,
  ]);
  const settings = await ensureSettings(req.user.id);
  const materialsValue = Number.isFinite(Number(materialsTotal))
    ? Number(materialsTotal)
    : Number(material.price || 0);
  const amount = computeQuote(service, materialsValue, Number(hours), settings.labor_rate, Number(discount || 0));
  const status = sendEmail ? "Envoyé" : "En attente";
  const sentAt = new Date().toISOString().slice(0, 10);
  const materialsDesc = Array.isArray(materials)
    ? materials
        .map((item) => `${item.name || "Matériau"} (${Number(item.price || 0)}€)`)
        .join(", ")
    : null;

  const result = await db.run(
    `INSERT INTO quotes (user_id, client_id, service_id, material_id, hours, discount, amount, status, sent_at, ack, materials_desc, materials_total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      clientId,
      serviceId,
      resolvedMaterialId,
      hours,
      discount || 0,
      amount,
      status,
      sentAt,
      0,
      materialsDesc,
      materialsValue,
    ]
  );

  let emailSent = false;
  if (sendEmail && transporter) {
    const client = await db.get(`SELECT * FROM clients WHERE id = ? AND user_id = ?`, [
      clientId,
      req.user.id,
    ]);
    if (client?.email) {
      const quoteRef = `DV-${String(result.lastID).padStart(5, "0")}`;
      const acceptToken = crypto.randomBytes(24).toString("hex");
      const laborTotal = settings.labor_rate * Number(hours);
      const materialsLineTotal = Number(materialsValue || 0);
      const items =
        Array.isArray(materials) && materials.length > 0
          ? (() => {
              const sectionLine = (label) => ({
                label,
                quantity: "",
                unitPrice: 0,
                total: 0,
                isSection: true,
              });
              const list = [];
              list.unshift(sectionLine("Prestation"));
              list.unshift({
                label: service.name,
                quantity: "1",
                unitPrice: service.base_price,
                total: service.base_price,
              });
              list.push(sectionLine("Matériaux"));
              materials.forEach((item) => {
                const unit = Number(item.price || 0);
                list.push({ label: item.name || "Matériau", quantity: "1", unitPrice: unit, total: unit });
              });
              list.push(sectionLine("Main-d'œuvre"));
              list.push({
                label: `Main-d'œuvre (${hours}h)`,
                quantity: Number(hours).toFixed(2),
                unitPrice: settings.labor_rate,
                total: laborTotal,
              });
              return list;
            })()
          : buildItemsForQuote(service, hours, settings, materialsLineTotal);
      const subtotal = items.reduce((acc, item) => acc + item.total, 0);
      const discountRate = Number(discount || 0);
      const discountAmount = subtotal * (discountRate / 100);
      const subtotalAfterDiscount = subtotal - discountAmount;
      const taxRate = 10;
      const tax = subtotalAfterDiscount * (taxRate / 100);
      const total = subtotalAfterDiscount + tax;
      const pdfBuffer = await buildQuotePdf({
        quoteRef,
        client: {
          name: client.name,
          address: client.address,
          phone: client.phone,
          email: client.email,
        },
        company: COMPANY_INFO,
        items,
        totals: {
          subtotal,
          tax,
          total,
          taxRate,
          date: sentAt,
          discount: discountRate,
          discountAmount,
        },
      });
      await fs.mkdir(QUOTES_DIR, { recursive: true });
      const filename = `${quoteRef}.pdf`;
      const filePath = path.join(QUOTES_DIR, filename);
      await fs.writeFile(filePath, pdfBuffer);
      await db.run(`UPDATE quotes SET accept_token = ? WHERE id = ?`, [acceptToken, result.lastID]);
      const downloadUrl = `${BASE_URL}/public/quotes/${encodeURIComponent(filename)}`;
      const signUrl = `${BASE_URL}/public/sign/${acceptToken}`;
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "PlombiCRM <no-reply@plombicrm.fr>",
        to: client.email,
        subject: "Votre devis plomberie BTP",
        text: `Bonjour ${client.name},\n\nVoici votre devis pour ${service.name}. Total estimé : ${amount} €.\n\nTélécharger le devis : ${downloadUrl}\n\nSigner électroniquement : ${signUrl}\n\nMerci,\nPlombiCRM`,
      });
      emailSent = true;
    }
  }

  const quote = await db.get(`SELECT * FROM quotes WHERE id = ?`, [result.lastID]);
  res.json({ quote: mapQuote(quote), emailSent });
});

app.post("/api/projects", auth, async (req, res) => {
  const { name, clientId, status, dueDate, responsible, comment } = req.body || {};
  if (!name || !clientId || !dueDate) {
    return res.status(400).json({ message: "Champs projet incomplets." });
  }
  const clientExists = await db.get(`SELECT id FROM clients WHERE id = ? AND user_id = ?`, [
    clientId,
    req.user.id,
  ]);
  if (!clientExists) {
    return res.status(400).json({ message: "Client introuvable." });
  }
  const projectStatus = status || "Planifié";
  const progress = progressForStatus(projectStatus, 0);
  const result = await db.run(
    `INSERT INTO projects (user_id, name, client_id, status, progress, due_date, responsible, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, name, clientId, projectStatus, progress, dueDate, responsible || "", comment || ""]
  );
  await addNotification(
    req.user.id,
    `Nouveau chantier : ${name} (${projectStatus})`,
    notificationTypeForStatus(projectStatus)
  );
  const project = await db.get(`SELECT * FROM projects WHERE id = ?`, [result.lastID]);
  const client = await db.get(`SELECT * FROM clients WHERE id = ?`, [project.client_id]);
  const googleResult = await createGoogleCalendarEvent({ userId: req.user.id, project, client });
  if (googleResult && !googleResult.ok) {
    console.warn(googleResult.message);
  }
  res.json({ project: mapProject(project) });
});

app.patch("/api/quotes/:id/ack", auth, async (req, res) => {
  const quoteId = req.params.id;
  const current = await db.get(`SELECT * FROM quotes WHERE id = ? AND user_id = ?`, [quoteId, req.user.id]);
  if (!current) return res.status(404).json({ message: "Devis introuvable." });
  const nextAck = current.ack ? 0 : 1;
  await db.run(`UPDATE quotes SET ack = ? WHERE id = ? AND user_id = ?`, [nextAck, quoteId, req.user.id]);
  const quote = await db.get(`SELECT * FROM quotes WHERE id = ?`, [quoteId]);
  res.json({ quote: mapQuote(quote) });
});

app.patch("/api/quotes/:id/status", auth, async (req, res) => {
  const quoteId = req.params.id;
  const status = req.body?.status;
  const allowed = ["En attente", "Envoyé", "Accepté", "Refusé"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Statut invalide." });
  }
  const current = await db.get(`SELECT * FROM quotes WHERE id = ? AND user_id = ?`, [quoteId, req.user.id]);
  if (!current) return res.status(404).json({ message: "Devis introuvable." });
  await db.run(`UPDATE quotes SET status = ? WHERE id = ? AND user_id = ?`, [status, quoteId, req.user.id]);
  const quote = await db.get(`SELECT * FROM quotes WHERE id = ?`, [quoteId]);
  res.json({ quote: mapQuote(quote) });
});

app.get("/public/accept/:token", async (req, res) => {
  const token = req.params.token;
  const quote = await db.get(`SELECT * FROM quotes WHERE accept_token = ?`, [token]);
  if (!quote) return res.status(404).send("Lien invalide.");
  if (quote.status !== "Accepté") {
    await db.run(`UPDATE quotes SET status = ?, ack = 1, accepted_at = ? WHERE id = ?`, [
      "Accepté",
      new Date().toISOString(),
      quote.id,
    ]);
  }
  res.send(
    `<html><body style="font-family:Arial, sans-serif; padding:40px;">
      <h2>Devis accepté</h2>
      <p>Merci, votre devis est maintenant marqué comme accepté.</p>
    </body></html>`
  );
});

app.get("/public/sign/:token", async (req, res) => {
  const token = req.params.token;
  const quote = await db.get(`SELECT * FROM quotes WHERE accept_token = ?`, [token]);
  if (!quote) return res.status(404).send("Lien invalide.");
  res.send(
    `<html>
      <head>
        <meta charset="UTF-8" />
        <title>Signature électronique</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          canvas { border: 1px solid #ddd; border-radius: 8px; width: 100%; max-width: 520px; height: 200px; }
          .row { margin-bottom: 12px; }
          button { padding: 8px 12px; margin-right: 8px; }
        </style>
      </head>
      <body>
        <h2>Signature électronique</h2>
        <div class="row">
          <label>Nom et prénom</label><br/>
          <input id="signerName" type="text" style="padding:8px; width:100%; max-width:520px;" />
        </div>
        <div class="row">
          <canvas id="sig" width="520" height="200"></canvas>
        </div>
        <div class="row">
          <button id="clear">Effacer</button>
          <button id="submit">Valider la signature</button>
        </div>
        <p id="msg"></p>
        <script>
          const canvas = document.getElementById('sig');
          const ctx = canvas.getContext('2d');
          ctx.lineWidth = 2; ctx.lineCap = 'round';
          let drawing = false;
          const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            return { x, y };
          };
          const start = (e) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
          const move = (e) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
          const end = () => { drawing = false; };
          canvas.addEventListener('mousedown', start);
          canvas.addEventListener('mousemove', move);
          canvas.addEventListener('mouseup', end);
          canvas.addEventListener('mouseleave', end);
          canvas.addEventListener('touchstart', start, { passive: true });
          canvas.addEventListener('touchmove', move, { passive: true });
          canvas.addEventListener('touchend', end);
          document.getElementById('clear').onclick = () => { ctx.clearRect(0,0,canvas.width,canvas.height); };
          const submitBtn = document.getElementById('submit');
          submitBtn.onclick = async () => {
            const signerName = document.getElementById('signerName').value.trim();
            const dataUrl = canvas.toDataURL('image/png');
            submitBtn.disabled = true;
            const res = await fetch('/public/sign/${token}', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ signerName, signature: dataUrl })
            });
            const msg = document.getElementById('msg');
            if (res.ok) {
              const payload = await res.json();
              msg.textContent = payload.alreadySigned
                ? 'Ce devis est déjà signé.'
                : 'Signature enregistrée, devis accepté.';
            } else {
              msg.textContent = 'Erreur, signature non enregistrée.';
              submitBtn.disabled = false;
            }
          };
        </script>
      </body>
    </html>`
  );
});

app.post("/public/sign/:token", async (req, res) => {
  const token = req.params.token;
  const { signerName, signature } = req.body || {};
  const quote = await db.get(`SELECT * FROM quotes WHERE accept_token = ?`, [token]);
  if (!quote) return res.status(404).json({ message: "Lien invalide." });
  if (quote.signature_data) {
    return res.json({ ok: true, alreadySigned: true });
  }
  if (!signerName || !signature) {
    return res.status(400).json({ message: "Signature invalide." });
  }
  await db.run(
    `UPDATE quotes SET status = ?, ack = 1, accepted_at = ?, signature_name = ?, signature_data = ? WHERE id = ?`,
    ["Accepté", new Date().toISOString(), signerName, signature, quote.id]
  );
  const client = await db.get(`SELECT * FROM clients WHERE id = ?`, [quote.client_id]);
  const service = await db.get(`SELECT * FROM services WHERE id = ?`, [quote.service_id]);
  const settings = await db.get(`SELECT * FROM settings WHERE user_id = ?`, [quote.user_id]);
  const quoteRef = `DV-${String(quote.id).padStart(5, "0")}`;
  const items = buildItemsForQuote(service, quote.hours, settings, Number(quote.materials_total || 0));
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const discountRate = Number(quote.discount || 0);
  const discountAmount = subtotal * (discountRate / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxRate = 10;
  const tax = subtotalAfterDiscount * (taxRate / 100);
  const total = subtotalAfterDiscount + tax;
  const pdfBuffer = await buildQuotePdf({
    quoteRef,
    client: {
      name: client.name,
      address: client.address,
      phone: client.phone,
      email: client.email,
    },
    company: COMPANY_INFO,
    items,
    totals: {
      subtotal,
      tax,
      total,
      taxRate,
      date: quote.sent_at,
      discount: discountRate,
      discountAmount,
    },
    signature: { name: signerName, data: signature },
  });
  if (transporter && COMPANY_INFO.email) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "PlombiCRM <no-reply@plombicrm.fr>",
      to: COMPANY_INFO.email,
      subject: `Devis signé ${quoteRef}`,
      text: `Le devis ${quoteRef} a été signé par ${signerName}.`,
      attachments: [
        {
          filename: `${quoteRef}-signe.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  }
  res.json({ ok: true });
});

app.patch("/api/projects/:id", auth, async (req, res) => {
  const projectId = req.params.id;
  const current = await db.get(`SELECT * FROM projects WHERE id = ? AND user_id = ?`, [
    projectId,
    req.user.id,
  ]);
  if (!current) return res.status(404).json({ message: "Projet introuvable." });
  const hasStatus = typeof req.body.status === "string" && req.body.status.trim() !== "";
  const progressRaw = req.body.progress ?? current.progress;
  const parsedProgress = Number(progressRaw);
  const progress = Number.isFinite(parsedProgress)
    ? Math.max(0, Math.min(100, parsedProgress))
    : Number(current.progress || 0);
  let status = current.status;
  if (hasStatus) {
    status = req.body.status;
  } else if (progress >= 100) {
    status = "Terminé";
  }
  const finalProgress = hasStatus ? progressForStatus(status, progress) : progress;
  const responsible = typeof req.body.responsible === "string" ? req.body.responsible : current.responsible;
  const comment = typeof req.body.comment === "string" ? req.body.comment : current.comment;
  await db.run(
    `UPDATE projects SET progress = ?, status = ?, responsible = ?, comment = ? WHERE id = ? AND user_id = ?`,
    [finalProgress, status, responsible, comment, projectId, req.user.id]
  );
  if (status !== current.status) {
    await addNotification(
      req.user.id,
      `Statut modifié : ${current.name} → ${status}`,
      notificationTypeForStatus(status)
    );
  }
  const project = await db.get(`SELECT * FROM projects WHERE id = ?`, [projectId]);
  res.json({ project: mapProject(project) });
});

app.get("/api/projects/:id/ics", auth, async (req, res) => {
  const projectId = req.params.id;
  const project = await db.get(`SELECT * FROM projects WHERE id = ? AND user_id = ?`, [
    projectId,
    req.user.id,
  ]);
  if (!project) return res.status(404).json({ message: "Projet introuvable." });
  const client = await db.get(`SELECT * FROM clients WHERE id = ? AND user_id = ?`, [
    project.client_id,
    req.user.id,
  ]);
  const dtStart = formatDateTimeForIcs(project.due_date, "080000");
  const dtEnd = formatDateTimeForIcs(project.due_date, "090000");
  const description = [
    `Client: ${client?.name || ""}`,
    `Statut: ${project.status}`,
    project.responsible ? `Responsable: ${project.responsible}` : "",
    project.comment ? `Commentaire: ${project.comment}` : "",
  ]
    .filter(Boolean)
    .join("\\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlombiCRM//FR",
    "CALSCALE:GREGORIAN",
    "X-WR-TIMEZONE:Europe/Paris",
    "BEGIN:VEVENT",
    `UID:project-${project.id}@plombicrm`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;TZID=Europe/Paris:${dtStart}`,
    `DTEND;TZID=Europe/Paris:${dtEnd}`,
    `SUMMARY:Chantier - ${project.name}`,
    `DESCRIPTION:${description}`,
    "LOCATION:Chantier",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="chantier-${project.id}.ics"`);
  res.send(ics);
});

app.post("/api/projects/:id/sync-calendar", auth, async (req, res) => {
  const projectId = req.params.id;
  const project = await db.get(`SELECT * FROM projects WHERE id = ? AND user_id = ?`, [
    projectId,
    req.user.id,
  ]);
  if (!project) return res.status(404).json({ message: "Projet introuvable." });
  const client = await db.get(`SELECT * FROM clients WHERE id = ? AND user_id = ?`, [
    project.client_id,
    req.user.id,
  ]);
  const googleResult = await createGoogleCalendarEvent({ userId: req.user.id, project, client });
  if (googleResult && !googleResult.ok) {
    return res.status(400).json({ message: googleResult.message });
  }
  res.json({ ok: true, url: googleResult.url });
});

app.patch("/api/integrations/:id", auth, async (req, res) => {
  const integrationId = req.params.id;
  await db.run(`UPDATE integrations SET enabled = ? WHERE id = ? AND user_id = ?`, [
    req.body.enabled ? 1 : 0,
    integrationId,
    req.user.id,
  ]);
  const integration = await db.get(`SELECT * FROM integrations WHERE id = ?`, [integrationId]);
  res.json({ integration: mapIntegration(integration) });
});

app.post("/api/reset", auth, async (req, res) => {
  await resetUserData(db, req.user.id);
  res.json({ ok: true });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initDb()
  .then(async (database) => {
    db = database;
    const userId = await ensureSingleUser(db);
    await cleanupDemoDataOnce(db, userId);
    await fs.mkdir(QUOTES_DIR, { recursive: true });
    app.listen(PORT, () => {
      console.log(`PlombiCRM prêt sur http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Impossible de démarrer la base de données", error);
    process.exit(1);
  });
