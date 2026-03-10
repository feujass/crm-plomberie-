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

const formatDate = (value) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));

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

app.use(async (req, res, next) => {
  if (req.path === "/api/health") return next();
  await ensureInit();
  next();
});

// ── Routes ──

app.get("/api/health", (_req, res) => res.json({ ok: true }));

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
  if (!quote) return res.status(404).send("Lien invalide.");
  res.send(`<html>
    <head><meta charset="UTF-8"/><title>Signature électronique</title>
    <style>body{font-family:Arial,sans-serif;padding:24px}canvas{border:1px solid #ddd;border-radius:8px;width:100%;max-width:520px;height:200px}.row{margin-bottom:12px}button{padding:8px 12px;margin-right:8px}</style></head>
    <body><h2>Signature électronique</h2>
    <div class="row"><label>Nom et prénom</label><br/><input id="signerName" type="text" style="padding:8px;width:100%;max-width:520px;"/></div>
    <div class="row"><canvas id="sig" width="520" height="200"></canvas></div>
    <div class="row"><button id="clear">Effacer</button><button id="submit">Valider la signature</button></div>
    <p id="msg"></p>
    <script>
      const canvas=document.getElementById('sig'),ctx=canvas.getContext('2d');ctx.lineWidth=2;ctx.lineCap='round';let drawing=false;
      const getPos=e=>{const r=canvas.getBoundingClientRect();return{x:(e.touches?e.touches[0].clientX:e.clientX)-r.left,y:(e.touches?e.touches[0].clientY:e.clientY)-r.top}};
      const start=e=>{drawing=true;const p=getPos(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};
      const move=e=>{if(!drawing)return;const p=getPos(e);ctx.lineTo(p.x,p.y);ctx.stroke()};
      const end=()=>{drawing=false};
      canvas.addEventListener('mousedown',start);canvas.addEventListener('mousemove',move);canvas.addEventListener('mouseup',end);canvas.addEventListener('mouseleave',end);
      canvas.addEventListener('touchstart',start,{passive:true});canvas.addEventListener('touchmove',move,{passive:true});canvas.addEventListener('touchend',end);
      document.getElementById('clear').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height)};
      document.getElementById('submit').onclick=async()=>{
        const signerName=document.getElementById('signerName').value.trim();
        const dataUrl=canvas.toDataURL('image/png');
        document.getElementById('submit').disabled=true;
        const r=await fetch('/public/sign/${req.params.token}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({signerName,signature:dataUrl})});
        const msg=document.getElementById('msg');
        if(r.ok){const p=await r.json();msg.textContent=p.alreadySigned?'Ce devis est déjà signé.':'Signature enregistrée, devis accepté.';}
        else{msg.textContent='Erreur, signature non enregistrée.';document.getElementById('submit').disabled=false;}
      };
    </script></body></html>`);
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
