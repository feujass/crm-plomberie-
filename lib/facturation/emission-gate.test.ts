import { describe, expect, it } from "vitest";

import { blockersEmissionFacturX, clientExcluEinvoicing, eligibilityFacturX } from "@/lib/facturation/emission-gate";

describe("clientExcluEinvoicing", () => {
  it("exclut les particuliers du flux e-invoicing", () => {
    expect(clientExcluEinvoicing("particulier")).toBe(true);
    expect(clientExcluEinvoicing("entreprise")).toBe(false);
  });
});

describe("blockersEmissionFacturX", () => {
  it("bloque si l'adresse émetteur n'est pas confirmée", () => {
    const b = blockersEmissionFacturX({
      emetteurAdresse: { ligne1: "12 rue", ligne2: "", cp: "69003", ville: "Lyon", pays: "FR" },
      emetteurConfirmeeAt: null,
      clientType: "particulier",
      clientAdresse: null,
      clientConfirmeeAt: null,
      natureOperation: "services",
      datePrestationDebut: "2026-01-01",
      datePrestationFin: "2026-01-02",
      regimeTva: "encaissements",
    });
    expect(b).toContain("adresse_emetteur");
  });

  it("laisse passer une facture B2B complète", () => {
    const gate = eligibilityFacturX({
      emetteurAdresse: { ligne1: "12 rue", ligne2: "", cp: "69003", ville: "Lyon", pays: "FR" },
      emetteurConfirmeeAt: "2026-01-01T00:00:00Z",
      clientType: "entreprise",
      clientAdresse: { ligne1: "1 place", ligne2: "", cp: "75001", ville: "Paris", pays: "FR" },
      clientConfirmeeAt: "2026-01-01T00:00:00Z",
      natureOperation: "services",
      datePrestationDebut: "2026-01-01",
      datePrestationFin: "2026-01-02",
      regimeTva: "encaissements",
      snapshotEmetteur: {
        entreprise_nom: "Atelier",
        siren: "732829320",
        siret: "73282932000074",
        numero_tva_intracom: "FR44732829320",
        forme_juridique: null,
        regime_tva: "encaissements",
        option_tva_debits: false,
        adresse: { ligne1: "12 rue", ligne2: "", cp: "69003", ville: "Lyon", pays: "FR" },
        email_facturation: null,
        tel: null,
        iban: null,
        bic: null,
        rcs_ville: null,
        capital_social: null,
      },
      snapshotClient: {
        nom: "SCI Test",
        prenom: null,
        type_client: "entreprise",
        siren: "443061841",
        siret: "44306184100047",
        tva_intracom: null,
        adresse_facturation: { ligne1: "1 place", ligne2: "", cp: "75001", ville: "Paris", pays: "FR" },
        adresse_livraison: null,
        email: null,
        tel: null,
      },
      numero: "FA-1",
    });
    expect(gate).toEqual({ ok: true });
  });
});
