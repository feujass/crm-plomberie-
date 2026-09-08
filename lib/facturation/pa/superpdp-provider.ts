import { EinvoicingError, SessionNotVerifiedError, SuperPdpApiError } from "@/lib/facturation/pa/errors";
import type { EInvoicingProvider } from "@/lib/facturation/pa/provider";
import { loadSuperPdpConfig, type SuperPdpConfig } from "@/lib/facturation/pa/superpdp-config";
import { SuperPdpHttp, type SuperPdpFetch } from "@/lib/facturation/pa/superpdp-http";
import {
  buildSuperPdpAuthorizationUrl,
  exchangeSuperPdpAuthorizationCode,
  refreshSuperPdpAccessToken,
} from "@/lib/facturation/pa/superpdp-oauth";
import {
  asStartingAfterId,
  parseCompany,
  parseCompanyVerificationStatus,
  parseIncomingInvoices,
  parseLifecycleEvents,
  parseOauthSession,
  parseSubmitInvoiceResult,
  snapshotFromOauthSession,
} from "@/lib/facturation/pa/superpdp-parse";
import type { SuperPdpVatMapping } from "@/lib/facturation/pa/tva-mapping";
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

export interface SuperPdpProviderDeps {
  config?: SuperPdpConfig;
  fetch?: SuperPdpFetch;
}

function emptySession(httpStatus: number) {
  return parseOauthSession({
    client_id: "",
    company_verification_status: httpStatus === 403 ? "pending" : undefined,
  });
}

export class SuperPdpProvider implements EInvoicingProvider {
  readonly id = "superpdp" as const;
  private readonly http: SuperPdpHttp;

  constructor(deps: SuperPdpProviderDeps = {}) {
    const config = deps.config ?? loadSuperPdpConfig();
    this.http = new SuperPdpHttp(config, deps.fetch ?? fetch);
  }

  async getAuthorizationUrl(_entity: FiscalEntityRef, input: AuthorizationStartInput): Promise<{ url: string }> {
    return {
      url: buildSuperPdpAuthorizationUrl(this.http.endpoint, this.http.app.clientId, input),
    };
  }

  async exchangeAuthorizationCode(
    entity: FiscalEntityRef,
    input: { code: string; redirectUri: string; state?: string },
  ): Promise<{ tokens: OAuthTokenSet; snapshot: ConnectionSnapshot }> {
    const tokens = await exchangeSuperPdpAuthorizationCode(this.http, {
      code: input.code,
      redirectUri: input.redirectUri,
    });
    const snapshot = await this.getConnectionStatus(entity, tokens);
    return { tokens, snapshot };
  }

  async refreshAccessToken(_entity: FiscalEntityRef, tokens: OAuthTokenSet): Promise<OAuthTokenSet> {
    return refreshSuperPdpAccessToken(this.http, tokens);
  }

  async getConnectionStatus(_entity: FiscalEntityRef, tokens: OAuthTokenSet): Promise<ConnectionSnapshot> {
    try {
      const res = await this.http.request({
        method: "GET",
        path: "/v1.beta/oauth2_sessions/me",
        accessToken: tokens.accessToken,
        allowForbidden: true,
      });
      if (res.status === 403) {
        const body = res.json && typeof res.json === "object" ? (res.json as Record<string, unknown>) : {};
        const nested = body.session && typeof body.session === "object" ? (body.session as Record<string, unknown>) : {};
        const nestedStatus = parseCompanyVerificationStatus(
          body.company_verification_status ?? nested.company_verification_status,
        );
        const session = parseOauthSession({
          client_id: body.client_id ?? nested.client_id,
          created_at: body.created_at ?? nested.created_at,
          company_verification_status: nestedStatus ?? "pending",
        });
        return snapshotFromOauthSession(session, {
          provider: this.id,
          lastError: nestedStatus === "failed" ? "Vérification d’entreprise refusée par la plateforme." : null,
          httpStatus: 403,
        });
      }
      const session = parseOauthSession(res.json);
      let providerCompanyId: string | null = null;
      if (session.companyVerificationStatus === "verified") {
        try {
          const companyRes = await this.http.request({
            method: "GET",
            path: "/v1.beta/companies/me",
            accessToken: tokens.accessToken,
          });
          providerCompanyId = parseCompany(companyRes.json)?.id ?? null;
        } catch (err) {
          if (err instanceof SessionNotVerifiedError) {
            return snapshotFromOauthSession(session, {
              provider: this.id,
              lastError: err.message,
              httpStatus: 403,
            });
          }
          throw err;
        }
      }
      return snapshotFromOauthSession(session, { provider: this.id, providerCompanyId });
    } catch (err) {
      if (err instanceof SuperPdpApiError && err.httpStatus === 403) {
        return snapshotFromOauthSession(emptySession(403), {
          provider: this.id,
          lastError: err.message,
          httpStatus: 403,
        });
      }
      throw err;
    }
  }

