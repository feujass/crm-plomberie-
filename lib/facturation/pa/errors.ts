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

export class IllegalCycleTransitionError extends EinvoicingError {
  constructor(from: string, to: string) {
    super("illegal_cycle_transition", `Transition de cycle interdite : ${from} → ${to}.`, 409);
    this.name = "IllegalCycleTransitionError";
  }
}
