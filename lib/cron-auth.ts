import { createHash, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * Vercel Cron envoie `Authorization: Bearer $CRON_SECRET` lorsque
 * `CRON_SECRET` est défini dans les variables d’environnement du projet.
 */
export function assertCronSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const got = auth.slice(7).trim();
  if (!got) return false;
  return timingSafeEqual(sha256(got), sha256(expected));
}
