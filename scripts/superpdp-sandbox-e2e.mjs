/**
 * Test sandbox Super PDP : Burger Queen (vendeur) → Tricatel (acheteur).
 * Ne logge jamais les jetons. Journalise chaque erreur HTTP dans
 * docs/einvoicing-superpdp-sandbox.md
 *
 *   node scripts/superpdp-sandbox-e2e.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DOC = resolve(ROOT, "docs/einvoicing-superpdp-sandbox.md");

function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local");
  let raw = "";
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(".env.local introuvable");
  }
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") process.env[key] = val;
  }
}

function redact(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.startsWith("Bearer ")) return "Bearer [redacted]";
    if (value.length > 24 && /eyJ|[A-Za-z0-9_-]{32,}/.test(value) && /token|secret|jwt/i.test(value) === false) {
      return value;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const n = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      out[k] = n.includes("token") || n.includes("secret") || n === "authorization" ? "[redacted]" : redact(v);
    }
    return out;
  }
  return value;
}

const journal = [];

function logStep(title) {
  console.log(`\n== ${title} ==`);
  journal.push(`\n## ${title}\n`);
}

function logNote(text) {
  console.log(text);
  journal.push(`${text}\n`);
}

function logError({ method, path, status, body, note }) {
  const redacted = redact(body);
  const pretty = typeof redacted === "string" ? redacted : JSON.stringify(redacted, null, 2);
  console.error(`${method} ${path} → HTTP ${status}`);
  if (note) console.error(note);
  if (pretty) console.error(pretty.slice(0, 4000));
  journal.push(`### ${method} ${path} → HTTP ${status}\n`);
  if (note) journal.push(`${note}\n`);
  journal.push("```json\n");
  journal.push(`${pretty}\n`);
  journal.push("```\n");
}

function basicAuth(id, secret) {
  return `Basic ${Buffer.from(`${id}:${secret}`, "utf8").toString("base64")}`;
}

async function request(endpoint, { method, path, token, query, headers, body }) {
  const url = new URL(path, `${endpoint}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v == null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const hdrs = { Accept: "application/json", ...(headers ?? {}) };
  if (token) hdrs.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers: hdrs, body, cache: "no-store" });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, text, json, headers: res.headers, url: url.pathname + url.search };
}

async function token(endpoint, clientId, clientSecret, grant = "client_credentials") {
  const body = new URLSearchParams({ grant_type: grant });
  const res = await request(endpoint, {
    method: "POST",
    path: "/oauth2/token",
    headers: {
      Authorization: basicAuth(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    logError({
      method: "POST",
      path: "/oauth2/token",
      status: res.status,
      body: res.json ?? res.text,
      note: `grant_type=${grant} (client_id masqué, ${clientId.slice(0, 8)}…)`,
    });
    throw new Error(`token ${grant} HTTP ${res.status}`);
  }
  const access = res.json?.access_token;
  if (!access) {
    logError({
      method: "POST",
      path: "/oauth2/token",
      status: res.status,
      body: res.json ?? res.text,
      note: "Réponse 2xx sans access_token",
    });
    throw new Error("access_token manquant");
  }
  logNote(
    `POST /oauth2/token (${grant}) → HTTP ${res.status}. expires_in=${res.json?.expires_in ?? "?"} refresh=${Boolean(res.json?.refresh_token)} token_type=${res.json?.token_type ?? "?"}`,
  );
  return res.json;
}

async function main() {
  loadEnvLocal();
  const endpoint = (process.env.SUPERPDP_ENDPOINT || "https://api.superpdp.tech").replace(/\/+$/, "");
  const sellerId = process.env.SUPERPDP_SELLER_CLIENT_ID?.trim();
  const sellerSecret = process.env.SUPERPDP_SELLER_CLIENT_SECRET?.trim();
  const buyerId = process.env.SUPERPDP_BUYER_CLIENT_ID?.trim();
  const buyerSecret = process.env.SUPERPDP_BUYER_CLIENT_SECRET?.trim();
  if (!sellerId || !sellerSecret || !buyerId || !buyerSecret) {
    throw new Error("SUPERPDP_SELLER_* et SUPERPDP_BUYER_* requis dans .env.local");
  }

  journal.push("# Journal sandbox Super PDP (Burger Queen → Tricatel)\n");
  journal.push(`Date : ${new Date().toISOString()}\n`);
  journal.push(`Endpoint : \`${endpoint}\`\n`);
  journal.push(
    "Les identifiants (client_id / secret / access_token) ne sont **pas** recopiés ici. Chaque erreur HTTP rencontrée est documentée avec statut, chemin et corps (jetons masqués).\n",
  );

  logStep("1. Client credentials vendeur (Burger Queen)");
  const sellerTok = await token(endpoint, sellerId, sellerSecret);

  logStep("2. GET /v1.beta/oauth2_sessions/me (vendeur)");
  let me = await request(endpoint, {
    method: "GET",
    path: "/v1.beta/oauth2_sessions/me",
    token: sellerTok.access_token,
  });
  if (!me.ok) {
    logError({
      method: "GET",
      path: "/v1.beta/oauth2_sessions/me",
      status: me.status,
      body: me.json ?? me.text,
      note: "KYB / session — un 403 est attendu tant que company_verification_status ≠ verified.",
    });
  } else {
    logNote(`HTTP ${me.status} company_verification_status=${me.json?.company_verification_status ?? "?"} user=${me.json?.user_identity_verification_status ?? "?"}`);
  }

  logStep("3. GET /v1.beta/companies/me (vendeur)");
  let company = await request(endpoint, {
    method: "GET",
    path: "/v1.beta/companies/me",
    token: sellerTok.access_token,
  });
  if (!company.ok) {
    logError({
      method: "GET",
      path: "/v1.beta/companies/me",
      status: company.status,
      body: company.json ?? company.text,
    });
  } else {
    logNote(
      `HTTP ${company.status} id=${company.json?.id} number=${company.json?.number} scheme=${company.json?.number_scheme} name=${company.json?.formal_name ?? company.json?.trade_name} vat_regime=${JSON.stringify(company.json?.vat_regime)} has_vat_on_debits=${company.json?.has_vat_on_debits}`,
    );
  }

  logStep("4. PATCH /v1.beta/companies (régime TVA mensuel / encaissements)");
  const patch = await request(endpoint, {
    method: "PATCH",
    path: "/v1.beta/companies",
    token: sellerTok.access_token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vat_regime: "monthly", has_vat_on_debits: false }),
  });
  if (!patch.ok) {
    logError({
      method: "PATCH",
      path: "/v1.beta/companies",
      status: patch.status,
      body: patch.json ?? patch.text,
      note: "Mapping Flowo encaissements + périodicité monthly.",
    });
  } else {
    logNote(`HTTP ${patch.status} vat_regime=${JSON.stringify(patch.json?.vat_regime)} has_vat_on_debits=${patch.json?.has_vat_on_debits}`);
  }

  logStep("5. GET generate_test_invoice format=cii (B2B)");
  const gen = await request(endpoint, {
    method: "GET",
    path: "/v1.beta/invoices/generate_test_invoice",
    token: sellerTok.access_token,
    query: { format: "cii", b2c: "false" },
    headers: { Accept: "application/xml" },
  });
  if (!gen.ok) {
    logError({
      method: "GET",
      path: "/v1.beta/invoices/generate_test_invoice?format=cii&b2c=false",
      status: gen.status,
      body: gen.json ?? gen.text.slice(0, 2000),
    });
  } else {
    logNote(`HTTP ${gen.status} content-type=${gen.headers.get("content-type")} xml_bytes=${gen.text.length}`);
  }

  let invoiceXml = gen.ok ? gen.text : "";
  const looksLikeTricatel = /tricatel/i.test(invoiceXml);
  logNote(`XML de test mentionne Tricatel : ${looksLikeTricatel}`);

  if (!looksLikeTricatel) {
    logStep("5b. Chercher Tricatel (directory / french_directory)");
    for (const path of [
      "/v1.beta/french_directory/companies",
      "/v1.beta/directory_entries",
    ]) {
      const dir = await request(endpoint, {
        method: "GET",
        path,
        token: sellerTok.access_token,
        query: { q: "Tricatel", limit: 20 },
      });
      if (!dir.ok) {
        logError({ method: "GET", path: dir.url, status: dir.status, body: dir.json ?? dir.text });
      } else {
        const preview = JSON.stringify(redact(dir.json)).slice(0, 1500);
        logNote(`GET ${dir.url} → HTTP ${dir.status} ${preview}`);
      }
    }
  }

  logStep("6. POST /v1.beta/invoices processing_rule=B2B (XML CII)");
  const externalId = `flowo-e2e-${Date.now()}`.slice(0, 36);
  let created = null;
  if (invoiceXml) {
    const post = await request(endpoint, {
      method: "POST",
      path: "/v1.beta/invoices",
      token: sellerTok.access_token,
      query: { processing_rule: "B2B", external_id: externalId },
      headers: { "Content-Type": "application/xml", Accept: "application/json" },
      body: invoiceXml,
    });
    if (!post.ok) {
      logError({
        method: "POST",
        path: `/v1.beta/invoices?processing_rule=B2B&external_id=${externalId}`,
        status: post.status,
        body: post.json ?? post.text,
        note: "Émission B2B XML CII généré par Super PDP (vendeur = token).",
      });
    } else {
      created = post.json;
      logNote(`HTTP ${post.status} invoice_id=${created?.id} direction=${created?.direction} processing_rule=${created?.processing_rule} external_id=${created?.external_id}`);
    }
  } else {
    logNote("Pas de XML : POST invoices sauté.");
  }

  if (created?.id) {
    logStep("7. GET /v1.beta/invoice_events (vendeur)");
    const events = await request(endpoint, {
      method: "GET",
      path: "/v1.beta/invoice_events",
      token: sellerTok.access_token,
      query: { invoice_id: created.id, limit: 100 },
    });
    if (!events.ok) {
      logError({
        method: "GET",
        path: `/v1.beta/invoice_events?invoice_id=${created.id}`,
        status: events.status,
        body: events.json ?? events.text,
      });
    } else {
      const rows = Array.isArray(events.json?.data) ? events.json.data : [];
      logNote(`HTTP ${events.status} count=${rows.length} has_after=${events.json?.has_after}`);
      for (const e of rows) {
        logNote(`- event ${e.id} ${e.status_code} ${e.status_text} at ${e.created_at}`);
      }
    }
  }

  logStep("8. Client credentials acheteur (Tricatel)");
  const buyerTok = await token(endpoint, buyerId, buyerSecret);

  logStep("9. GET /v1.beta/companies/me (acheteur)");
  const buyerCo = await request(endpoint, {
    method: "GET",
    path: "/v1.beta/companies/me",
    token: buyerTok.access_token,
  });
  if (!buyerCo.ok) {
    logError({
      method: "GET",
      path: "/v1.beta/companies/me",
      status: buyerCo.status,
      body: buyerCo.json ?? buyerCo.text,
      note: "Session acheteur Tricatel",
    });
  } else {
    logNote(
      `HTTP ${buyerCo.status} id=${buyerCo.json?.id} number=${buyerCo.json?.number} scheme=${buyerCo.json?.number_scheme} name=${buyerCo.json?.formal_name ?? buyerCo.json?.trade_name}`,
    );
  }

  logStep("10. GET /v1.beta/invoices?direction=in (acheteur)");
  const incoming = await request(endpoint, {
    method: "GET",
    path: "/v1.beta/invoices",
    token: buyerTok.access_token,
    query: { direction: "in", limit: 20, order: "desc" },
  });
  if (!incoming.ok) {
    logError({
      method: "GET",
      path: "/v1.beta/invoices?direction=in",
      status: incoming.status,
      body: incoming.json ?? incoming.text,
    });
  } else {
    const rows = Array.isArray(incoming.json?.data) ? incoming.json.data : [];
    logNote(`HTTP ${incoming.status} count=${incoming.json?.count ?? rows.length}`);
    const match = created?.id != null ? rows.find((r) => String(r.id) === String(created.id) || r.external_id === externalId) : null;
    if (match) {
      logNote(`Facture reçue côté Tricatel : id=${match.id} external_id=${match.external_id} processing_rule=${match.processing_rule}`);
    } else if (created?.id) {
      logNote(`La facture vendeur id=${created.id} n’apparaît pas encore en direction=in (délai d’acheminement possible).`);
      journal.push("### Observation\nLa facture émise n’est pas encore listée en `direction=in` chez l’acheteur.\n");
    }
    for (const r of rows.slice(0, 5)) {
      logNote(`- in id=${r.id} external_id=${r.external_id} created_at=${r.created_at} processing_rule=${r.processing_rule}`);
    }
  }

  if (created?.id) {
    logStep("11. GET /v1.beta/invoice_events (acheteur, même invoice_id)");
    const buyEvents = await request(endpoint, {
      method: "GET",
      path: "/v1.beta/invoice_events",
      token: buyerTok.access_token,
      query: { invoice_id: created.id, limit: 100 },
    });
    if (!buyEvents.ok) {
      logError({
        method: "GET",
        path: `/v1.beta/invoice_events?invoice_id=${created.id}`,
        status: buyEvents.status,
        body: buyEvents.json ?? buyEvents.text,
        note: "Côté acheteur — l’id vendeur peut être inconnu (403/404 attendu).",
      });
    } else {
      const rows = Array.isArray(buyEvents.json?.data) ? buyEvents.json.data : [];
      logNote(`HTTP ${buyEvents.status} count=${rows.length}`);
      for (const e of rows) {
        logNote(`- event ${e.id} ${e.status_code} ${e.status_text}`);
      }
    }
  }

  logStep("12. POST /oauth2/token authorization_code sans code (erreur attendue)");
  const badCode = await request(endpoint, {
    method: "POST",
    path: "/oauth2/token",
    headers: {
      Authorization: basicAuth(sellerId, sellerSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: "invalid-flowo-code",
      redirect_uri: "http://localhost:3000/api/compte/e-facturation/callback",
    }).toString(),
  });
  logError({
    method: "POST",
    path: "/oauth2/token",
    status: badCode.status,
    body: badCode.json ?? badCode.text,
    note: "Erreur volontaire : authorization_code invalide — documente le format d’erreur OAuth.",
  });

  writeFileSync(DOC, journal.join(""), "utf8");
  console.log(`\nJournal écrit : ${DOC}`);
}

main().catch((err) => {
  journal.push(`\n## Échec script\n\n${err instanceof Error ? err.message : String(err)}\n`);
  try {
    writeFileSync(DOC, journal.join(""), "utf8");
  } catch {
    /* ignore */
  }
  console.error(err);
  process.exit(1);
});
