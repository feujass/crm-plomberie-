#!/usr/bin/env node
/** Vérifie si le schéma analytics dashboard est appliqué (sans afficher de secrets). */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (!process.env[key]) process.env[key] = raw.replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("MISSING_ENV");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function checkTable(name) {
  const res = await fetch(`${url}/rest/v1/${name}?select=*&limit=0`, { headers });
  return { name, status: res.status, ok: res.ok, detail: res.ok ? "exists" : (await res.text()).slice(0, 120) };
}

async function checkColumn(table, column) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${column}&limit=1`, { headers });
  return { column, ok: res.ok, detail: res.ok ? "exists" : (await res.text()).slice(0, 120) };
}

const tables = ["analytics_events", "analytics_sessions", "analytics_ad_spend", "analytics_milestones"];
const columns = ["utm_source", "device", "is_internal", "properties", "field"];

for (const t of tables) {
  const r = await checkTable(t);
  console.log(`table:${t}`, r.ok ? "OK" : "MISSING", r.detail);
}

for (const c of columns) {
  const r = await checkColumn("analytics_events", c);
  console.log(`column:${c}`, r.ok ? "OK" : "MISSING", r.detail);
}
