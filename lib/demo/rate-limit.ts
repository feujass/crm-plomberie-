import { createAdminClient } from "@/lib/supabase/admin";

export type DemoRateLimitResult = { ok: true } | { ok: false; reason: "monthly_cap" };

function monthKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }).slice(0, 7);
}

export function demoMonthlyCap(): number {
  const raw = process.env.DEMO_MONTHLY_CAP?.trim();
  if (!raw) return 500;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 500;
}

async function incrementMonthlyUsage(month: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.from("demo_monthly_usage").select("hit_count").eq("month_key", month).maybeSingle();
  const next = (data?.hit_count ?? 0) + 1;
  await admin
    .from("demo_monthly_usage")
    .upsert({ month_key: month, hit_count: next, updated_at: new Date().toISOString() });
}

/** Plafond mensuel global uniquement — la limite « 1 démo / navigateur » est gérée par le cookie de session. */
export async function assertDemoRateLimit(_req: Request): Promise<DemoRateLimitResult> {
  const admin = createAdminClient();
  const month = monthKey();

  const { data: monthly } = await admin.from("demo_monthly_usage").select("hit_count").eq("month_key", month).maybeSingle();
  if ((monthly?.hit_count ?? 0) >= demoMonthlyCap()) {
    return { ok: false, reason: "monthly_cap" };
  }

  return { ok: true };
}

export async function recordDemoUsage(_req: Request): Promise<void> {
  await incrementMonthlyUsage(monthKey());
}
