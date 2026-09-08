import { SessionNotVerifiedError, SuperPdpApiError, TokenExpiredError } from "@/lib/facturation/pa/errors";
import { redactSecrets } from "@/lib/facturation/pa/redact";
import type { SuperPdpConfig } from "@/lib/facturation/pa/superpdp-config";

export type SuperPdpHttpMethod = "GET" | "POST" | "PATCH";

export interface SuperPdpHttpRequest {
  method: SuperPdpHttpMethod;
  path: string;
  accessToken?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  /** Si true, un 403 n’est pas transformé en SessionNotVerifiedError (ex. /oauth2_sessions/me). */
  allowForbidden?: boolean;
}

export interface SuperPdpHttpResponse {
  status: number;
  headers: Headers;
  text: string;
  json: unknown | null;
}

export type SuperPdpFetch = (input: string, init?: RequestInit) => Promise<Response>;

function buildQuery(query: SuperPdpHttpRequest["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === "") continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

function parseJsonSafe(text: string): unknown | null {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function messageFromSuperPdpBody(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) return body.trim();
  if (!body || typeof body !== "object") return fallback;
  const rec = body as Record<string, unknown>;
  for (const key of ["error_description", "message", "detail", "error", "title"]) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const errors = rec.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const nested = (first as Record<string, unknown>).message;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
  }
  return fallback;
}

export function formatSuperPdpErrorJournal(err: SuperPdpApiError): string {
  const body = redactSecrets(err.responseBody);
  const bodyText =
    body == null
      ? "(corps vide)"
      : typeof body === "string"
        ? body
        : JSON.stringify(body, null, 2);
  return [
    `### ${err.method} ${err.path} → HTTP ${err.httpStatus}`,
    "",
    err.message,
    "",
    "```json",
    bodyText,
    "```",
  ].join("\n");
}

export class SuperPdpHttp {
  constructor(
    private readonly config: SuperPdpConfig,
    private readonly fetchFn: SuperPdpFetch = fetch,
  ) {}

  get endpoint(): string {
    return this.config.endpoint;
  }

  get app() {
    return this.config.app;
  }

  async request(req: SuperPdpHttpRequest): Promise<SuperPdpHttpResponse> {
    const url = `${this.config.endpoint}${req.path}${buildQuery(req.query)}`;
    const headers = new Headers(req.headers);
    if (req.accessToken) {
      headers.set("Authorization", `Bearer ${req.accessToken}`);
    }
    if (req.body != null && !headers.has("Content-Type") && typeof req.body === "string") {
      headers.set("Content-Type", "application/json");
    }

    let res: Response;
    try {
      res = await this.fetchFn(url, {
        method: req.method,
        headers,
        body: req.body,
        cache: "no-store",
      });
    } catch (cause) {
      throw new SuperPdpApiError({
        method: req.method,
        path: req.path,
        status: 502,
        message: `Réseau Super PDP injoignable (${req.method} ${req.path}).`,
        responseBody: { cause: cause instanceof Error ? cause.message : String(cause) },
      });
    }

    const text = await res.text();
    const json = parseJsonSafe(text);
    const response: SuperPdpHttpResponse = { status: res.status, headers: res.headers, text, json };

    if (res.ok) return response;
    if (res.status === 403 && req.allowForbidden) return response;

    const message = messageFromSuperPdpBody(json ?? text, `Super PDP ${req.method} ${req.path} → HTTP ${res.status}`);

    if (res.status === 401 && req.path !== "/oauth2/token") {
      throw new TokenExpiredError(message);
    }
    if (res.status === 403) {
      throw new SessionNotVerifiedError(message);
    }

    throw new SuperPdpApiError({
      method: req.method,
      path: req.path,
      status: res.status,
      message,
      responseBody: json ?? text,
    });
  }
}
