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

/** Messages de validation Super PDP (failures / details), sans les seuls warnings. */
export function validationMessagesFromEventRow(
  details: unknown,
  data: Record<string, unknown> | null,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: unknown) => {
    const v = str(raw);
    if (!v || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  };
  const walk = (value: unknown, preferFailures: boolean) => {
    if (value == null) return;
    if (typeof value === "string") {
      push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, preferFailures);
      return;
    }
    const row = rec(value);
    if (!row) return;
    if (preferFailures && Array.isArray(row.failures) && row.failures.length > 0) {
      walk(row.failures, false);
      return;
    }
    push(row.message ?? row.reason ?? row.detail ?? row.text);
    if (row.failures) walk(row.failures, false);
    if (row.details) walk(row.details, true);
    if (row.subreports) walk(row.subreports, true);
  };
  walk(details, true);
  walk(data?.details, true);
  walk(data?.failures, false);
  walk(data?.validation_report, true);
  walk(data?.validationReport, true);
  return out;
}

/** Retire les XPath CII pour un message lisible par l’artisan. */
export function humanizeValidationMessage(raw: string): string {
  const cut = raw.split(/\s+at\s+\/\*:/)[0]?.trim() ?? raw.trim();
  return cut.replace(/\s+/g, " ").trim();
}

export type ParsedValidationReport = { ok: true } | { ok: false; failures: string[] };

/**
 * Réponse `POST /v1.beta/validation_reports`.
 * Pas d’id de facture : l’endpoint ne dépose pas.
 */
export function parseValidationReport(json: unknown): ParsedValidationReport {
  const r = rec(json);
  const rows = Array.isArray(r?.data) ? r.data : r && "is_valid" in r ? [json] : [];
  if (rows.length === 0) {
    return { ok: false, failures: ["Rapport de validation vide."] };
  }
  const failures: string[] = [];
  let allValid = true;
  for (const row of rows) {
    const item = rec(row);
    if (!item) continue;
    if (item.is_valid === true) continue;
    allValid = false;
    const msgs = validationMessagesFromEventRow(item.subreports, item);
    for (const m of msgs) {
      const h = humanizeValidationMessage(m);
      if (h) failures.push(h);
    }
    const err = str(item.error);
    if (err) failures.push(humanizeValidationMessage(err));
  }
  const unique = [...new Set(failures.filter(Boolean))];
  if (allValid) return { ok: true };
  return {
    ok: false,
    failures: unique.length > 0 ? unique : ["Le document n’a pas passé la validation de la plateforme."],
  };
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
    const details = e.details ?? data?.details;
    const validationMessages = validationMessagesFromEventRow(details, data);
    const reason =
      str(data?.reason) ??
      str(data?.message) ??
      str(data?.error) ??
      (validationMessages.length > 0 ? validationMessages.join(" · ") : undefined);
    events.push({
      providerEventId: String(e.id),
      providerInvoiceId: String(e.invoice_id),
      statusCode: String(e.status_code ?? ""),
      statusText: str(e.status_text) ?? String(e.status_code ?? ""),
      occurredAt: str(e.created_at) ?? new Date().toISOString(),
      payload: {
        ...(data ?? {}),
        details: details ?? undefined,
        validationMessages: validationMessages.length > 0 ? validationMessages : undefined,
        reason,
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

export function parseElectronicIdentifier(
  raw: string | null | undefined,
): { schemeId: string; value: string } | null {
  const s = str(raw);
  if (!s || !s.includes(":")) return null;
  const i = s.indexOf(":");
  const schemeId = s.slice(0, i).trim();
  const value = s.slice(i + 1).trim();
  if (!schemeId || !value) return null;
  return { schemeId, value };
}

const PEPPOL_FR_ROUTING = /^315143296_\d+$/;

/**
 * Identifiant Peppol Super PDP (`0225:315143296_{company_id}`), pas le SIREN nu
 * (`0225:000000002` est résolu mais n’accepte pas Factur-X).
 */
export function pickDirectoryRoutingAddress(
  json: unknown,
  opts?: { companyNumber?: string | null; preferredCompanyId?: string | null },
): { schemeId: string; value: string } | null {
  const r = rec(json);
  const rows = Array.isArray(r?.data) ? r.data : Array.isArray(json) ? json : [];
  const preferredId = opts?.preferredCompanyId?.trim() || null;
  const wantedNumber = opts?.companyNumber?.trim() || null;
  const candidates: { schemeId: string; value: string; companyId: string | null; number: string | null }[] = [];
  for (const row of rows) {
    const e = rec(row);
    if (!e) continue;
    const status = str(e.status);
    if (status && status !== "created" && status !== "active") continue;
    const ident = parseElectronicIdentifier(str(e.identifier));
    if (!ident || ident.value.endsWith("_replyto")) continue;
    if (ident.schemeId !== "0225" || !PEPPOL_FR_ROUTING.test(ident.value)) continue;
    const company = rec(e.company);
    candidates.push({
      ...ident,
      companyId: company?.id != null ? String(company.id) : null,
      number: str(company?.number),
    });
  }
  const byNumber = wantedNumber ? candidates.filter((c) => c.number === wantedNumber) : candidates;
  const pool = byNumber.length > 0 ? byNumber : candidates;
  if (preferredId) {
    const match = pool.find((c) => c.companyId === preferredId);
    if (match) return { schemeId: match.schemeId, value: match.value };
  }
  const first = pool[0];
  return first ? { schemeId: first.schemeId, value: first.value } : null;
}
