import { cookies } from "next/headers";

import { backendBaseUrl } from "./config";

export type BackendFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string | undefined>;
  auth?: boolean;
};

export async function backendFetch(path: string, opts: BackendFetchOptions = {}) {
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

  const res = await fetch(url, {
    ...opts,
    headers: hdrs,
    cache: "no-store",
  });

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

