import { InvoiceRejectedError, SessionNotVerifiedError, TokenExpiredError } from "@/lib/facturation/pa/errors";
import {
  MOCK_CODES,
  MOCK_INCOMING,
  mockHappyEvents,
  mockRejectedEvents,
  scenarioFromCode,
  snapshotForScenario,
  tokensForScenario,
  type MockScenario,
} from "@/lib/facturation/pa/mock-fixtures";
import type { EInvoicingProvider } from "@/lib/facturation/pa/provider";
import type {
  AuthorizationStartInput,
  ConnectionSnapshot,
  EReportingPreview,
  EReportingSubmitInput,
  FiscalEntityRef,
  IncomingInvoice,
  LifecycleEvent,
  OAuthTokenSet,
  SubmitInvoiceInput,
  SubmitInvoiceResult,
} from "@/lib/facturation/pa/types";
import { isAccessTokenExpired } from "@/lib/facturation/pa/tokens";

function scenarioFromToken(tokens: OAuthTokenSet): MockScenario {
  const raw = tokens.accessToken.replace(/^mock-access-/, "");
  if (
    raw === "verified" ||
    raw === "pending_verification" ||
    raw === "needs_review" ||
    raw === "failed" ||
    raw === "token_expired" ||
    raw === "invoice_rejected"
  ) {
    return raw;
  }
  return "verified";
}

function assertUsable(tokens: OAuthTokenSet, scenario: MockScenario): void {
  if (scenario === "token_expired" || isAccessTokenExpired(tokens)) {
    throw new TokenExpiredError();
  }
  if (scenario === "pending_verification" || scenario === "needs_review" || scenario === "failed") {
    throw new SessionNotVerifiedError("Session Super PDP non verified (403).");
  }
}

/**
 * Prestataire fictif, zéro réseau.
 * Les codes OAuth mock-* sélectionnent le scénario (KYB, rejet, jeton expiré).
 */
export class MockProvider implements EInvoicingProvider {
  readonly id = "mock" as const;

  async getAuthorizationUrl(_entity: FiscalEntityRef, input: AuthorizationStartInput): Promise<{ url: string }> {
    const url = new URL(input.redirectUri, "https://flowo.local");
    url.searchParams.set("state", input.state);
    url.searchParams.set("code", MOCK_CODES.verified);
    return { url: `${input.redirectUri}?${url.searchParams.toString()}` };
  }

  async exchangeAuthorizationCode(
    _entity: FiscalEntityRef,
    input: { code: string },
  ): Promise<{ tokens: OAuthTokenSet; snapshot: ConnectionSnapshot }> {
    const scenario = scenarioFromCode(input.code);
    return {
      tokens: tokensForScenario(scenario),
      snapshot: snapshotForScenario(scenario),
    };
  }

  async refreshAccessToken(_entity: FiscalEntityRef, tokens: OAuthTokenSet): Promise<OAuthTokenSet> {
    const scenario = scenarioFromToken(tokens);
    if (scenario === "token_expired") {
      return tokensForScenario("verified");
    }
    return {
      ...tokens,
      accessToken: tokens.accessToken,
      expiresAt: new Date(Date.now() + 55 * 60_000).toISOString(),
    };
  }

  async getConnectionStatus(_entity: FiscalEntityRef, tokens: OAuthTokenSet): Promise<ConnectionSnapshot> {
    const scenario = scenarioFromToken(tokens);
    if (isAccessTokenExpired(tokens) && scenario !== "token_expired") {
      return snapshotForScenario("token_expired");
    }
    return snapshotForScenario(scenario);
  }

  async syncCompanyVatRegime(): Promise<void> {
    /* mock : pas d’appel réseau */
  }

  async submitInvoice(
    _entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    input: SubmitInvoiceInput,
  ): Promise<SubmitInvoiceResult> {
    const scenario = scenarioFromToken(tokens);
    assertUsable(tokens, scenario);
    if (scenario === "invoice_rejected") {
      throw new InvoiceRejectedError();
    }
    return {
      providerInvoiceId: `mock-inv-${input.factureId}`,
      processingRule: input.processingRule,
    };
  }

  async listLifecycleEvents(
    _entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    input: { providerInvoiceId?: string; afterEventId?: string },
  ): Promise<{ events: LifecycleEvent[] }> {
    const scenario = scenarioFromToken(tokens);
    assertUsable(tokens, scenario);
    const id = input.providerInvoiceId ?? "mock-inv-unknown";
    const all = scenario === "invoice_rejected" ? mockRejectedEvents(id) : mockHappyEvents(id);
    const events = input.afterEventId
      ? all.filter((e) => e.providerEventId > input.afterEventId!)
      : all;
    return { events };
  }

  async listIncomingInvoices(
    _entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
  ): Promise<{ invoices: IncomingInvoice[] }> {
    const scenario = scenarioFromToken(tokens);
    assertUsable(tokens, scenario);
    return { invoices: MOCK_INCOMING };
  }

  async submitEReporting(
    _entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    input: EReportingSubmitInput,
  ): Promise<{ providerRef: string }> {
    const scenario = scenarioFromToken(tokens);
    assertUsable(tokens, scenario);
    return { providerRef: `mock-er-${input.kind}` };
  }

  async previewEReporting(_entity: FiscalEntityRef, tokens: OAuthTokenSet): Promise<EReportingPreview> {
    const scenario = scenarioFromToken(tokens);
    assertUsable(tokens, scenario);
    return {
      period: "2026-09",
      summary: "Aperçu e-reporting B2C (mock) — aucun envoi PPF.",
      rows: [{ category_code: "TPS1", tax_exclusive_amount: "100.00" }],
    };
  }
}
