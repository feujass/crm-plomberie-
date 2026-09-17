/**
 * Logique « IA » plombier : créneaux, comptes-rendus, liste matériaux, certificats.
 * Si OPENAI_API_KEY est définie, enrichissement via modèle (gpt-4o-mini par défaut).
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

async function openAiComplete(systemPrompt, userPrompt, maxTokens = 1800) {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.35,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    return typeof text === "string" ? text.trim() : null;
  } catch {
    return null;
  }
}

function suggestAppointmentSlots(count = 8) {
  const slots = [];
  const startFrom = new Date();
  startFrom.setHours(0, 0, 0, 0);
  const windows = [
    { h: 8, m: 0 },
    { h: 10, m: 0 },
    { h: 14, m: 0 },
    { h: 16, m: 30 },
  ];
  for (let day = 0; day < 28 && slots.length < count; day++) {
    const cur = new Date(startFrom);
    cur.setDate(startFrom.getDate() + day);
    const wd = cur.getDay();
    if (wd === 0 || wd === 6) continue;
    for (const w of windows) {
      if (slots.length >= count) break;
      const start = new Date(cur);
      start.setHours(w.h, w.m, 0, 0);
      if (start.getTime() <= Date.now() + 15 * 60 * 1000) continue;
      const label = `${start.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })} · ${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
      slots.push({ start: start.toISOString(), label });
    }
  }
  return slots;
}

function reportFromTranscriptLocal(transcript, { clientName, siteAddress, companyName }) {
  const t = String(transcript || "").trim();
  const today = new Date().toLocaleDateString("fr-FR", { dateStyle: "long" });
  return (
    `# Compte rendu d'intervention\n\n` +
    `**Date :** ${today}\n` +
    `**Client :** ${clientName || "—"}\n` +
    `**Lieu des travaux :** ${siteAddress || "—"}\n\n` +
    `## Synthèse (dictée)\n\n${t || "_Transcription vide — compléter._"}\n\n` +
    `## Travaux réalisés\n\n` +
    `- À détailler à partir de la synthèse ci-dessus.\n\n` +
    `## Contrôles et recommandations\n\n` +
    `- Vérifier étanchéité et fonctionnement après mise en service.\n` +
    `- En cas de fuite ou anomalie, contacter l'entreprise.\n\n` +
    `---\n*Document généré par ${companyName} — brouillon à valider avant envoi au client.*\n`
  );
}

async function reportFromTranscript(transcript, ctx) {
  const local = reportFromTranscriptLocal(transcript, ctx);
  const ai = await openAiComplete(
    `Tu es un assistant pour un plombier en France. Rédige un compte rendu d'intervention professionnel en markdown, sections : ` +
      `Résumé, Travaux effectués (puces), Matériel / pièces mentionnées, Recommandations au client, Prochaines étapes si besoin. ` +
      `Reste factuel à partir de la dictée. Ton sobre et clair. Ne invente pas de travaux absents de la dictée.`,
    `Dictée du technicien :\n---\n${transcript}\n---\n\nClient : ${ctx.clientName || "—"}\nLieu : ${ctx.siteAddress || "—"}`,
    2000
  );
  return ai || local;
}

function parseMaterialsDesc(desc) {
  const s = String(desc || "").trim();
  if (!s) return [];
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  const lines = [];
  for (const part of parts) {
    const m = part.match(/^(.+?)\s*\(([\d\s.,]+)\s*€?\)\s*$/);
    if (m) {
      const price = Number(String(m[2]).replace(/\s/g, "").replace(",", "."));
      lines.push({
        name: m[1].trim(),
        quantity: 1,
        unit: "u",
        unitPrice: Number.isFinite(price) ? price : null,
        supplier: "Fournisseur habituel / grande surface",
        notes: "",
      });
    } else {
      lines.push({
        name: part,
        quantity: 1,
        unit: "u",
        unitPrice: null,
        supplier: "À préciser",
        notes: "",
      });
    }
  }
  return lines;
}

function materialOrderLinesLocal(quote, serviceName) {
  const fromDesc = parseMaterialsDesc(quote.materials_desc);
  if (fromDesc.length > 0) return fromDesc;
  const total = Number(quote.materials_total || 0);
  if (total > 0) {
    return [
      {
        name: `Matériaux — ${serviceName || "prestation"}`,
        quantity: 1,
        unit: "forfait",
        unitPrice: total,
        supplier: "Selon devis",
        notes: "Montant global matériaux du devis",
      },
    ];
  }
  return [
    {
      name: "Matériaux à préciser",
      quantity: 1,
      unit: "u",
      unitPrice: null,
      supplier: "—",
      notes: "Compléter depuis le chantier",
    },
  ];
}

async function materialOrderLinesFromQuote(quote, serviceName) {
  const local = materialOrderLinesLocal(quote, serviceName);
  const ai = await openAiComplete(
    `Tu es un approvisionneur pour un plombier en France. À partir du devis (texte matériaux + montant), ` +
      `propose une liste JSON STRICTE d'objets : [{"name","quantity","unit","unitPrice","supplier","notes"}]. ` +
      `quantity est un nombre. unitPrice nombre ou null. supplier : suggestion courte (ex. Leroy Merlin, Sanitaire-distribution, grossiste local). ` +
      `Réponds UNIQUEMENT au tableau JSON, sans markdown.`,
    `Service : ${serviceName || "—"}\nMatériaux (texte) : ${quote.materials_desc || "—"}\nTotal matériaux HT : ${quote.materials_total ?? 0} €\nHeures MO : ${quote.hours}`,
    1200
  );
  if (!ai) return local;
  try {
    const parsed = JSON.parse(ai.replace(/^```[\w]*\n?|\n?```$/g, "").trim());
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* ignore */
  }
  return local;
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return new Date();
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

function formatDateIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

function buildCertificateBody({
  companyName,
  companyAddress,
  companyPhone,
  clientName,
  clientAddress,
  workSummary,
  startDate,
  endDate,
  warrantyMonths,
}) {
  return (
    `ATTESTATION DE GARANTIE — TRAVAUX DE PLOMBERIE\n\n` +
    `${companyName}\n${companyAddress}\nTél. ${companyPhone}\n\n` +
    `Client : ${clientName}\nAdresse d'intervention : ${clientAddress || "—"}\n\n` +
    `Nature des travaux :\n${workSummary || "—"}\n\n` +
    `Date de réception des travaux : ${startDate}\n` +
    `Durée de la garantie de parfait achèvement : ${warrantyMonths} mois\n` +
    `Date de fin de garantie : ${endDate}\n\n` +
    `Le présent document atteste de l'application de la garantie légale de parfait achèvement sur les travaux décrits, ` +
    `dans les conditions prévues par le Code civil et le Code de la construction et de l'habitation.\n\n` +
    `Pour toute demande SAV, merci de contacter ${companyName} en joignant la présente attestation.\n`
  );
}

async function polishCertificateText(draft, ctx) {
  const ai = await openAiComplete(
    `Tu reformules une attestation de garantie plomberie (France) en français administratif clair, sans ajouter de clauses juridiques inventées. ` +
      `Garde les dates et durées fournies. Réponse : texte seul, pas de markdown.`,
    `Brouillon :\n${draft}\n\nContexte entreprise : ${ctx.companyName}, client : ${ctx.clientName}`,
    900
  );
  return ai || draft;
}

module.exports = {
  openAiComplete,
  suggestAppointmentSlots,
  reportFromTranscript,
  reportFromTranscriptLocal,
  materialOrderLinesFromQuote,
  materialOrderLinesLocal,
  buildCertificateBody,
  polishCertificateText,
  addMonths,
  formatDateIsoDate,
};
