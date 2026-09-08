import { describe, expect, it } from "vitest";

import { applyCycleEffect, canTransitionCycle, effectFromStatusCode } from "@/lib/facturation/pa/cycle-machine";
import { IllegalCycleTransitionError } from "@/lib/facturation/pa/errors";

describe("machine statut_cycle_vie", () => {
  it("autorise brouillon → emise → deposee → encaissee", () => {
    expect(canTransitionCycle("brouillon", "emise")).toBe(true);
    expect(canTransitionCycle("emise", "deposee")).toBe(true);
    expect(canTransitionCycle("deposee", "encaissee")).toBe(true);
  });

  it("refuse brouillon → deposee et un encaissement sur facture rejetée", () => {
    expect(canTransitionCycle("brouillon", "deposee")).toBe(false);
    expect(canTransitionCycle("encaissee", "rejetee")).toBe(false);
    expect(() => applyCycleEffect("rejetee", "collect")).toThrow(IllegalCycleTransitionError);
  });

  it("mappe fr:200–206 vers dépôt, fr:210/213/501 vers rejet, fr:212 vers encaissement", () => {
    expect(effectFromStatusCode("fr:200")).toBe("deposit");
    expect(effectFromStatusCode("fr:205")).toBe("deposit");
    expect(effectFromStatusCode("fr:207")).toBe("none");
    expect(effectFromStatusCode("fr:210")).toBe("reject");
    expect(effectFromStatusCode("fr:212")).toBe("collect");
    expect(effectFromStatusCode("fr:213")).toBe("reject");
    expect(effectFromStatusCode("fr:501")).toBe("reject");
  });

  it("applique fr:200 puis fr:212", () => {
    const afterDeposit = applyCycleEffect("emise", "deposit");
    expect(afterDeposit).toBe("deposee");
    expect(applyCycleEffect(afterDeposit, "collect")).toBe("encaissee");
  });
});
