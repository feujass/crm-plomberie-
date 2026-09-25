import { cookies } from "next/headers";

import { isSupabaseDataMode } from "@/lib/supabase/env";
import { supabaseBackendFetch } from "@/lib/supabase/backend-bridge";

import { backendBaseUrl } from "./config";

export type BackendFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string | undefined>;
  auth?: boolean;
};

export async function backendFetch(path: string, opts: BackendFetchOptions = {}) {
  if (isSupabaseDataMode()) {
    return supabaseBackendFetch(path, opts);
  }

  const base = backendBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const hdrs: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers
      ? Object.fromEntries(
          Object.entries(opts.headers).filter(([, v]) => typeof v === "string") as [string, string][],
        )
      : {}),
  };

  if (opts.auth !== false) {
    const token = (await cookies()).get("access_token")?.value;
    if (token) hdrs.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...opts,
      headers: hdrs,
      cache: "no-store",
    });
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Connexion à l'API Flowo impossible (${base}). ${cause} — Vérifie BACKEND_URL dans .env.local et que FastAPI tourne : ` +
        `cd backend && uvicorn server:app --reload --host 127.0.0.1 --port 8000 (MongoDB sur 27017).`,
      { cause: e },
    );
  }

  const text = await res.text();
  const json = text ? safeJson(text) : null;

  if (!res.ok) {
    const detail = json && typeof json === "object" && json !== null ? (json as Record<string, unknown>).detail : undefined;
    const message = typeof detail === "string" ? detail : `Backend error ${res.status}`;
    const err: BackendFetchError = new Error(message);
    err.status = res.status;
    err.payload = json ?? text;
    throw err;
  }

  return json;
}

export type BackendFetchError = Error & { status?: number; payload?: unknown };

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

