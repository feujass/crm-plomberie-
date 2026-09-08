import { describe, expect, it } from "vitest";

import {
  applyCycleEffect,
  canTransitionCycle,
  effectFromStatusCode,
  FR_LIFECYCLE_MAPPING,
} from "@/lib/facturation/pa/cycle-machine";
import { IllegalCycleTransitionError } from "@/lib/facturation/pa/errors";

describe("machine statut_cycle_vie", () => {
  it("autorise brouillon → emise → deposee → encaissee", () => {
    expect(canTransitionCycle("brouillon", "emise")).toBe(true);
    expect(canTransitionCycle("emise", "deposee")).toBe(true);
    expect(canTransitionCycle("deposee", "encaissee")).toBe(true);
  });

  it("refuse brouillon → deposee, encaisse une facture rejetée, et fige irrecevable", () => {
    expect(canTransitionCycle("brouillon", "deposee")).toBe(false);
    expect(canTransitionCycle("encaissee", "rejetee")).toBe(false);
    expect(canTransitionCycle("irrecevable", "deposee")).toBe(false);
    expect(() => applyCycleEffect("rejetee", "collect")).toThrow(IllegalCycleTransitionError);
    expect(applyCycleEffect("irrecevable", "collect")).toBe("irrecevable");
    expect(applyCycleEffect("irrecevable", "deposit")).toBe("irrecevable");
  });

  it("couvre chaque code officiel fr:200–213 et fr:501", () => {
    const codes = FR_LIFECYCLE_MAPPING.map((row) => row.code);
    expect(codes).toEqual([
      "fr:200",
      "fr:201",
      "fr:202",
      "fr:203",
      "fr:204",
      "fr:205",
      "fr:206",
      "fr:207",
      "fr:208",
      "fr:209",
      "fr:210",
      "fr:211",
      "fr:212",
      "fr:213",
      "fr:501",
    ]);
  });

  it("regroupe fr:200–206 en dépôt, distingue refus corrigeable et rejet définitif", () => {
    for (const code of ["fr:200", "fr:201", "fr:202", "fr:203", "fr:204", "fr:205", "fr:206"]) {
      expect(effectFromStatusCode(code)).toBe("deposit");
    }
    expect(effectFromStatusCode("fr:207")).toBe("none");
    expect(effectFromStatusCode("fr:208")).toBe("none");
    expect(effectFromStatusCode("fr:209")).toBe("none");
    expect(effectFromStatusCode("fr:210")).toBe("refuse");
    expect(effectFromStatusCode("fr:211")).toBe("none");
    expect(effectFromStatusCode("fr:212")).toBe("collect");
    expect(effectFromStatusCode("fr:213")).toBe("reject_final");
    expect(effectFromStatusCode("fr:501")).toBe("reject_final");
    expect(effectFromStatusCode("fr:214")).toBe("none");
    expect(effectFromStatusCode("fr:500")).toBe("none");
    expect(effectFromStatusCode("unknown")).toBe("none");
  });

  it("applique fr:210 vers rejetee (redépôt possible) et fr:213/501 vers irrecevable (terminal)", () => {
    expect(applyCycleEffect("deposee", "refuse")).toBe("rejetee");
    expect(canTransitionCycle("rejetee", "deposee")).toBe(true);
    expect(applyCycleEffect("deposee", "reject_final")).toBe("irrecevable");
    expect(applyCycleEffect("rejetee", "reject_final")).toBe("irrecevable");
    expect(canTransitionCycle("irrecevable", "deposee")).toBe(false);
  });

  it("applique fr:200 puis fr:212", () => {
    const afterDeposit = applyCycleEffect("emise", "deposit");
    expect(afterDeposit).toBe("deposee");
    expect(applyCycleEffect(afterDeposit, "collect")).toBe("encaissee");
  });
});
