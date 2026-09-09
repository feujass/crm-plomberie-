import { describe, expect, it } from "vitest";

import {
  countRedeposits,
  journalEventLabel,
  latestRejectionReason,
  MAX_REDEPOSITS,
  redepositGate,
  rejectionReasonFromEvent,
  REDEPOSIT_STATUS_CODE,
} from "@/lib/facturation/pa/cycle-display";

describe("cycle-display", () => {
  it("extrait un motif de rejet distinct du libellé de statut", () => {
    expect(
      rejectionReasonFromEvent("fr:210", { reason: "Montant TTC incorrect" }, "Refusée"),
    ).toBe("Montant TTC incorrect");
    expect(rejectionReasonFromEvent("fr:210", { motif: "Refusée" }, "Refusée")).toBeNull();
    expect(rejectionReasonFromEvent("fr:213", { comment: "SIRET destinataire inconnu" })).toBe(
      "SIRET destinataire inconnu",
    );
    expect(rejectionReasonFromEvent("fr:207", { reason: "peu importe" })).toBeNull();
    expect(rejectionReasonFromEvent("api:invalid", { reason: "XML CII incomplet" })).toBe(
      "XML CII incomplet",
    );
    expect(
      rejectionReasonFromEvent("api:invalid", {
        details: [{ failures: [{ message: "Value of '@schemeID' is not allowed." }] }],
      }),
    ).toBe("Value of '@schemeID' is not allowed.");
  });

  it("prend le dernier motif fr:210 / 213 / 501", () => {
    expect(
      latestRejectionReason([
        { statusCode: "fr:200", payload: {} },
        { statusCode: "fr:210", payload: { reason: "Adresse erronée" } },
        { statusCode: "fr:210", payload: { reason: "Mauvais montant" } },
      ]),
    ).toBe("Mauvais montant");
  });

  it("limite le redépôt à 3 et refuse hors rejetee", () => {
    expect(countRedeposits(["fr:210", REDEPOSIT_STATUS_CODE, REDEPOSIT_STATUS_CODE])).toBe(2);
    expect(redepositGate("rejetee", 2)).toEqual({ ok: true, remaining: 1 });
    expect(redepositGate("rejetee", MAX_REDEPOSITS).ok).toBe(false);
    expect(redepositGate("irrecevable", 0).ok).toBe(false);
    expect(journalEventLabel(REDEPOSIT_STATUS_CODE)).toBe("Renvoyée à l’identique");
    expect(journalEventLabel("fr:210")).toBe("Refusée");
  });
});
