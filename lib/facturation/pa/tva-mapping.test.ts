import { describe, expect, it } from "vitest";

import { mapRegimeTvaToSuperPdp } from "@/lib/facturation/pa/tva-mapping";

describe("mapping régime TVA Flowo → Super PDP", () => {
  it("mappe la franchise 293 B vers vat_exemption", () => {
    const m = mapRegimeTvaToSuperPdp({ regimeTva: "franchise_293b" });
    expect(m).toEqual({
      vatRegime: "vat_exemption",
      hasVatOnDebits: false,
      status: "complete",
      missing: [],
    });
  });

  it("pose has_vat_on_debits selon encaissements / débits et signale la périodicité manquante", () => {
    const encaissements = mapRegimeTvaToSuperPdp({ regimeTva: "encaissements" });
    expect(encaissements.hasVatOnDebits).toBe(false);
    expect(encaissements.status).toBe("incomplete");
    expect(encaissements.missing).toContain("tva_periodicite_declaration");

    const debits = mapRegimeTvaToSuperPdp({ regimeTva: "debits", periodicite: "monthly" });
    expect(debits).toMatchObject({
      vatRegime: "monthly",
      hasVatOnDebits: true,
      status: "complete",
    });
  });
});
