import { NextResponse, type NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { assertCronSecret } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

function loadMigrationSql() {
  const root = process.cwd();
  const files = [
    "supabase/migrations/20260831180000_analytics_dashboard.sql",
    "supabase/migrations/20260831183000_analytics_funnel.sql",
  ];
  return files.map((f) => readFileSync(resolve(root, f), "utf8")).join("\n\n");
}

export async function GET(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      {
        error: "SUPABASE_ACCESS_TOKEN manquant sur Vercel.",
        hint: "Ajoute-le dans Project Settings → Environment Variables, puis redéploie.",
      },
      { status: 503 },
    );
  }

  const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || "uvgjcozdqxnrnfmkmlwa";
  const query = loadMigrationSql();

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json({ ok: false, status: res.status, detail: text.slice(0, 500) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, detail: text.slice(0, 300) || "Migration appliquée" });
}
