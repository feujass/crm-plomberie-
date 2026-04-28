import type { NextRequest } from "next/server";

export function assertCronSecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : request.nextUrl.searchParams.get("secret");
  return token === expected;
}
