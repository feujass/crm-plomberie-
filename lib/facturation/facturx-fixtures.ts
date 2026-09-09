import type { FacturXSource } from "@/lib/facturation/build-facturx-xml";
import type { SnapshotClient, SnapshotEmetteur } from "@/lib/facturation/snapshots";

const ADDR_LYON = {
  ligne1: "12 rue de la République",
  ligne2: "",
  cp: "69003",
  ville: "Lyon",
  pays: "FR",
};

const ADDR_CHANTIER = {
  ligne1: "8 impasse des Lilas",
  ligne2: "Bâtiment B",
  cp: "69100",
  ville: "Villeurbanne",
  pays: "FR",
};

export const FIXTURE_EMETTEUR: SnapshotEmetteur = {
  entreprise_nom: "Plomberie Dupont",
  siren: "732829320",
  siret: "73282932000074",
  numero_tva_intracom: "FR44732829320",
  forme_juridique: "EI",
  regime_tva: "encaissements",
  option_tva_debits: false,
  adresse: ADDR_LYON,
  email_facturation: "contact@plomberie-dupont.test",
  tel: "+33472000000",
  iban: "FR1420041010050500013M02606",
  bic: "AGRIFRPP",
  rcs_ville: "Lyon",
  capital_social: null,
};

export const FIXTURE_CLIENT_ENTREPRISE: SnapshotClient = {
  nom: "SCI Les Balmes",
  prenom: null,
  type_client: "entreprise",
  siren: "443061841",
  siret: "44306184100047",
  tva_intracom: "FR64443061841",
  adresse_facturation: {
    ligne1: "35 rue de la République",
    ligne2: "",
    cp: "69001",
    ville: "Lyon",
    pays: "FR",
  },
  adresse_livraison: ADDR_CHANTIER,
  email: "compta@balmes.test",
  tel: "+33478000000",
};

const BASE: Omit<FacturXSource, "lignes" | "regimeTva" | "optionTvaDebits" | "typeCode"> = {
  numero: "FA-2026-0001",
  dateEmission: "2026-03-15",
  dateEcheance: "2026-04-14",
  notes: null,
  natureOperation: "services",
  datePrestationDebut: "2026-03-01",
  datePrestationFin: "2026-03-10",
  montantPaye: 0,
  emetteur: FIXTURE_EMETTEUR,
  client: FIXTURE_CLIENT_ENTREPRISE,
};

/** Facture mixte, deux taux, livraison distincte — cas de référence Schematron. */
export function fixtureMixteMultiTva(): FacturXSource {
  return {
    ...BASE,
    typeCode: "380",
    regimeTva: "encaissements",
    optionTvaDebits: false,
    natureOperation: "mixte",
    lignes: [
      {
        designation: "Fourniture mitigeur thermostatique",
        quantite: 1,
        unite: "u",
        prix_ht: 180,
        tva: 20,
        total_ht: 180,
        type_ligne: "bien",
      },
      {
        designation: "Pose du mitigeur et mise en service",
        quantite: 2,
        unite: "h",
        prix_ht: 65,
        tva: 10,
        total_ht: 130,
        type_ligne: "service",
      },
    ],
  };
}

export function fixtureMonoTva(): FacturXSource {
  return {
    ...BASE,
    numero: "FA-2026-0002",
    typeCode: "380",
    regimeTva: "encaissements",
    optionTvaDebits: false,
    natureOperation: "services",
    lignes: [
      {
        designation: "Dépannage fuite sous évier",
        quantite: 1,
        unite: "forfait",
        prix_ht: 220,
        tva: 10,
        total_ht: 220,
        type_ligne: "service",
      },
    ],
  };
}

export function fixtureFranchise293B(): FacturXSource {
  return {
    ...BASE,
    numero: "FA-2026-0003",
    typeCode: "380",
    regimeTva: "franchise_293b",
    optionTvaDebits: false,
    emetteur: {
      ...FIXTURE_EMETTEUR,
      regime_tva: "franchise_293b",
      option_tva_debits: false,
      numero_tva_intracom: null,
    },
    lignes: [
      {
        designation: "Remplacement flexible de douche",
        quantite: 1,
        unite: "u",
        prix_ht: 90,
        tva: 0,
        total_ht: 90,
        type_ligne: "service",
      },
    ],
  };
}

/**
 * Client pro avec SIREN mais sans TVA intra — le trou qui a laissé passer
 * `schemeID="FC"` côté acheteur (FX-SCH-A-000031 / Super PDP api:invalid).
 */
export function fixtureProSansTvaIntracom(): FacturXSource {
  return {
    ...BASE,
    numero: "FA-2026-0004",
    typeCode: "380",
    regimeTva: "encaissements",
    optionTvaDebits: false,
    natureOperation: "biens",
    client: {
      ...FIXTURE_CLIENT_ENTREPRISE,
      tva_intracom: null,
    },
    lignes: [
      {
        designation: "Fourniture mitigeur thermostatique",
        quantite: 1,
        unite: "u",
        prix_ht: 180,
        tva: 20,
        total_ht: 180,
        type_ligne: "bien",
      },
    ],
  };
}

export function fixtureAvoirNegatif(): FacturXSource {
  return {
    ...BASE,
    numero: "AV-2026-0001",
    typeCode: "381",
    regimeTva: "encaissements",
    optionTvaDebits: false,
    natureOperation: "services",
    factureOrigineNumero: "FA-2026-0002",
    factureOrigineDate: "2026-03-15",
    lignes: [
      {
        designation: "Avoir — dépannage non réalisé",
        quantite: -1,
        unite: "forfait",
        prix_ht: 220,
        tva: 10,
        total_ht: -220,
        type_ligne: "service",
      },
    ],
  };
}
