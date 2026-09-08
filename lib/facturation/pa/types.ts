/**
 * Types agnostiques prestataire PA.
 * Une entité fiscale Flowo (artisan) + un jeu de tokens OAuth.
 * Jamais de client_id / secret par artisan.
 */

export type ProcessingRule = "B2B" | "B2C" | "B2BInt";

/** Statut de raccordement côté Flowo (inclut la phase KYB asynchrone). */
export type ConnectionStatus =
  | "disconnected"
  | "pending_verification"
  | "needs_review"
  | "verified"
  | "failed"
  | "token_expired";

export type CompanyVerificationStatus = "pending" | "verified" | "needs_review" | "failed";

export type StatutCycleVie = "brouillon" | "emise" | "deposee" | "rejetee" | "irrecevable" | "encaissee";

export type ProviderId = "mock" | "superpdp";

export interface FiscalEntityRef {
  userId: string;
  providerCompanyId?: string | null;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  tokenType: "Bearer";
}

export interface ConnectionSnapshot {
  status: ConnectionStatus;
  provider: ProviderId;
  providerCompanyId: string | null;
  companyVerificationStatus: CompanyVerificationStatus | null;
  lastError: string | null;
  connectedAt: string | null;
  updatedAt: string | null;
}

export interface AuthorizationStartInput {
  redirectUri: string;
  state: string;
  loginHint?: string;
  companyNumber?: string;
  companyNumberScheme?: "sandbox" | "fr_siren" | "be_numero_entreprise";
}

export interface SubmitInvoiceInput {
  factureId: string;
  xml: string;
  pdf?: Uint8Array;
  /** Conservé pour le mock / repli. Super PDP calcule la règle : ne pas l’envoyer. */
  processingRule?: ProcessingRule;
  externalId: string;
}

export interface SubmitInvoiceResult {
  providerInvoiceId: string;
  processingRule: ProcessingRule;
}

export type ValidateInvoiceInput = {
  xml: string;
  pdf?: Uint8Array;
};

export type InvoiceValidationResult = { ok: true } | { ok: false; failures: string[] };

export interface LifecycleEvent {
  providerEventId: string;
  providerInvoiceId: string;
  statusCode: string;
  statusText: string;
  occurredAt: string;
  payload?: Record<string, unknown>;
}

export interface IncomingInvoice {
  providerInvoiceId: string;
  direction: "in";
  receivedAt: string;
  sellerName?: string;
  totalTtc?: string;
}

export type EReportingKind = "b2c_transaction" | "b2c_payment" | "b2bint_invoice" | "b2bint_payment";

export interface EReportingSubmitInput {
  kind: EReportingKind;
  payload: Record<string, unknown>;
}

export interface EReportingPreview {
  period: string;
  summary: string;
  rows: Record<string, unknown>[];
}
