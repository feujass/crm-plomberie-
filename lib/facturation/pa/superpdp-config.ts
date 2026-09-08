import type { AuthorizationStartInput } from "@/lib/facturation/pa/types";

export const SUPERPDP_DEFAULT_ENDPOINT = "https://api.superpdp.tech";

export type SuperPdpCompanyNumberScheme = AuthorizationStartInput["companyNumberScheme"];

export interface SuperPdpAppCredentials {
  clientId: string;
  clientSecret: string;
}

export interface SuperPdpConfig {
  endpoint: string;
  /** Application Flowo (authorization_code). Fallback sandbox : credentials vendeur. */
  app: SuperPdpAppCredentials;
  seller?: SuperPdpAppCredentials;
  buyer?: SuperPdpAppCredentials;
}

function trimEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

function pair(idName: string, secretName: string): SuperPdpAppCredentials | undefined {
  const clientId = trimEnv(idName);
  const clientSecret = trimEnv(secretName);
  if (!clientId || !clientSecret) return undefined;
  return { clientId, clientSecret };
}

export function superPdpEndpoint(raw?: string | null): string {
  const value = (raw ?? trimEnv("SUPERPDP_ENDPOINT") ?? SUPERPDP_DEFAULT_ENDPOINT).replace(/\/+$/, "");
  return value || SUPERPDP_DEFAULT_ENDPOINT;
}

/**
 * client_id / secret de l’application Flowo.
 * En sandbox, Super PDP fournit souvent un couple vendeur / acheteur :
 * on retombe sur SUPERPDP_SELLER_* s’il n’y a pas de SUPERPDP_CLIENT_*.
 */
export function resolveSuperPdpAppCredentials(): SuperPdpAppCredentials {
  const app = pair("SUPERPDP_CLIENT_ID", "SUPERPDP_CLIENT_SECRET");
  if (app) return app;
  const seller = pair("SUPERPDP_SELLER_CLIENT_ID", "SUPERPDP_SELLER_CLIENT_SECRET");
  if (seller) return seller;
  throw new Error(
    "Identifiants Super PDP manquants. Renseignez SUPERPDP_CLIENT_ID / SUPERPDP_CLIENT_SECRET (application Flowo) ou SUPERPDP_SELLER_CLIENT_ID / SUPERPDP_SELLER_CLIENT_SECRET (sandbox).",
  );
}

export function loadSuperPdpConfig(): SuperPdpConfig {
  return {
    endpoint: superPdpEndpoint(),
    app: resolveSuperPdpAppCredentials(),
    seller: pair("SUPERPDP_SELLER_CLIENT_ID", "SUPERPDP_SELLER_CLIENT_SECRET"),
    buyer: pair("SUPERPDP_BUYER_CLIENT_ID", "SUPERPDP_BUYER_CLIENT_SECRET"),
  };
}

export function einvoicingProviderFromEnv(raw = process.env.EINVOICING_PROVIDER): "mock" | "superpdp" {
  return raw?.trim().toLowerCase() === "superpdp" ? "superpdp" : "mock";
}
