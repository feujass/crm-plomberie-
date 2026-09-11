import { isSupabaseDataMode } from "@/lib/supabase/env";
import { handleCronRoute } from "@/lib/supabase/routes-rest";

import { backendBaseUrl } from "./config";

export async function backendCronFetch(path: string, opts: RequestInit = {}) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) throw new Error("CRON_SECRET manquant");

  if (isSupabaseDataMode()) {
    return handleCronRoute(path, {
      method: opts.method,
      headers: {
        Authorization: `Bearer ${secret}`,
        ...(opts.headers as Record<string, string> | undefined),
      },
      body: opts.body,
    });
  }

  const base = backendBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...opts,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${secret}`,
      ...(opts.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    const detail =
      json && typeof json === "object" && json !== null && "detail" in json
        ? String((json as { detail: unknown }).detail)
        : `Backend cron error ${res.status}`;
    throw new Error(detail);
  }
  return json;
}
