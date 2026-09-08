import { adressesEquivalentes, isAdresseComplete, type AdresseStructuree } from "@/lib/facturation/adresse";
import { centsToXml, milliToXml } from "@/lib/facturation/cents";
import { mentionFranchise293B, type RegimeTva } from "@/lib/facturation/regime-tva";
import type { SnapshotClient, SnapshotEmetteur } from "@/lib/facturation/snapshots";
import { computeFactureTotals } from "@/lib/facturation/totals";
import type { NatureOperation, TypeLigneFacture } from "@/lib/facturation/type-ligne";
import { digitsOnly, sirenFromSiret } from "@/lib/legal/siren";

/** Profil Factur-X EN 16931 (COMFORT). */
export const FACTURX_GUIDELINE_ID = "urn:cen.eu:en16931:2017";

export type FacturXLigne = {
  designation: string;
  quantite: unknown;
  unite: string;
  prix_ht: unknown;
  tva: unknown;
  /** Ignoré : le HT ligne est recalculé en centimes (qty × PU net). */
  total_ht?: unknown;
  remise_unitaire?: unknown;
  type_ligne: TypeLigneFacture;
};

export type FacturXSource = {
  numero: string;
  typeCode: "380" | "381";
  dateEmission: string;
  dateEcheance: string | null;
  notes: string | null;
  natureOperation: NatureOperation;
  datePrestationDebut: string | null;
  datePrestationFin: string | null;
  optionTvaDebits: boolean;
  regimeTva: RegimeTva;
  montantPaye: unknown;
  emetteur: SnapshotEmetteur;
  client: SnapshotClient;
  lignes: FacturXLigne[];
  factureOrigineNumero?: string | null;
  factureOrigineDate?: string | null;
};

const UNIT_CODES: Record<string, string> = {
  u: "C62",
  unite: "C62",
  unité: "C62",
  pce: "C62",
  piece: "C62",
  pièce: "C62",
  forfait: "C62",
  ens: "SET",
  lot: "SET",
  h: "HUR",
  heure: "HUR",
  heures: "HUR",
  j: "DAY",
  jour: "DAY",
  jours: "DAY",
  m: "MTR",
  ml: "MTR",
  m2: "MTK",
  "m²": "MTK",
  m3: "MTQ",
  "m³": "MTQ",
  kg: "KGM",
  l: "LTR",
  litre: "LTR",
  litres: "LTR",
};

export function uneceUnitCode(unite: string | null | undefined): string {
  const key = String(unite ?? "u")
    .trim()
    .toLowerCase();
  return UNIT_CODES[key] ?? "C62";
}

export function isoCountry(pays: string | null | undefined): string {
  const p = String(pays ?? "FR").trim().toUpperCase();
  if (p === "FRANCE" || p === "FRA") return "FR";
  if (/^[A-Z]{2}$/.test(p)) return p;
  return "FR";
}

