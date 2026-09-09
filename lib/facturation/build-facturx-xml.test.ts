import { describe, expect, it } from "vitest";

import { buildFacturXXml, FACTURX_GUIDELINE_ID } from "@/lib/facturation/build-facturx-xml";
import { clientExcluEinvoicing, eligibilityFacturX } from "@/lib/facturation/emission-gate";
import {
  fixtureAvoirNegatif,
  fixtureFranchise293B,
  fixtureMixteMultiTva,
  fixtureMonoTva,
  fixtureProSansTvaIntracom,
  FIXTURE_CLIENT_ENTREPRISE,
  FIXTURE_EMETTEUR,
} from "@/lib/facturation/facturx-fixtures";

describe("buildFacturXXml — un taux", () => {
  it("émet une facture EN 16931 à 10 %", () => {
    const xml = buildFacturXXml(fixtureMonoTva());
    expect(xml).toContain(FACTURX_GUIDELINE_ID);
    expect(xml).toContain("<ram:TypeCode>380</ram:TypeCode>");
    expect(xml).toContain("<ram:RateApplicablePercent>10.00</ram:RateApplicablePercent>");
    expect(xml).not.toContain("<ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>");
    expect(xml).toContain("<ram:LineTotalAmount>220.00</ram:LineTotalAmount>");
    expect(xml).toContain("<ram:TaxTotalAmount currencyID=\"EUR\">22.00</ram:TaxTotalAmount>");
    expect(xml).toContain("<ram:DueDateTypeCode>72</ram:DueDateTypeCode>");
  });
});

describe("buildFacturXXml — multi-taux mixte", () => {
  it("sépare les deux taux et l'adresse de livraison", () => {
    const xml = buildFacturXXml(fixtureMixteMultiTva());
    expect(xml).toContain("<ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>");
    expect(xml).toContain("<ram:RateApplicablePercent>10.00</ram:RateApplicablePercent>");
    expect(xml).toContain('unitCode="HUR"');
    expect(xml).toContain("8 impasse des Lilas");
    expect(xml).toContain("<ram:LineTotalAmount>310.00</ram:LineTotalAmount>");
    expect(xml).toContain("<ram:TaxTotalAmount currencyID=\"EUR\">49.00</ram:TaxTotalAmount>");
    expect(xml.match(/<ram:ApplicableTradeTax>/g)?.length).toBeGreaterThanOrEqual(4);
    expect(xml).toContain('schemeID="0002">732829320<');
    expect(xml).not.toContain("73282932000074");
    expect(xml).toContain("<ram:SubjectCode>PMT</ram:SubjectCode>");
    expect(xml).toContain('schemeID="0225">732829320<');
    expect(xml).toContain('schemeID="0225">443061841<');
    expect(xml).not.toContain(">0225:443061841<");
    expect(xml).toContain('schemeID="SMTP">contact@plomberie-dupont.test<');
  });
});

describe("buildFacturXXml — acheteur pro sans TVA intra", () => {
  it("dérive schemeID=VA et n’émet jamais FC côté acheteur", () => {
    const xml = buildFacturXXml(fixtureProSansTvaIntracom());
    const buyer = xml.slice(xml.indexOf("<ram:BuyerTradeParty>"), xml.indexOf("</ram:BuyerTradeParty>"));
    expect(buyer).toContain('schemeID="VA">FR64443061841<');
    expect(buyer).not.toContain('schemeID="FC"');
    expect(xml).toContain("<ram:BusinessProcessSpecifiedDocumentContextParameter>");
    expect(xml).toContain("<ram:ID>B1</ram:ID>");
    expect(xml).toContain("<ram:ActualDeliverySupplyChainEvent>");
  });

  it("utilise l’identifiant Peppol Super PDP quand il est fourni", () => {
    const src = fixtureProSansTvaIntracom();
    src.buyerElectronicAddress = { schemeId: "0225", value: "315143296_97118" };
    const xml = buildFacturXXml(src);
    const buyer = xml.slice(xml.indexOf("<ram:BuyerTradeParty>"), xml.indexOf("</ram:BuyerTradeParty>"));
    expect(buyer).toContain('schemeID="0225">315143296_97118<');
    expect(buyer).not.toContain('schemeID="0225">443061841<');
  });
});

