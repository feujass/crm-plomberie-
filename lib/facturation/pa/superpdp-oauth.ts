import { SuperPdpApiError, TokenExpiredError } from "@/lib/facturation/pa/errors";
import type { SuperPdpHttp } from "@/lib/facturation/pa/superpdp-http";
import { messageFromSuperPdpBody } from "@/lib/facturation/pa/superpdp-http";
import type { AuthorizationStartInput, OAuthTokenSet } from "@/lib/facturation/pa/types";

const TOKEN_SKEW_SECONDS = 30;

export function buildSuperPdpAuthorizationUrl(
  endpoint: string,
  clientId: string,
  input: AuthorizationStartInput,
): string {
  const url = new URL("/oauth2/authorize", `${endpoint}/`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  if (input.loginHint?.trim()) url.searchParams.set("login_hint", input.loginHint.trim());
  if (input.companyNumber?.trim() && input.companyNumberScheme) {
    url.searchParams.set("superpdp_company_number", input.companyNumber.trim());
    url.searchParams.set("superpdp_company_number_scheme", input.companyNumberScheme);
  }
  return url.toString();
}

export function parseOAuthTokenResponse(json: unknown, fallbackRefresh?: string | null): OAuthTokenSet {
  if (!json || typeof json !== "object") {
    throw new SuperPdpApiError({
      method: "POST",
      path: "/oauth2/token",
      status: 502,
      message: "Réponse jeton Super PDP illisible.",
      responseBody: json,
    });
  }
  const rec = json as Record<string, unknown>;
  const accessToken = typeof rec.access_token === "string" ? rec.access_token : "";
  if (!accessToken) {
    throw new SuperPdpApiError({
      method: "POST",
      path: "/oauth2/token",
      status: 502,
      message: messageFromSuperPdpBody(json, "access_token Super PDP manquant."),
      responseBody: json,
    });
  }
  const refresh =
    typeof rec.refresh_token === "string" && rec.refresh_token
      ? rec.refresh_token
      : (fallbackRefresh ?? null);
  const expiresInRaw = rec.expires_in;
  const expiresIn =
    typeof expiresInRaw === "number"
      ? expiresInRaw
      : typeof expiresInRaw === "string"
        ? Number(expiresInRaw)
        : 3600;
  const ttl = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
  return {
    accessToken,
    refreshToken: refresh,
    tokenType: "Bearer",
    expiresAt: new Date(Date.now() + Math.max(ttl - TOKEN_SKEW_SECONDS, 30) * 1000).toISOString(),
  };
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`;
}

async function postToken(
  http: SuperPdpHttp,
  body: URLSearchParams,
): Promise<OAuthTokenSet> {
  const { app } = http;
  const res = await http.request({
    method: "POST",
    path: "/oauth2/token",
    allowForbidden: true,
    headers: {
      Authorization: basicAuthHeader(app.clientId, app.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  return parseOAuthTokenResponse(res.json);
}

export async function exchangeSuperPdpAuthorizationCode(
  http: SuperPdpHttp,
  input: { code: string; redirectUri: string },
): Promise<OAuthTokenSet> {
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", input.code);
  body.set("redirect_uri", input.redirectUri);
  return postToken(http, body);
}

export async function refreshSuperPdpAccessToken(http: SuperPdpHttp, tokens: OAuthTokenSet): Promise<OAuthTokenSet> {
  if (!tokens.refreshToken) {
    throw new TokenExpiredError("Aucun refresh_token Super PDP — reconnectez l’entreprise.");
  }
  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", tokens.refreshToken);
  const next = await postToken(http, body);
  if (!next.refreshToken) next.refreshToken = tokens.refreshToken;
  return next;
}

/** Client credentials — accès aux données de *cette* application (sandbox vendeur / acheteur). */
export async function exchangeSuperPdpClientCredentials(
  http: SuperPdpHttp,
  credentials?: { clientId: string; clientSecret: string },
): Promise<OAuthTokenSet> {
  const app = credentials ?? http.app;
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  const res = await http.request({
    method: "POST",
    path: "/oauth2/token",
    allowForbidden: true,
    headers: {
      Authorization: basicAuthHeader(app.clientId, app.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  return parseOAuthTokenResponse(res.json);
}
