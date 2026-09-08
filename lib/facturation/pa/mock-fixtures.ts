import type {
  CompanyVerificationStatus,
  ConnectionSnapshot,
  IncomingInvoice,
  LifecycleEvent,
  OAuthTokenSet,
} from "@/lib/facturation/pa/types";

export type MockScenario =
  | "verified"
  | "pending_verification"
  | "needs_review"
  | "failed"
  | "token_expired"
  | "invoice_rejected";

export const MOCK_CODES: Record<MockScenario, string> = {
  verified: "mock-verified",
  pending_verification: "mock-pending",
  needs_review: "mock-needs-review",
  failed: "mock-failed",
  token_expired: "mock-expired",
  invoice_rejected: "mock-rejected",
};

export function scenarioFromCode(code: string): MockScenario {
  const found = (Object.entries(MOCK_CODES) as [MockScenario, string][]).find(([, v]) => v === code);
  return found?.[0] ?? "verified";
}

export function snapshotForScenario(scenario: MockScenario, now = new Date()): ConnectionSnapshot {
  const base = {
    provider: "mock" as const,
    providerCompanyId: "mock-company-1",
    lastError: null as string | null,
    connectedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const map: Record<MockScenario, { status: ConnectionSnapshot["status"]; kyb: CompanyVerificationStatus }> = {
    verified: { status: "verified", kyb: "verified" },
    pending_verification: { status: "pending_verification", kyb: "pending" },
    needs_review: { status: "needs_review", kyb: "needs_review" },
    failed: { status: "failed", kyb: "failed" },
    token_expired: { status: "token_expired", kyb: "verified" },
    invoice_rejected: { status: "verified", kyb: "verified" },
  };
  const row = map[scenario];
  return {
    ...base,
    status: row.status,
    companyVerificationStatus: row.kyb,
    lastError:
      scenario === "failed"
        ? "Super PDP n’a pas pu rattacher votre identité à l’entreprise."
        : scenario === "token_expired"
          ? "Le jeton d’accès a expiré — reconnectez-vous."
          : null,
  };
}

export function tokensForScenario(scenario: MockScenario, now = new Date()): OAuthTokenSet {
  const expires =
    scenario === "token_expired"
      ? new Date(now.getTime() - 5 * 60_000)
      : new Date(now.getTime() + 55 * 60_000);
  return {
    accessToken: `mock-access-${scenario}`,
    refreshToken: `mock-refresh-${scenario}`,
    expiresAt: expires.toISOString(),
    tokenType: "Bearer",
  };
}

export const MOCK_INCOMING: IncomingInvoice[] = [
  {
    providerInvoiceId: "mock-in-1",
    direction: "in",
    receivedAt: "2026-09-01T10:00:00.000Z",
    sellerName: "Fournitures Dupont",
    totalTtc: "120.00",
  },
];

export function mockRejectedEvents(providerInvoiceId: string): LifecycleEvent[] {
  return [
    {
      providerEventId: `${providerInvoiceId}-fr200`,
      providerInvoiceId,
      statusCode: "fr:200",
      statusText: "Déposée",
      occurredAt: "2026-09-08T08:00:00.000Z",
    },
    {
      providerEventId: `${providerInvoiceId}-fr213`,
      providerInvoiceId,
      statusCode: "fr:213",
      statusText: "Rejetée",
      occurredAt: "2026-09-08T08:05:00.000Z",
    },
  ];
}

export function mockHappyEvents(providerInvoiceId: string): LifecycleEvent[] {
  return [
    {
      providerEventId: `${providerInvoiceId}-fr200`,
      providerInvoiceId,
      statusCode: "fr:200",
      statusText: "Déposée",
      occurredAt: "2026-09-08T08:00:00.000Z",
    },
    {
      providerEventId: `${providerInvoiceId}-fr201`,
      providerInvoiceId,
      statusCode: "fr:201",
      statusText: "Transmise",
      occurredAt: "2026-09-08T08:01:00.000Z",
    },
    {
      providerEventId: `${providerInvoiceId}-fr212`,
      providerInvoiceId,
      statusCode: "fr:212",
      statusText: "Paiement reçu",
      occurredAt: "2026-09-08T12:00:00.000Z",
    },
  ];
}
