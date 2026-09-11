import type { NextRequest } from "next/server";

export function assertCronSecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  return auth.slice(7).trim() === expected;
}
