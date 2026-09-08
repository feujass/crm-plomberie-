/**
 * Sondes OAuth2 authorization_code Super PDP (app Flowo).
 * Ne logge jamais client_secret / access_token / refresh_token.
 *
 *   node scripts/superpdp-oauth-authcode.mjs
 *   node scripts/superpdp-oauth-authcode.mjs --listen
 *   node scripts/superpdp-oauth-authcode.mjs --code <authorization_code>
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { webcrypto } from "node:crypto";

const ROOT = resolve(import.meta.dirname, "..");

function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local");
  const raw = readFileSync(path, "utf8");
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
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const n = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      out[k] =
        n.includes("token") || n.includes("secret") || n === "authorization" || n === "code"
          ? "[redacted]"
          : redact(v);
    }
    return out;
  }
  return value;
}

function basicAuth(id, secret) {
  return `Basic ${Buffer.from(`${id}:${secret}`, "utf8").toString("base64")}`;
}

function maskId(id) {
  if (!id) return "(absent)";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

async function request(endpoint, { method, path, token, query, headers, body, redirect = "manual" }) {
  const url = new URL(path, `${endpoint}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v == null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const hdrs = { Accept: "application/json", ...(headers ?? {}) };
  if (token) hdrs.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers: hdrs, body, cache: "no-store", redirect });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    ok: res.ok,
    status: res.status,
    text,
    json,
    location: res.headers.get("location"),
    contentType: res.headers.get("content-type"),
    url: url.pathname + url.search,
  };
}

async function token(endpoint, clientId, clientSecret, grant, extra = {}) {
  const body = new URLSearchParams({ grant_type: grant, ...extra });
  return request(endpoint, {
    method: "POST",
    path: "/oauth2/token",
    headers: {
      Authorization: basicAuth(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    redirect: "follow",
  });
}

function companySummary(json) {
  if (!json || typeof json !== "object") return json;
  return {
    id: json.id,
    number: json.number,
    number_scheme: json.number_scheme,
    formal_name: json.formal_name ?? json.name ?? json.legal_name,
    vat_regime: json.vat_regime,
    env: json.env,
  };
}

function sessionSummary(json) {
  if (!json || typeof json !== "object") return json;
  return {
    client_id: json.client_id ? maskId(json.client_id) : json.client_id,
    company_verification_status: json.company_verification_status,
    user_identity_verification_status: json.user_identity_verification_status,
    created_at: json.created_at,
    http_status_code: json.http_status_code,
    message: json.message,
    error: json.error,
    error_description: json.error_description,
  };
}

async function inspectWithToken(endpoint, access, label) {
  const session = await request(endpoint, {
    method: "GET",
    path: "/v1.beta/oauth2_sessions/me",
    token: access,
    redirect: "follow",
  });
  console.log(`\n[${label}] GET /v1.beta/oauth2_sessions/me → HTTP ${session.status}`);
  console.log(JSON.stringify(sessionSummary(session.json ?? { raw: session.text.slice(0, 400) }), null, 2));

  const me = await request(endpoint, {
    method: "GET",
    path: "/v1.beta/companies/me",
    token: access,
    redirect: "follow",
  });
  console.log(`[${label}] GET /v1.beta/companies/me → HTTP ${me.status}`);
  if (me.status === 403) {
    console.log("  *** 403 KYB observé ***");
    console.log(JSON.stringify(redact(me.json ?? me.text.slice(0, 800)), null, 2));
  } else {
    console.log(JSON.stringify(companySummary(me.json), null, 2));
  }
  return { session, me };
}

async function probeAuthorize(endpoint, clientId, redirectUri, extraQuery, label) {
  const query = {
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state: `flowo-probe-${label}`,
    ...extraQuery,
  };
  const res = await request(endpoint, { method: "GET", path: "/oauth2/authorize", query });
  const snippet = (res.text || "").replace(/\s+/g, " ").slice(0, 280);
  console.log(`\nGET /oauth2/authorize (${label}) → HTTP ${res.status}`);
  console.log(`  location: ${res.location ?? "(none)"}`);
  console.log(`  content-type: ${res.contentType ?? "(none)"}`);
  if (res.json) console.log(`  json: ${JSON.stringify(redact(res.json))}`);
  else if (snippet) console.log(`  body: ${snippet}`);
  return res;
}

async function runRefreshRotation(endpoint, clientId, clientSecret, refreshToken) {
  const first = await token(endpoint, clientId, clientSecret, "refresh_token", {
    refresh_token: refreshToken,
  });
  console.log(`\nPOST /oauth2/token refresh #1 → HTTP ${first.status}`);
  if (!first.ok) {
    console.log(JSON.stringify(redact(first.json ?? first.text), null, 2));
    return;
  }
  const r1 = first.json;
  console.log(
    `  expires_in=${r1.expires_in} token_type=${r1.token_type} has_refresh=${Boolean(r1.refresh_token)} refresh_changed=${r1.refresh_token && r1.refresh_token !== refreshToken}`,
  );

  const replay = await token(endpoint, clientId, clientSecret, "refresh_token", {
    refresh_token: refreshToken,
  });
  console.log(`POST /oauth2/token refresh replay ancien jeton → HTTP ${replay.status}`);
  console.log(JSON.stringify(redact(replay.json ?? replay.text), null, 2));

  if (r1.refresh_token) {
    const second = await token(endpoint, clientId, clientSecret, "refresh_token", {
      refresh_token: r1.refresh_token,
    });
    console.log(`POST /oauth2/token refresh #2 (nouveau jeton) → HTTP ${second.status}`);
    if (second.ok) {
      const r2 = second.json;
      console.log(
        `  expires_in=${r2.expires_in} has_refresh=${Boolean(r2.refresh_token)} refresh_changed_again=${r2.refresh_token && r2.refresh_token !== r1.refresh_token}`,
      );
    } else {
      console.log(JSON.stringify(redact(second.json ?? second.text), null, 2));
    }
  }
  return r1;
}

async function exchangeCode(endpoint, clientId, clientSecret, code, redirectUri) {
  const res = await token(endpoint, clientId, clientSecret, "authorization_code", {
    code,
    redirect_uri: redirectUri,
  });
  console.log(`\nPOST /oauth2/token authorization_code → HTTP ${res.status}`);
  if (!res.ok) {
    console.log(JSON.stringify(redact(res.json ?? res.text), null, 2));
    return null;
  }
  const json = res.json;
  console.log(
    `  expires_in=${json.expires_in} token_type=${json.token_type} has_refresh=${Boolean(json.refresh_token)} scope=${json.scope ?? "(none)"}`,
  );
  return json;
}

function printAuthorizeUrl(endpoint, clientId, redirectUri, extra = {}) {
  const url = new URL("/oauth2/authorize", `${endpoint}/`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", extra.state ?? `flowo-${webcrypto.randomUUID()}`);
  if (extra.loginHint) url.searchParams.set("login_hint", extra.loginHint);
  if (extra.companyNumber && extra.companyNumberScheme) {
    url.searchParams.set("superpdp_company_number", extra.companyNumber);
    url.searchParams.set("superpdp_company_number_scheme", extra.companyNumberScheme);
  }
  return url.toString();
}

async function listenForCode(redirectUri) {
  const parsed = new URL(redirectUri);
  const port = Number(parsed.port || 80);
  return new Promise((resolveListen, reject) => {
    const server = createServer((req, res) => {
      const incoming = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
      if (incoming.pathname !== parsed.pathname) {
        res.writeHead(404);
        res.end("not the oauth callback");
        return;
      }
      const code = incoming.searchParams.get("code");
      const error = incoming.searchParams.get("error");
      const desc = incoming.searchParams.get("error_description");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<!doctype html><meta charset="utf-8"><title>Flowo OAuth capture</title><p>${
          code ? "Code reçu. Vous pouvez fermer cet onglet." : `Erreur : ${error ?? "inconnue"}`
        }</p>`,
      );
      server.close();
      resolveListen({ code, error, desc, state: incoming.searchParams.get("state") });
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      console.log(`\nÉcoute du callback sur ${redirectUri}`);
    });
  });
}

async function main() {
  loadEnvLocal();
  const endpoint = (process.env.SUPERPDP_ENDPOINT || "https://api.superpdp.tech").replace(/\/+$/, "");
  const clientId = process.env.SUPERPDP_CLIENT_ID?.trim();
  const clientSecret = process.env.SUPERPDP_CLIENT_SECRET?.trim();
  const sellerId = process.env.SUPERPDP_SELLER_CLIENT_ID?.trim();
  const sellerSecret = process.env.SUPERPDP_SELLER_CLIENT_SECRET?.trim();
  const buyerId = process.env.SUPERPDP_BUYER_CLIENT_ID?.trim();
  const buyerSecret = process.env.SUPERPDP_BUYER_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.SUPERPDP_REDIRECT_URI?.trim() ||
    `${(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "")}/api/compte/e-facturation/callback`;

  if (!clientId || !clientSecret) throw new Error("SUPERPDP_CLIENT_ID / SECRET manquants");

  const args = process.argv.slice(2);
  const listen = args.includes("--listen");
  const codeIdx = args.indexOf("--code");
  const givenCode = codeIdx >= 0 ? args[codeIdx + 1] : process.env.SUPERPDP_AUTH_CODE?.trim();

  console.log("endpoint", endpoint);
  console.log("flowo_client_id", maskId(clientId));
  console.log("seller_client_id", maskId(sellerId));
  console.log("buyer_client_id", maskId(buyerId));
  console.log("redirect_uri", redirectUri);
  console.log("encryption_key", process.env.EINVOICING_TOKEN_ENCRYPTION_KEY ? "present" : "MISSING");
  console.log("provider", process.env.EINVOICING_PROVIDER);

  console.log("\n== 1. client_credentials app Flowo vs vendeur vs acheteur ==");
  const appTok = await token(endpoint, clientId, clientSecret, "client_credentials");
  console.log(
    `Flowo app client_credentials → HTTP ${appTok.status} refresh=${Boolean(appTok.json?.refresh_token)} expires_in=${appTok.json?.expires_in ?? "?"}`,
  );
  if (!appTok.ok) console.log(JSON.stringify(redact(appTok.json ?? appTok.text), null, 2));
  else await inspectWithToken(endpoint, appTok.json.access_token, "flowo-app-cc");

  if (sellerId && sellerSecret) {
    const sellerTok = await token(endpoint, sellerId, sellerSecret, "client_credentials");
    console.log(
      `\nSeller client_credentials → HTTP ${sellerTok.status} refresh=${Boolean(sellerTok.json?.refresh_token)}`,
    );
    if (sellerTok.ok) await inspectWithToken(endpoint, sellerTok.json.access_token, "seller-cc");
  }
  if (buyerId && buyerSecret) {
    const buyerTok = await token(endpoint, buyerId, buyerSecret, "client_credentials");
    console.log(
      `\nBuyer client_credentials → HTTP ${buyerTok.status} refresh=${Boolean(buyerTok.json?.refresh_token)}`,
    );
    if (buyerTok.ok) await inspectWithToken(endpoint, buyerTok.json.access_token, "buyer-cc");
  }

  console.log("\n== 2. GET /oauth2/authorize (app Flowo) ==");
  await probeAuthorize(endpoint, clientId, redirectUri, {}, "plain");
  await probeAuthorize(
    endpoint,
    clientId,
    redirectUri,
    { superpdp_company_number: "000000002", superpdp_company_number_scheme: "sandbox" },
    "prefill-BQ",
  );
  await probeAuthorize(
    endpoint,
    clientId,
    redirectUri,
    { superpdp_company_number: "000000001", superpdp_company_number_scheme: "sandbox" },
    "prefill-Tricatel",
  );
  await probeAuthorize(
    endpoint,
    clientId,
    "https://flowo.agency/api/compte/e-facturation/callback",
    {},
    "prod-redirect",
  );

  const authUrl = printAuthorizeUrl(endpoint, clientId, redirectUri, {
    companyNumber: "000000002",
    companyNumberScheme: "sandbox",
  });
  console.log("\nURL à ouvrir (prefill Burger Queen) :");
  console.log(authUrl);

  if (givenCode) {
    console.log("\n== 3. Échange du code ==");
    const tokens = await exchangeCode(endpoint, clientId, clientSecret, givenCode, redirectUri);
    if (tokens?.access_token) {
      await inspectWithToken(endpoint, tokens.access_token, "auth-code");
      if (tokens.refresh_token) {
        console.log("\n== 4. Refresh rotatif ==");
        const rotated = await runRefreshRotation(endpoint, clientId, clientSecret, tokens.refresh_token);
        if (rotated?.access_token) {
          await inspectWithToken(endpoint, rotated.access_token, "after-refresh");
        }
      } else {
        console.log("Pas de refresh_token sur authorization_code — rotation non testable.");
      }
    }
    return;
  }

  if (listen) {
    console.log("\n== 3. Attente du callback (ouvrez l’URL ci-dessus, connectez-vous, consentez) ==");
    const captured = await listenForCode(redirectUri);
    console.log("callback error:", captured.error ?? "(none)");
    if (captured.desc) console.log("callback desc:", captured.desc);
    if (!captured.code) {
      console.log("Pas de code — arrêt.");
      return;
    }
    console.log("code reçu (longueur)", captured.code.length);
    const tokens = await exchangeCode(endpoint, clientId, clientSecret, captured.code, redirectUri);
    if (tokens?.access_token) {
      await inspectWithToken(endpoint, tokens.access_token, "auth-code");
      if (tokens.refresh_token) {
        console.log("\n== 4. Refresh rotatif ==");
        await runRefreshRotation(endpoint, clientId, clientSecret, tokens.refresh_token);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
