import { describe, expect, it } from "vitest";

import { cycleNotificationEvent, isInformationalCycleSignal } from "@/lib/facturation/pa/cycle-signals";

describe("signaux de cycle informatifs", () => {
  it("mappe fr:207 et fr:211 vers les événements de notification existants", () => {
    expect(cycleNotificationEvent("fr:207")).toBe("facture_contestee");
    expect(cycleNotificationEvent("fr:211")).toBe("facture_paiement_emis");
    expect(isInformationalCycleSignal("fr:207")).toBe(true);
    expect(isInformationalCycleSignal("fr:211")).toBe(true);
  });

  it("ne notifie pas les transitions ni les autres codes informatifs", () => {
    expect(cycleNotificationEvent("fr:210")).toBeNull();
    expect(cycleNotificationEvent("fr:212")).toBeNull();
    expect(cycleNotificationEvent("fr:208")).toBeNull();
    expect(cycleNotificationEvent("fr:209")).toBeNull();
    expect(isInformationalCycleSignal("fr:200")).toBe(false);
  });
});
