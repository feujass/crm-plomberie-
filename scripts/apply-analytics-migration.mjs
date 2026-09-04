#!/usr/bin/env node
/**
 * Applique les migrations analytics dashboard + funnel sur Supabase prod.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-analytics-migration.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = process.env.SUPABASE_PROJECT_REF || "uvgjcozdqxnrnfmkmlwa";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(root, ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error("❌ SUPABASE_ACCESS_TOKEN manquant.");
  console.error("   Crée un token : https://supabase.com/dashboard/account/tokens");
  console.error("   Puis : SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-analytics-migration.mjs");
  process.exit(1);
}

const sql = [
  "20260831180000_analytics_dashboard.sql",
  "20260831183000_analytics_funnel.sql",
  "20260831190000_human_engagement.sql",
  "20260904130000_analytics_is_internal_lot1.sql",
  "20260904160000_demo_voice_lot2.sql",
]
  .map((name) => readFileSync(resolve(root, "supabase/migrations", name), "utf8"))
  .join("\n\n");

console.log(`→ Application migrations analytics sur ${projectRef}…`);

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const body = await res.text();
if (!res.ok) {
  console.error("❌ Échec migration:", res.status, body.slice(0, 500));
  process.exit(1);
}

console.log("✓ Migrations analytics appliquées");
if (body.trim()) console.log(body.slice(0, 300));
