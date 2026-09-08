export class EinvoicingError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = "EinvoicingError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export class SessionNotVerifiedError extends EinvoicingError {
  constructor(message = "La session PA n’est pas encore vérifiée.") {
    super("session_not_verified", message, 403);
    this.name = "SessionNotVerifiedError";
  }
}

export class TokenExpiredError extends EinvoicingError {
  constructor(message = "Le jeton d’accès PA a expiré.") {
    super("token_expired", message, 401);
    this.name = "TokenExpiredError";
  }
}

export class InvoiceRejectedError extends EinvoicingError {
  constructor(message = "La facture a été rejetée par la plateforme agréée.") {
    super("invoice_rejected", message, 422);
    this.name = "InvoiceRejectedError";
  }
}

/** Échec de `POST /v1.beta/validation_reports` — aucun dépôt n’a eu lieu. */
export class InvoiceValidationError extends EinvoicingError {
  readonly failures: string[];

  constructor(failures: string[]) {
    const unique = [...new Set(failures.map((s) => s.trim()).filter(Boolean))];
    const message =
      unique.length === 1
        ? unique[0]!
        : unique.length > 1
          ? `Le document n’a pas passé la validation de la plateforme (${unique.length} erreurs).`
          : "Le document n’a pas passé la validation de la plateforme.";
    super("invoice_invalid", message, 422);
    this.name = "InvoiceValidationError";
    this.failures = unique.length > 0 ? unique : [message];
  }
}

export class IllegalCycleTransitionError extends EinvoicingError {
  constructor(from: string, to: string) {
    super("illegal_cycle_transition", `Transition de cycle interdite : ${from} → ${to}.`, 409);
    this.name = "IllegalCycleTransitionError";
  }
}

/** Erreur HTTP Super PDP — corps conservé (jamais de jeton) pour le journal sandbox. */
export class SuperPdpApiError extends EinvoicingError {
  readonly method: string;
  readonly path: string;
  readonly responseBody: unknown;

  constructor(input: {
    method: string;
    path: string;
    status: number;
    message: string;
    responseBody?: unknown;
    code?: string;
  }) {
    super(input.code ?? "superpdp_api_error", input.message, input.status);
    this.name = "SuperPdpApiError";
    this.method = input.method;
    this.path = input.path;
    this.responseBody = input.responseBody ?? null;
  }
}
