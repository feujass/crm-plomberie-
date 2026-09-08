import type {
  CompanyVerificationStatus,
  ConnectionSnapshot,
  ConnectionStatus,
  IncomingInvoice,
  LifecycleEvent,
  ProcessingRule,
  ProviderId,
} from "@/lib/facturation/pa/types";

export interface SuperPdpOauthSession {
  clientId: string;
  companyVerificationStatus: CompanyVerificationStatus | null;
  userIdentityVerificationStatus: string | null;
  createdAt: string | null;
}

export interface SuperPdpCompany {
  id: string;
  number: string | null;
  numberScheme: string | null;
  formalName: string | null;
  vatRegime: string | null;
  hasVatOnDebits: boolean | null;
}

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseCompanyVerificationStatus(raw: unknown): CompanyVerificationStatus | null {
  if (raw === "verified" || raw === "needs_review" || raw === "failed") return raw;
  if (raw === "pending" || raw === "not_verified") return "pending";
  return null;
}

export function connectionStatusFromKyb(
  company: CompanyVerificationStatus | null,
  httpStatus?: number,
): ConnectionStatus {
  if (company === "verified") return "verified";
  if (company === "needs_review") return "needs_review";
  if (company === "failed") return "failed";
  if (httpStatus === 403) return "pending_verification";
  return "pending_verification";
}

export function parseOauthSession(json: unknown): SuperPdpOauthSession {
  const r = rec(json) ?? {};
  return {
    clientId: str(r.client_id) ?? "",
    companyVerificationStatus: parseCompanyVerificationStatus(r.company_verification_status),
    userIdentityVerificationStatus: str(r.user_identity_verification_status),
    createdAt: str(r.created_at),
  };
}

export function snapshotFromOauthSession(
  session: SuperPdpOauthSession,
  input: {
    provider: ProviderId;
    providerCompanyId?: string | null;
    lastError?: string | null;
    connectedAt?: string | null;
    httpStatus?: number;
  },
): ConnectionSnapshot {
  const now = new Date().toISOString();
  return {
    status: connectionStatusFromKyb(session.companyVerificationStatus, input.httpStatus),
    provider: input.provider,
    providerCompanyId: input.providerCompanyId ?? null,
    companyVerificationStatus: session.companyVerificationStatus,
    lastError: input.lastError ?? null,
    connectedAt: input.connectedAt ?? session.createdAt ?? now,
    updatedAt: now,
  };
}

export function parseCompany(json: unknown): SuperPdpCompany | null {
  const r = rec(json);
  if (!r || r.id == null) return null;
  return {
    id: String(r.id),
    number: str(r.number),
    numberScheme: str(r.number_scheme),
    formalName: str(r.formal_name) ?? str(r.trade_name),
    vatRegime: str(r.vat_regime),
    hasVatOnDebits: typeof r.has_vat_on_debits === "boolean" ? r.has_vat_on_debits : null,
  };
}

export function parseLifecycleEvents(json: unknown): { events: LifecycleEvent[]; hasAfter: boolean } {
  const r = rec(json);
  const rows = Array.isArray(r?.data) ? r.data : Array.isArray(json) ? json : [];
  const events: LifecycleEvent[] = [];
  for (const row of rows) {
    const e = rec(row);
    if (!e || e.id == null || e.invoice_id == null) continue;
    const data = rec(e.data);
    const details = e.details;
    events.push({
      providerEventId: String(e.id),
      providerInvoiceId: String(e.invoice_id),
      statusCode: String(e.status_code ?? ""),
      statusText: str(e.status_text) ?? String(e.status_code ?? ""),
      occurredAt: str(e.created_at) ?? new Date().toISOString(),
      payload: {
        ...(data ?? {}),
        details: details ?? undefined,
        reason: data?.reason,
      },
    });
  }
  return { events, hasAfter: r?.has_after === true };
}

export function parseIncomingInvoices(json: unknown): IncomingInvoice[] {
  const r = rec(json);
  const rows = Array.isArray(r?.data) ? r.data : [];
  const out: IncomingInvoice[] = [];
  for (const row of rows) {
    const e = rec(row);
    if (!e || e.id == null) continue;
    if (e.direction != null && e.direction !== "in") continue;
    const overview = rec(e.en_invoice);
    const seller = rec(overview?.seller);
    out.push({
      providerInvoiceId: String(e.id),
      direction: "in",
      receivedAt: str(e.created_at) ?? new Date().toISOString(),
      sellerName: str(seller?.name) ?? str(seller?.trading_name) ?? undefined,
      totalTtc: undefined,
    });
  }
  return out;
}

export function parseSubmitInvoiceResult(
  json: unknown,
  fallbackRule: ProcessingRule,
): { providerInvoiceId: string; processingRule: ProcessingRule } {
  const r = rec(json);
  if (!r || r.id == null) {
    throw new Error("Réponse Super PDP sans id de facture.");
  }
  const rule = r.processing_rule;
  const processingRule: ProcessingRule =
    rule === "B2B" || rule === "B2C" || rule === "B2BInt" ? rule : fallbackRule;
  return { providerInvoiceId: String(r.id), processingRule };
}

export function asStartingAfterId(afterEventId?: string): number | undefined {
  if (!afterEventId?.trim()) return undefined;
  const n = Number(afterEventId);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}