describe("buildFacturXXml — franchise 293 B", () => {
  it("pose la catégorie E et la mention d'exonération", () => {
    const xml = buildFacturXXml(fixtureFranchise293B());
    expect(xml).toContain("TVA non applicable, art. 293 B du CGI");
    expect(xml).toContain("<ram:CategoryCode>E</ram:CategoryCode>");
    expect(xml).toContain("<ram:RateApplicablePercent>0.00</ram:RateApplicablePercent>");
    expect(xml).toContain("<ram:TaxTotalAmount currencyID=\"EUR\">0.00</ram:TaxTotalAmount>");
    expect(xml).not.toContain('schemeID="VA">FR44732829320');
  });
});

describe("buildFacturXXml — Delivery CII", () => {
  it("émet toujours ApplicableHeaderTradeDelivery avec une date, sans ShipTo si livraison absente", () => {
    const src = fixtureMonoTva();
    src.client = { ...src.client, adresse_livraison: null };
    const xml = buildFacturXXml(src);
    expect(xml).toContain("<ram:ApplicableHeaderTradeDelivery>");
    expect(xml).toContain("<ram:ActualDeliverySupplyChainEvent>");
    expect(xml).toContain("20260310");
    expect(xml).not.toContain("<ram:ShipToTradeParty>");
    expect(xml).not.toMatch(/<ram:ApplicableHeaderTradeDelivery>\s*<\/ram:ApplicableHeaderTradeDelivery>/);
  });

  it("n’émet pas ShipTo si l’adresse de livraison est identique à la facturation", () => {
    const src = fixtureMonoTva();
    src.client = { ...src.client, adresse_livraison: { ...src.client.adresse_facturation } };
    const xml = buildFacturXXml(src);
    expect(xml).toContain("<ram:ApplicableHeaderTradeDelivery>");
    expect(xml).toContain("<ram:ActualDeliverySupplyChainEvent>");
    expect(xml).not.toContain("<ram:ShipToTradeParty>");
  });

  it("conserve ShipTo quand l’adresse de livraison diffère", () => {
    const xml = buildFacturXXml(fixtureMonoTva());
    expect(xml).toContain("<ram:ShipToTradeParty>");
    expect(xml).toContain("8 impasse des Lilas");
    expect(xml).toContain("<ram:ActualDeliverySupplyChainEvent>");
  });
});

describe("buildFacturXXml — avoir", () => {
  it("utilise le type 381 et des montants négatifs", () => {
    const xml = buildFacturXXml(fixtureAvoirNegatif());
    expect(xml).toContain("<ram:TypeCode>381</ram:TypeCode>");
    expect(xml).toContain("<ram:InvoiceReferencedDocument>");
    expect(xml).toContain("<ram:IssuerAssignedID>FA-2026-0002</ram:IssuerAssignedID>");
  });

  it("refuse un avoir sans référence à la facture d’origine", () => {
    const src = fixtureAvoirNegatif();
    src.factureOrigineNumero = null;
    expect(() => buildFacturXXml(src)).toThrow(/facture d’origine/);
  });
});

describe("client particulier — hors e-invoicing", () => {
  it("est exclu du flux", () => {
    expect(clientExcluEinvoicing("particulier")).toBe(true);
    const gate = eligibilityFacturX({
      emetteurAdresse: FIXTURE_EMETTEUR.adresse,
      emetteurConfirmeeAt: "2026-01-01T00:00:00Z",
      clientType: "particulier",
      clientAdresse: FIXTURE_CLIENT_ENTREPRISE.adresse_facturation,
      clientConfirmeeAt: "2026-01-01T00:00:00Z",
      natureOperation: "services",
      datePrestationDebut: "2026-03-01",
      datePrestationFin: "2026-03-10",
      regimeTva: "encaissements",
      snapshotEmetteur: FIXTURE_EMETTEUR,
      snapshotClient: { ...FIXTURE_CLIENT_ENTREPRISE, type_client: "particulier" },
      numero: "FA-2026-0009",
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.reason).toMatch(/particuliers/i);
    }
  });
});
