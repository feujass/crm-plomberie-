import { describe, expect, it } from "vitest";

import { artisanTvaSummary, mapRegimeTvaToSuperPdp } from "@/lib/facturation/pa/tva-mapping";

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

describe("libellés TVA artisan", () => {
  it("formule le régime et la périodicité sans jargon PA", () => {
    const mapping = mapRegimeTvaToSuperPdp({ regimeTva: "encaissements", periodicite: "monthly" });
    expect(artisanTvaSummary("encaissements", mapping)).toEqual([
      "Vous êtes en TVA sur les encaissements.",
      "Vous déclarez la TVA tous les mois (réel normal).",
    ]);
  });

  it("ne mentionne pas la périodicité tant qu’elle manque", () => {
    const mapping = mapRegimeTvaToSuperPdp({ regimeTva: "debits" });
    expect(artisanTvaSummary("debits", mapping)).toEqual(["Vous êtes en TVA sur les débits."]);
  });

  it("explique la franchise 293 B", () => {
    const mapping = mapRegimeTvaToSuperPdp({ regimeTva: "franchise_293b" });
    expect(artisanTvaSummary("franchise_293b", mapping)).toEqual([
      "Vous êtes en franchise en base (article 293 B du CGI).",
    ]);
  });
});
