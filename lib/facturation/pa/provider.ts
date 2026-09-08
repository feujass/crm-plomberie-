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
  ProviderId,
  SubmitInvoiceInput,
  SubmitInvoiceResult,
} from "@/lib/facturation/pa/types";

/**
 * Prestataire PA agnostique.
 * Parle uniquement entité fiscale + tokens OAuth (jamais client_id par artisan).
 */
export interface EInvoicingProvider {
  readonly id: ProviderId;

  getAuthorizationUrl(
    entity: FiscalEntityRef,
    input: AuthorizationStartInput,
  ): Promise<{ url: string }>;

  exchangeAuthorizationCode(
    entity: FiscalEntityRef,
    input: { code: string; redirectUri: string; state?: string },
  ): Promise<{ tokens: OAuthTokenSet; snapshot: ConnectionSnapshot }>;

  refreshAccessToken(entity: FiscalEntityRef, tokens: OAuthTokenSet): Promise<OAuthTokenSet>;

  getConnectionStatus(entity: FiscalEntityRef, tokens: OAuthTokenSet): Promise<ConnectionSnapshot>;

  /** PATCH /v1.beta/companies — no-op si le mapping est incomplet. */
  syncCompanyVatRegime(
    entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    mapping: SuperPdpVatMapping,
  ): Promise<void>;

  submitInvoice(
    entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    input: SubmitInvoiceInput,
  ): Promise<SubmitInvoiceResult>;

  listLifecycleEvents(
    entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    input: { providerInvoiceId?: string; afterEventId?: string },
  ): Promise<{ events: LifecycleEvent[] }>;

  listIncomingInvoices(
    entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    input?: { afterId?: string },
  ): Promise<{ invoices: IncomingInvoice[] }>;

  submitEReporting(
    entity: FiscalEntityRef,
    tokens: OAuthTokenSet,
    input: EReportingSubmitInput,
  ): Promise<{ providerRef: string }>;

  previewEReporting(entity: FiscalEntityRef, tokens: OAuthTokenSet): Promise<EReportingPreview>;
}
