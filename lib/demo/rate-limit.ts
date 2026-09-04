import { createHash } from "node:crypto";

import { clientIp } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export type DemoRateLimitResult =
  | { ok: true }
  | { ok: false; reason: "daily" | "weekly" | "monthly_cap" };

function ipHash(ip: string): string {
  const salt = process.env.DEMO_IP_HASH_SALT?.trim() || "flowo-demo-v1";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function parisToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}

function parisWeekStart(): string {
  const now = new Date();
  const paris = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const day = paris.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  paris.setDate(paris.getDate() + diff);
  return paris.toISOString().slice(0, 10);
}

function monthKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }).slice(0, 7);
}

export function demoMonthlyCap(): number {
  const raw = process.env.DEMO_MONTHLY_CAP?.trim();
  if (!raw) return 500;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 500;
}

async function incrementCounter(
  table: "demo_rate_limit" | "demo_monthly_usage",
  key: Record<string, string>,
): Promise<number> {
  const admin = createAdminClient();
  if (table === "demo_monthly_usage") {
    const month_key = key.month_key!;
    const { data } = await admin.from("demo_monthly_usage").select("hit_count").eq("month_key", month_key).maybeSingle();
    const next = (data?.hit_count ?? 0) + 1;
    await admin.from("demo_monthly_usage").upsert({ month_key, hit_count: next, updated_at: new Date().toISOString() });
    return next;
  }

  const { ip_hash, window_type, window_start } = key;
  const { data } = await admin
    .from("demo_rate_limit")
    .select("hit_count")
    .eq("ip_hash", ip_hash)
    .eq("window_type", window_type)
    .eq("window_start", window_start)
    .maybeSingle();
  const next = (data?.hit_count ?? 0) + 1;
  await admin.from("demo_rate_limit").upsert({
    ip_hash,
    window_type,
    window_start,
    hit_count: next,
  });
  return next;
}

/** 1 démo / IP / 24 h, 3 / semaine, plafond mensuel global DEMO_MONTHLY_CAP. */
export async function assertDemoRateLimit(req: Request): Promise<DemoRateLimitResult> {
  const admin = createAdminClient();
  const hash = ipHash(clientIp(req));
  const today = parisToday();
  const weekStart = parisWeekStart();
  const month = monthKey();

  const { data: monthly } = await admin.from("demo_monthly_usage").select("hit_count").eq("month_key", month).maybeSingle();
  if ((monthly?.hit_count ?? 0) >= demoMonthlyCap()) {
    return { ok: false, reason: "monthly_cap" };
  }

  const { data: daily } = await admin
    .from("demo_rate_limit")
    .select("hit_count")
    .eq("ip_hash", hash)
    .eq("window_type", "day")
    .eq("window_start", today)
    .maybeSingle();
  if ((daily?.hit_count ?? 0) >= 1) {
    return { ok: false, reason: "daily" };
  }

  const { data: weekly } = await admin
    .from("demo_rate_limit")
    .select("hit_count")
    .eq("ip_hash", hash)
    .eq("window_type", "week")
    .eq("window_start", weekStart)
    .maybeSingle();
  if ((weekly?.hit_count ?? 0) >= 3) {
    return { ok: false, reason: "weekly" };
  }

  return { ok: true };
}

export async function recordDemoUsage(req: Request): Promise<void> {
  const hash = ipHash(clientIp(req));
  const today = parisToday();
  const weekStart = parisWeekStart();
  const month = monthKey();
  await incrementCounter("demo_rate_limit", { ip_hash: hash, window_type: "day", window_start: today });
  await incrementCounter("demo_rate_limit", { ip_hash: hash, window_type: "week", window_start: weekStart });
  await incrementCounter("demo_monthly_usage", { month_key: month });
}