  async syncCompanyVatRegime(
    _entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    mapping: SuperPdpVatMapping,
  ): Promise<void> {
    if (mapping.status !== "complete" || !mapping.vatRegime) return;
    await this.http.request({
      method: "PATCH",
      path: "/v1.beta/companies",
      accessToken: tokens.accessToken,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        vat_regime: mapping.vatRegime,
        has_vat_on_debits: mapping.hasVatOnDebits,
      }),
    });
  }

  async submitInvoice(
    _entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    input: SubmitInvoiceInput,
  ): Promise<SubmitInvoiceResult> {
    const usePdf = Boolean(input.pdf && input.pdf.byteLength > 0);
    const body: BodyInit = usePdf ? Buffer.from(input.pdf!) : input.xml;
    const res = await this.http.request({
      method: "POST",
      path: "/v1.beta/invoices",
      accessToken: tokens.accessToken,
      query: {
        external_id: input.externalId.slice(0, 36),
      },
      headers: {
        "Content-Type": usePdf ? "application/pdf" : "application/xml",
        Accept: "application/json",
      },
      body,
    });
    return parseSubmitInvoiceResult(res.json, input.processingRule ?? "B2B");
  }

  async listLifecycleEvents(
    _entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    input: { providerInvoiceId?: string; afterEventId?: string },
  ): Promise<{ events: LifecycleEvent[] }> {
    const events: LifecycleEvent[] = [];
    let startingAfter = asStartingAfterId(input.afterEventId);
    for (let page = 0; page < 20; page += 1) {
      const res = await this.http.request({
        method: "GET",
        path: "/v1.beta/invoice_events",
        accessToken: tokens.accessToken,
        query: {
          invoice_id: input.providerInvoiceId ? Number(input.providerInvoiceId) || undefined : undefined,
          starting_after_id: startingAfter,
          limit: 100,
        },
      });
      const parsed = parseLifecycleEvents(res.json);
      events.push(...parsed.events);
      if (!parsed.hasAfter || parsed.events.length === 0) break;
      const last = parsed.events[parsed.events.length - 1];
      startingAfter = asStartingAfterId(last.providerEventId);
      if (startingAfter == null) break;
    }
    return { events };
  }

  async listIncomingInvoices(
    _entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    input?: { afterId?: string },
  ): Promise<{ invoices: IncomingInvoice[] }> {
    const res = await this.http.request({
      method: "GET",
      path: "/v1.beta/invoices",
      accessToken: tokens.accessToken,
      query: {
        direction: "in",
        starting_after_id: asStartingAfterId(input?.afterId),
        limit: 100,
        order: "desc",
      },
    });
    return { invoices: parseIncomingInvoices(res.json) };
  }

  async submitEReporting(): Promise<{ providerRef: string }> {
    throw new EinvoicingError("ereporting_not_implemented", "E-reporting Super PDP : pas encore branché.", 501);
  }

  async previewEReporting(_entity: FiscalEntityRef, tokens: OAuthTokenSet): Promise<EReportingPreview> {
    const res = await this.http.request({
      method: "GET",
      path: "/v1.beta/ereportings/preview",
      accessToken: tokens.accessToken,
    });
    const json = res.json && typeof res.json === "object" ? (res.json as Record<string, unknown>) : {};
    return {
      period: typeof json.period === "string" ? json.period : "",
      summary: "Aperçu e-reporting Super PDP.",
      rows: Array.isArray(json.data) ? (json.data as Record<string, unknown>[]) : [json],
    };
  }
}
