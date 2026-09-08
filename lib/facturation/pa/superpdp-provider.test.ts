import { describe, expect, it } from "vitest";

import { SessionNotVerifiedError, SuperPdpApiError, TokenExpiredError } from "@/lib/facturation/pa/errors";
import { einvoicingProviderFromEnv } from "@/lib/facturation/pa/superpdp-config";
import { superPdpCompanyPrefill } from "@/lib/facturation/pa/superpdp-company-prefill";
import { SuperPdpHttp } from "@/lib/facturation/pa/superpdp-http";
import { buildSuperPdpAuthorizationUrl, parseOAuthTokenResponse } from "@/lib/facturation/pa/superpdp-oauth";
import {
  asStartingAfterId,
  connectionStatusFromKyb,
  parseLifecycleEvents,
  parseOauthSession,
  parseSubmitInvoiceResult,
  parseValidationReport,
  pickDirectoryRoutingAddress,
  snapshotFromOauthSession,
} from "@/lib/facturation/pa/superpdp-parse";
import { SuperPdpProvider } from "@/lib/facturation/pa/superpdp-provider";
import type { SuperPdpConfig } from "@/lib/facturation/pa/superpdp-config";
import type { OAuthTokenSet } from "@/lib/facturation/pa/types";

const CONFIG: SuperPdpConfig = {
  endpoint: "https://api.superpdp.tech",
  app: { clientId: "flowo-app", clientSecret: "flowo-secret" },
};

const TOKENS: OAuthTokenSet = {
  accessToken: "access-test",
  refreshToken: "refresh-test",
  tokenType: "Bearer",
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
};

function jsonResponse(status: number, body: unknown, contentType = "application/json"): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": contentType },
  });
}

describe("EINVOICING_PROVIDER", () => {
  it("reste mock par défaut", () => {
    expect(einvoicingProviderFromEnv(undefined)).toBe("mock");
    expect(einvoicingProviderFromEnv("")).toBe("mock");
    expect(einvoicingProviderFromEnv("MOCK")).toBe("mock");
  });

  it("sélectionne superpdp", () => {
    expect(einvoicingProviderFromEnv("superpdp")).toBe("superpdp");
    expect(einvoicingProviderFromEnv(" SuperPDP ")).toBe("superpdp");
  });
});

describe("prefill OAuth Super PDP", () => {
  it("envoie le SIREN dérivé du SIRET avec fr_siren", () => {
    expect(superPdpCompanyPrefill({ siret: "73282932000074" })).toEqual({
      companyNumber: "732829320",
      companyNumberScheme: "fr_siren",
    });
  });

  it("honore le scheme sandbox", () => {
    expect(
      superPdpCompanyPrefill({
        siret: "73282932000074",
        schemeOverride: "sandbox",
        sandboxNumber: "burger-queen",
      }),
    ).toEqual({
      companyNumber: "burger-queen",
      companyNumberScheme: "sandbox",
    });
  });
});