export function ciiDate(iso: string): string {
  const d = iso.trim().slice(0, 10).replace(/-/g, "");
  if (!/^\d{8}$/.test(d)) {
    throw new Error(`Date CII invalide : ${iso}`);
  }
  return d;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function compactIban(iban: string | null | undefined): string | null {
  const d = String(iban ?? "").replace(/\s+/g, "").toUpperCase();
  return d.length >= 15 ? d : null;
}

function frenchVatFromSiren(siren: string): string | null {
  const d = digitsOnly(siren);
  if (d.length !== 9) return null;
  const key = (12 + 3 * (Number(d) % 97)) % 97;
  return `FR${String(key).padStart(2, "0")}${d}`;
}

function sirenOf(siret: string | null, siren: string | null): string | null {
  if (siren && digitsOnly(siren).length === 9) return digitsOnly(siren);
  if (siret) return sirenFromSiret(siret);
  return null;
}

function partyName(client: SnapshotClient): string {
  return [client.prenom, client.nom].filter(Boolean).join(" ").trim() || client.nom;
}

function postalAddressXml(addr: AdresseStructuree): string {
  const line2 = addr.ligne2.trim()
    ? `<ram:LineTwo>${xmlEscape(addr.ligne2.trim())}</ram:LineTwo>`
    : "";
  return `<ram:PostalTradeAddress>
<ram:PostcodeCode>${xmlEscape(addr.cp.trim())}</ram:PostcodeCode>
<ram:LineOne>${xmlEscape(addr.ligne1.trim())}</ram:LineOne>
${line2}<ram:CityName>${xmlEscape(addr.ville.trim())}</ram:CityName>
<ram:CountryID>${isoCountry(addr.pays)}</ram:CountryID>
</ram:PostalTradeAddress>`;
}

function electronicAddressXml(email: string | null | undefined): string {
  const v = email?.trim();
  if (!v) return "";
  return `<ram:URIUniversalCommunication>
<ram:URIID schemeID="EM">${xmlEscape(v)}</ram:URIID>
</ram:URIUniversalCommunication>`;
}

/** Mentions obligatoires CIUS-FR (BR-FR-05) — mêmes textes que le PDF visuel. */
export const FACTURX_NOTES_CIUS_FR: { subjectCode: string; content: string }[] = [
  {
    subjectCode: "PMD",
    content: "Pénalités de retard : trois fois le taux d’intérêt légal.",
  },
  {
    subjectCode: "PMT",
    content: "Indemnité forfaitaire de 40 € pour frais de recouvrement (art. L. 441-10 C. com.).",
  },
  {
    subjectCode: "AAB",
    content: "Pas d’escompte pour paiement anticipé.",
  },
];

function contactXml(name: string, tel: string | null, email: string | null): string {
  const phone = tel?.trim()
    ? `<ram:TelephoneUniversalCommunication>
<ram:CompleteNumber>${xmlEscape(tel.trim())}</ram:CompleteNumber>
</ram:TelephoneUniversalCommunication>`
    : "";
  const mail = email?.trim()
    ? `<ram:EmailURIUniversalCommunication>
<ram:URIID schemeID="SMTP">${xmlEscape(email.trim())}</ram:URIID>
</ram:EmailURIUniversalCommunication>`
    : "";
  if (!name.trim() && !phone && !mail) return "";
  return `<ram:DefinedTradeContact>
<ram:PersonName>${xmlEscape(name.trim() || "Contact")}</ram:PersonName>
${phone}${mail}</ram:DefinedTradeContact>`;
}

function legalOrgXml(siret: string | null, siren: string | null): string {
  const sirenId = sirenOf(siret, siren);
  if (!sirenId) return "";
  return `<ram:SpecifiedLegalOrganization>
<ram:ID schemeID="0002">${xmlEscape(sirenId)}</ram:ID>
</ram:SpecifiedLegalOrganization>`;
}

function taxRegXml(opts: { vatId: string | null; siren: string | null; franchise: boolean }): string {
  if (!opts.franchise && opts.vatId) {
    return `<ram:SpecifiedTaxRegistration>
<ram:ID schemeID="VA">${xmlEscape(opts.vatId)}</ram:ID>
</ram:SpecifiedTaxRegistration>`;
  }
  if (opts.siren) {
    return `<ram:SpecifiedTaxRegistration>
<ram:ID schemeID="FC">${xmlEscape(opts.siren)}</ram:ID>
</ram:SpecifiedTaxRegistration>`;
  }
  return "";
}

function dueDateTypeCode(regime: RegimeTva, optionDebits: boolean): string | null {
  if (regime === "franchise_293b") return null;
  if (regime === "debits" || optionDebits) return "5";
  return "72";
}

/**
 * XML CII Factur-X EN 16931 — fonction pure, sans I/O.
 * Totaux recalculés en centimes entiers (BR-CO-10 à BR-CO-17).
 */
export function buildFacturXXml(facture: FacturXSource): string {
  if (!facture.numero.trim()) {
    throw new Error("Numéro de facture obligatoire pour Factur-X.");
  }
  if (facture.lignes.length === 0) {
    throw new Error("Au moins une ligne est obligatoire pour Factur-X.");
  }
  if (!isAdresseComplete(facture.emetteur.adresse)) {
    throw new Error("Adresse émetteur incomplète.");
  }
  if (!isAdresseComplete(facture.client.adresse_facturation)) {
    throw new Error("Adresse client incomplète.");
  }
  if (facture.typeCode === "381" && !String(facture.factureOrigineNumero ?? "").trim()) {
    throw new Error("Un avoir (UNTDID 381) doit porter la référence de la facture d’origine.");
  }

  const totals = computeFactureTotals({
    lignes: facture.lignes,
    regimeTva: facture.regimeTva,
    montantPaye: facture.montantPaye,
  });

  const franchise = facture.regimeTva === "franchise_293b";
  const sellerSiren = sirenOf(facture.emetteur.siret, facture.emetteur.siren);
  const sellerVat =
    facture.emetteur.numero_tva_intracom?.trim() ||
    (sellerSiren && !franchise ? frenchVatFromSiren(sellerSiren) : null);
  const buyerSiren = sirenOf(facture.client.siret, facture.client.siren);
  const buyerVat = facture.client.tva_intracom?.trim() || null;

  const lineXml: string[] = [];
  for (let i = 0; i < totals.lignes.length; i++) {
    const l = totals.lignes[i];
    if (!l) continue;
    const { category } = totals.slices.find((s) => s.rateCenti === l.rateCenti) ?? {
      category: l.rateCenti === 0 ? "E" : "S",
    };
    const exemption = category === "E" ? mentionFranchise293B("franchise_293b") : null;
    const exemptionLine =
      category === "E" && exemption
        ? `<ram:ExemptionReason>${xmlEscape(exemption)}</ram:ExemptionReason>`
        : "";
    const discountXml =
      l.remiseUnitCents > 0
        ? `<ram:GrossPriceProductTradePrice>
<ram:ChargeAmount>${centsToXml(l.prixCents)}</ram:ChargeAmount>
<ram:AppliedTradeAllowanceCharge>
<ram:ChargeIndicator>
<udt:Indicator>false</udt:Indicator>
</ram:ChargeIndicator>
<ram:ActualAmount>${centsToXml(l.remiseUnitCents)}</ram:ActualAmount>
</ram:AppliedTradeAllowanceCharge>
</ram:GrossPriceProductTradePrice>`
        : "";

    lineXml.push(`<ram:IncludedSupplyChainTradeLineItem>
<ram:AssociatedDocumentLineDocument>
<ram:LineID>${i + 1}</ram:LineID>
</ram:AssociatedDocumentLineDocument>
<ram:SpecifiedTradeProduct>
<ram:Name>${xmlEscape(l.designation.trim() || `Ligne ${i + 1}`)}</ram:Name>
</ram:SpecifiedTradeProduct>
<ram:SpecifiedLineTradeAgreement>
${discountXml}<ram:NetPriceProductTradePrice>
<ram:ChargeAmount>${centsToXml(l.netUnitCents)}</ram:ChargeAmount>
</ram:NetPriceProductTradePrice>
</ram:SpecifiedLineTradeAgreement>
<ram:SpecifiedLineTradeDelivery>
<ram:BilledQuantity unitCode="${uneceUnitCode(l.unite)}">${milliToXml(l.qtyMilli)}</ram:BilledQuantity>
</ram:SpecifiedLineTradeDelivery>
<ram:SpecifiedLineTradeSettlement>
<ram:ApplicableTradeTax>
<ram:TypeCode>VAT</ram:TypeCode>
${exemptionLine}<ram:CategoryCode>${category}</ram:CategoryCode>
<ram:RateApplicablePercent>${centsToXml(l.rateCenti)}</ram:RateApplicablePercent>
</ram:ApplicableTradeTax>
<ram:SpecifiedTradeSettlementLineMonetarySummation>
<ram:LineTotalAmount>${centsToXml(l.lineHtCents)}</ram:LineTotalAmount>
</ram:SpecifiedTradeSettlementLineMonetarySummation>
</ram:SpecifiedLineTradeSettlement>
</ram:IncludedSupplyChainTradeLineItem>`);
  }

  const dueCode = dueDateTypeCode(facture.regimeTva, facture.optionTvaDebits);
  const taxXml = totals.slices.map((bucket) => {
    const exemption =
      bucket.category === "E" && bucket.exemption
        ? `<ram:ExemptionReason>${xmlEscape(bucket.exemption)}</ram:ExemptionReason>`
        : "";
    const due =
      bucket.category === "S" && dueCode
        ? `<ram:DueDateTypeCode>${dueCode}</ram:DueDateTypeCode>`
        : "";
    return `<ram:ApplicableTradeTax>
<ram:CalculatedAmount>${centsToXml(bucket.vatCents)}</ram:CalculatedAmount>
<ram:TypeCode>VAT</ram:TypeCode>
${exemption}<ram:BasisAmount>${centsToXml(bucket.basisCents)}</ram:BasisAmount>
<ram:CategoryCode>${bucket.category}</ram:CategoryCode>
${due}<ram:RateApplicablePercent>${centsToXml(bucket.rateCenti)}</ram:RateApplicablePercent>
</ram:ApplicableTradeTax>`;
  });

  const notes: string[] = [];
  const franchiseMention = mentionFranchise293B(facture.regimeTva);
  if (franchiseMention) notes.push(franchiseMention);
  if (facture.notes?.trim()) notes.push(facture.notes.trim());
  const notesXml = [
    ...FACTURX_NOTES_CIUS_FR.map(
      (n) => `<ram:IncludedNote>
<ram:Content>${xmlEscape(n.content)}</ram:Content>
<ram:SubjectCode>${n.subjectCode}</ram:SubjectCode>
</ram:IncludedNote>`,
    ),
    ...notes.map(
      (n) => `<ram:IncludedNote>
<ram:Content>${xmlEscape(n)}</ram:Content>
</ram:IncludedNote>`,
    ),
  ].join("");

  const iban = compactIban(facture.emetteur.iban);
  const bic = facture.emetteur.bic?.replace(/\s+/g, "").toUpperCase() || null;
  const paymentXml = iban
    ? `<ram:SpecifiedTradeSettlementPaymentMeans>
<ram:TypeCode>30</ram:TypeCode>
<ram:Information>Virement</ram:Information>
<ram:PayeePartyCreditorFinancialAccount>
<ram:IBANID>${xmlEscape(iban)}</ram:IBANID>
</ram:PayeePartyCreditorFinancialAccount>
${
  bic
    ? `<ram:PayeeSpecifiedCreditorFinancialInstitution>
<ram:BICID>${xmlEscape(bic)}</ram:BICID>
</ram:PayeeSpecifiedCreditorFinancialInstitution>`
    : ""
}</ram:SpecifiedTradeSettlementPaymentMeans>`
    : "";

  const periodXml =
    facture.datePrestationDebut && facture.datePrestationFin
      ? `<ram:BillingSpecifiedPeriod>
<ram:StartDateTime>
<udt:DateTimeString format="102">${ciiDate(facture.datePrestationDebut)}</udt:DateTimeString>
</ram:StartDateTime>
<ram:EndDateTime>
<udt:DateTimeString format="102">${ciiDate(facture.datePrestationFin)}</udt:DateTimeString>
</ram:EndDateTime>
</ram:BillingSpecifiedPeriod>`
      : "";

  const deliveryEventXml =
    facture.datePrestationFin && (facture.natureOperation === "biens" || facture.natureOperation === "mixte")
      ? `<ram:ActualDeliverySupplyChainEvent>
<ram:OccurrenceDateTime>
<udt:DateTimeString format="102">${ciiDate(facture.datePrestationFin)}</udt:DateTimeString>
</ram:OccurrenceDateTime>
</ram:ActualDeliverySupplyChainEvent>`
      : "";

  const shipTo =
    facture.client.adresse_livraison &&
    isAdresseComplete(facture.client.adresse_livraison) &&
    !adressesEquivalentes(facture.client.adresse_facturation, facture.client.adresse_livraison)
      ? `<ram:ShipToTradeParty>
${postalAddressXml(facture.client.adresse_livraison)}
</ram:ShipToTradeParty>`
      : "";

  const paymentTermsXml = facture.dateEcheance
    ? `<ram:SpecifiedTradePaymentTerms>
<ram:Description>Paiement à échéance</ram:Description>
<ram:DueDateDateTime>
<udt:DateTimeString format="102">${ciiDate(facture.dateEcheance)}</udt:DateTimeString>
</ram:DueDateDateTime>
</ram:SpecifiedTradePaymentTerms>`
    : "";

  const refXml =
    facture.typeCode === "381"
      ? `<ram:InvoiceReferencedDocument>
<ram:IssuerAssignedID>${xmlEscape(String(facture.factureOrigineNumero).trim())}</ram:IssuerAssignedID>
${
  facture.factureOrigineDate
    ? `<ram:FormattedIssueDateTime>
<qdt:DateTimeString format="102">${ciiDate(facture.factureOrigineDate)}</qdt:DateTimeString>
</ram:FormattedIssueDateTime>`
    : ""
}</ram:InvoiceReferencedDocument>`
      : "";

  const sellerName = facture.emetteur.entreprise_nom.trim() || "Émetteur";
  const buyerName = partyName(facture.client);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
<rsm:ExchangedDocumentContext>
<ram:GuidelineSpecifiedDocumentContextParameter>
<ram:ID>${FACTURX_GUIDELINE_ID}</ram:ID>
</ram:GuidelineSpecifiedDocumentContextParameter>
</rsm:ExchangedDocumentContext>
<rsm:ExchangedDocument>
<ram:ID>${xmlEscape(facture.numero.trim())}</ram:ID>
<ram:TypeCode>${facture.typeCode}</ram:TypeCode>
<ram:IssueDateTime>
<udt:DateTimeString format="102">${ciiDate(facture.dateEmission)}</udt:DateTimeString>
</ram:IssueDateTime>
${notesXml}</rsm:ExchangedDocument>
<rsm:SupplyChainTradeTransaction>
${lineXml.join("")}
<ram:ApplicableHeaderTradeAgreement>
<ram:SellerTradeParty>
<ram:Name>${xmlEscape(sellerName)}</ram:Name>
${legalOrgXml(facture.emetteur.siret, facture.emetteur.siren)}
${contactXml(sellerName, facture.emetteur.tel, facture.emetteur.email_facturation)}
${postalAddressXml(facture.emetteur.adresse)}
${electronicAddressXml(facture.emetteur.email_facturation)}
${taxRegXml({ vatId: sellerVat, siren: sellerSiren, franchise })}
</ram:SellerTradeParty>
<ram:BuyerTradeParty>
<ram:Name>${xmlEscape(buyerName)}</ram:Name>
${legalOrgXml(facture.client.siret, facture.client.siren)}
${contactXml(buyerName, facture.client.tel, facture.client.email)}
${postalAddressXml(facture.client.adresse_facturation)}
${electronicAddressXml(facture.client.email)}
${taxRegXml({ vatId: buyerVat, siren: buyerSiren, franchise: false })}
</ram:BuyerTradeParty>
</ram:ApplicableHeaderTradeAgreement>
<ram:ApplicableHeaderTradeDelivery>
${shipTo}${deliveryEventXml}
</ram:ApplicableHeaderTradeDelivery>
<ram:ApplicableHeaderTradeSettlement>
<ram:PaymentReference>${xmlEscape(facture.numero.trim())}</ram:PaymentReference>
<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
${paymentXml}${taxXml.join("")}${periodXml}${paymentTermsXml}
<ram:SpecifiedTradeSettlementHeaderMonetarySummation>
<ram:LineTotalAmount>${centsToXml(totals.lineTotalCents)}</ram:LineTotalAmount>
<ram:TaxBasisTotalAmount>${centsToXml(totals.lineTotalCents)}</ram:TaxBasisTotalAmount>
<ram:TaxTotalAmount currencyID="EUR">${centsToXml(totals.taxTotalCents)}</ram:TaxTotalAmount>
<ram:GrandTotalAmount>${centsToXml(totals.grandCents)}</ram:GrandTotalAmount>
<ram:TotalPrepaidAmount>${centsToXml(totals.prepaidCents)}</ram:TotalPrepaidAmount>
<ram:DuePayableAmount>${centsToXml(totals.dueCents)}</ram:DuePayableAmount>
</ram:SpecifiedTradeSettlementHeaderMonetarySummation>
${refXml}</ram:ApplicableHeaderTradeSettlement>
</rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
}