describe("OAuth URL + jetons", () => {
  it("construit /oauth2/authorize avec login_hint et company number", () => {
    const url = buildSuperPdpAuthorizationUrl("https://api.superpdp.tech", "flowo-app", {
      redirectUri: "https://flowo.agency/api/compte/e-facturation/callback",
      state: "abc",
      loginHint: "artisan@example.fr",
      companyNumber: "732829320",
      companyNumberScheme: "fr_siren",
    });
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/oauth2/authorize");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("flowo-app");
    expect(parsed.searchParams.get("login_hint")).toBe("artisan@example.fr");
    expect(parsed.searchParams.get("superpdp_company_number")).toBe("732829320");
    expect(parsed.searchParams.get("superpdp_company_number_scheme")).toBe("fr_siren");
    expect(parsed.searchParams.get("state")).toBe("abc");
  });

  it("parse expires_in et conserve un refresh rotatif", () => {
    const tokens = parseOAuthTokenResponse({
      access_token: "a1",
      refresh_token: "r2",
      expires_in: 3600,
      token_type: "Bearer",
    });
    expect(tokens.accessToken).toBe("a1");
    expect(tokens.refreshToken).toBe("r2");
    expect(new Date(tokens.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("KYB /oauth2_sessions/me", () => {
  it("mappe verified / needs_review / failed / 403", () => {
    expect(connectionStatusFromKyb("verified")).toBe("verified");
    expect(connectionStatusFromKyb("needs_review")).toBe("needs_review");
    expect(connectionStatusFromKyb("failed")).toBe("failed");
    expect(connectionStatusFromKyb(null, 403)).toBe("pending_verification");
    expect(parseOauthSession({ company_verification_status: "verified" }).companyVerificationStatus).toBe(
      "verified",
    );
  });

  it("traite un 403 /me comme raccordement en cours", async () => {
    const provider = new SuperPdpProvider({
      config: CONFIG,
      fetch: async (url) => {
        expect(String(url)).toContain("/v1.beta/oauth2_sessions/me");
        return jsonResponse(403, { error: "company not verified yet" });
      },
    });
    const snapshot = await provider.getConnectionStatus({ userId: "u1" }, TOKENS);
    expect(snapshot.status).toBe("pending_verification");
    expect(snapshot.provider).toBe("superpdp");
  });

  it("lit needs_review dans un 403 avec company_verification_status", async () => {
    const provider = new SuperPdpProvider({
      config: CONFIG,
      fetch: async () => jsonResponse(403, { company_verification_status: "needs_review" }),
    });
    const snapshot = await provider.getConnectionStatus({ userId: "u1" }, TOKENS);
    expect(snapshot.status).toBe("needs_review");
    expect(snapshot.companyVerificationStatus).toBe("needs_review");
  });

  it("refuse les autres routes tant que ce n’est pas verified (403 → SessionNotVerifiedError)", async () => {
    const provider = new SuperPdpProvider({
      config: CONFIG,
      fetch: async (url) => {
        if (String(url).includes("/v1.beta/invoices")) {
          return jsonResponse(403, { error: "session not verified" });
        }
        return jsonResponse(200, {});
      },
    });
    await expect(
      provider.submitInvoice({ userId: "u1" }, TOKENS, {
        factureId: "f1",
        xml: "<xml/>",
        processingRule: "B2B",
        externalId: "f1",
      }),
    ).rejects.toBeInstanceOf(SessionNotVerifiedError);
  });
});

describe("émission et événements", () => {
  it("envoie external_id en query sans processing_rule, XML en body", async () => {
    let seen = "";
    const provider = new SuperPdpProvider({
      config: CONFIG,
      fetch: async (url, init) => {
        seen = `${init?.method} ${url}`;
        expect(init?.headers instanceof Headers ? (init.headers as Headers).get("Content-Type") : undefined).toBe(
          "application/xml",
        );
        return jsonResponse(200, { id: 42, processing_rule: "B2B" });
      },
    });
    const result = await provider.submitInvoice({ userId: "u1" }, TOKENS, {
      factureId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      xml: "<rsm:CrossIndustryInvoice/>",
      externalId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    expect(result.providerInvoiceId).toBe("42");
    expect(result.processingRule).toBe("B2B");
    expect(seen).not.toContain("processing_rule");
    expect(seen).toContain("external_id=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(seen).toContain("/v1.beta/invoices");
  });

  it("valide via /v1.beta/validation_reports (multipart, sans /invoices)", async () => {
    const seen: string[] = [];
    const provider = new SuperPdpProvider({
      config: CONFIG,
      fetch: async (url, init) => {
        seen.push(`${init?.method} ${url}`);
        expect(init?.body).toBeInstanceOf(FormData);
        expect(String(url)).toContain("/v1.beta/validation_reports");
        expect(String(url)).not.toContain("/invoices");
        return jsonResponse(200, {
          data: [{ file_name: "facture.xml", is_valid: false, subreports: [{ failures: [{ message: "BR-FR-08" }] }] }],
        });
      },
    });
    const result = await provider.validateInvoice({ userId: "u1" }, TOKENS, { xml: "<xml/>" });
    expect(result).toEqual({ ok: false, failures: ["BR-FR-08"] });
    expect(seen).toEqual(["POST https://api.superpdp.tech/v1.beta/validation_reports"]);
  });

  it("parse invoice_events vers LifecycleEvent", () => {
    const parsed = parseLifecycleEvents({
      has_after: false,
      data: [
        {
          id: 9,
          invoice_id: 42,
          status_code: "fr:200",
          status_text: "Déposée",
          created_at: "2026-09-08T10:00:00Z",
          data: { reason: null },
        },
      ],
    });
    expect(parsed.events).toEqual([
      expect.objectContaining({
        providerEventId: "9",
        providerInvoiceId: "42",
        statusCode: "fr:200",
        statusText: "Déposée",
      }),
    ]);
    expect(asStartingAfterId("9")).toBe(9);
  });

  it("extrait le motif Schematron de api:invalid depuis details.failures", () => {
    const parsed = parseLifecycleEvents({
      has_after: false,
      data: [
        {
          id: 10,
          invoice_id: 42,
          status_code: "api:invalid",
          status_text: "Invalid",
          created_at: "2026-09-08T10:00:00Z",
          data: { reason: null },
          details: [
            {
              failures: [{ message: "Value of '@schemeID' is not allowed.", rule: "FX-SCH-A-000570" }],
            },
          ],
        },
      ],
    });
    expect(parsed.events[0]?.payload?.reason).toBe("Value of '@schemeID' is not allowed.");
  });

  it("choisit 0225:315143296_{id} et ignore _replyto", () => {
    expect(
      pickDirectoryRoutingAddress(
        {
          data: [
            {
              identifier: "0225:315143296_97118_replyto",
              status: "created",
              company: { id: 97118, number: "000000002" },
            },
            {
              identifier: "0225:315143296_97118",
              status: "created",
              company: { id: 97118, number: "000000002" },
            },
          ],
        },
        { companyNumber: "000000002" },
      ),
    ).toEqual({ schemeId: "0225", value: "315143296_97118" });
  });

  it("conserve processing_rule de la réponse", () => {
    expect(parseSubmitInvoiceResult({ id: 1, processing_rule: "B2C" }, "B2B").processingRule).toBe("B2C");
  });

  it("parse validation_reports sans id de facture", () => {
    expect(
      parseValidationReport({
        data: [
          {
            file_name: "facture.xml",
            is_valid: true,
            subreports: [{ validator: "FX-SCH", failures: [], messages: [] }],
          },
        ],
      }),
    ).toEqual({ ok: true });

    const invalid = parseValidationReport({
      data: [
        {
          file_name: "facture.xml",
          is_valid: false,
          subreports: [
            {
              validator: "FX-SCH",
              failures: [
                {
                  message:
                    "Value of '@schemeID' is not allowed. at /*:CrossIndustryInvoice[namespace-uri()='urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100'][1]",
                },
              ],
            },
          ],
        },
      ],
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.failures).toEqual(["Value of '@schemeID' is not allowed."]);
    }
  });
});

describe("SuperPdpHttp", () => {
  it("transforme 401 en TokenExpiredError", async () => {
    const http = new SuperPdpHttp(CONFIG, async () => jsonResponse(401, { error: "invalid_token" }));
    await expect(
      http.request({ method: "GET", path: "/v1.beta/companies/me", accessToken: "x" }),
    ).rejects.toBeInstanceOf(TokenExpiredError);
  });

  it("expose SuperPdpApiError (status, path, corps) sans jeton", async () => {
    const http = new SuperPdpHttp(CONFIG, async () =>
      jsonResponse(400, { error: "processing_rule mismatch", access_token: "should-not-leak" }),
    );
    try {
      await http.request({ method: "POST", path: "/v1.beta/invoices", accessToken: "secret-token" });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(SuperPdpApiError);
      const api = err as SuperPdpApiError;
      expect(api.httpStatus).toBe(400);
      expect(api.path).toBe("/v1.beta/invoices");
      expect(api.method).toBe("POST");
      expect(JSON.stringify(api.responseBody)).toContain("processing_rule mismatch");
    }
  });
});

describe("snapshot KYB", () => {
  it("verified avec company id", () => {
    const snap = snapshotFromOauthSession(parseOauthSession({ company_verification_status: "verified" }), {
      provider: "superpdp",
      providerCompanyId: "12",
    });
    expect(snap.status).toBe("verified");
    expect(snap.providerCompanyId).toBe("12");
  });
});
