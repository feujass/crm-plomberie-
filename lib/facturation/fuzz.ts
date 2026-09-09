import type { AdresseStructuree } from "@/lib/facturation/adresse";
import type { FacturXSource } from "@/lib/facturation/build-facturx-xml";
import {
  eligibilityFacturX,
  type EmissionFacturXBlocker,
} from "@/lib/facturation/emission-gate";
import { FIXTURE_EMETTEUR, fixtureMonoTva } from "@/lib/facturation/facturx-fixtures";
import type { SnapshotClient } from "@/lib/facturation/snapshots";
import type { TypeLigneFacture } from "@/lib/facturation/type-ligne";

/** Adresses de la matrice : on isole kind / ident, pas la confirmation d’adresse. */
const MATRIX_CONFIRMED_AT = "2026-03-01T00:00:00Z";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("pick vide");
  return item;
}

function int(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export const FUZZ_CLIENT_KINDS = ["particulier", "pro_assujetti", "pro_non_assujetti", "public"] as const;
export const FUZZ_VAT = ["avec_tva", "sans_tva"] as const;
export const FUZZ_IDENT = ["siren", "siret", "aucun"] as const;
export const FUZZ_LIVRAISON = ["identique", "differente", "absente"] as const;
export const FUZZ_GEO = ["FR", "UE", "hors_UE"] as const;

export type FuzzClientKind = (typeof FUZZ_CLIENT_KINDS)[number];
export type FuzzVat = (typeof FUZZ_VAT)[number];
export type FuzzIdent = (typeof FUZZ_IDENT)[number];
export type FuzzLivraison = (typeof FUZZ_LIVRAISON)[number];
export type FuzzGeo = (typeof FUZZ_GEO)[number];

export type FuzzClientProfile = {
  kind: FuzzClientKind;
  vat: FuzzVat;
  ident: FuzzIdent;
  livraison: FuzzLivraison;
  geo: FuzzGeo;
};

const SIREN_FR = "443061841";
const SIRET_FR = "44306184100047";
const TVA_FR = "FR64443061841";
const TVA_DE = "DE136695976";
const TVA_US = "US123456789";

const ADDR_FR_FACTU: AdresseStructuree = {
  ligne1: "35 rue de la République",
  ligne2: "",
  cp: "69001",
  ville: "Lyon",
  pays: "FR",
};
const ADDR_FR_LIV: AdresseStructuree = {
  ligne1: "8 impasse des Lilas",
  ligne2: "Bâtiment B",
  cp: "69100",
  ville: "Villeurbanne",
  pays: "FR",
};
const ADDR_UE_FACTU: AdresseStructuree = {
  ligne1: "10 Unter den Linden",
  ligne2: "",
  cp: "10117",
  ville: "Berlin",
  pays: "DE",
};
const ADDR_UE_LIV: AdresseStructuree = {
  ligne1: "2 Speersort",
  ligne2: "",
  cp: "20095",
  ville: "Hamburg",
  pays: "DE",
};
const ADDR_US_FACTU: AdresseStructuree = {
  ligne1: "1 Market Street",
  ligne2: "",
  cp: "94105",
  ville: "San Francisco",
  pays: "US",
};
const ADDR_US_LIV: AdresseStructuree = {
  ligne1: "233 S Wacker Drive",
  ligne2: "",
  cp: "60606",
  ville: "Chicago",
  pays: "US",
};

export function allFuzzClientProfiles(): FuzzClientProfile[] {
  const out: FuzzClientProfile[] = [];
  for (const kind of FUZZ_CLIENT_KINDS) {
    for (const vat of FUZZ_VAT) {
      for (const ident of FUZZ_IDENT) {
        for (const livraison of FUZZ_LIVRAISON) {
          for (const geo of FUZZ_GEO) {
            out.push({ kind, vat, ident, livraison, geo });
          }
        }
      }
    }
  }
  return out;
}

export function fuzzClientProfileKey(profile: FuzzClientProfile): string {
  return `${profile.kind}|${profile.vat}|${profile.ident}|${profile.livraison}|${profile.geo}`;
}

function addressesForGeo(geo: FuzzGeo): { factu: AdresseStructuree; liv: AdresseStructuree } {
  if (geo === "UE") return { factu: ADDR_UE_FACTU, liv: ADDR_UE_LIV };
  if (geo === "hors_UE") return { factu: ADDR_US_FACTU, liv: ADDR_US_LIV };
  return { factu: ADDR_FR_FACTU, liv: ADDR_FR_LIV };
}

function vatForProfile(profile: FuzzClientProfile): string | null {
  if (profile.vat === "sans_tva") return null;
  if (profile.geo === "FR") return TVA_FR;
  if (profile.geo === "UE") return TVA_DE;
  return TVA_US;
}

function typeClient(kind: FuzzClientKind): SnapshotClient["type_client"] {
  if (kind === "particulier") return "particulier";
  if (kind === "public") return "public";
  return "entreprise";
}

export function snapshotClientFromProfile(profile: FuzzClientProfile): SnapshotClient {
  const { factu, liv } = addressesForGeo(profile.geo);
  const ident =
    profile.ident === "siren"
      ? { siren: SIREN_FR, siret: null }
      : profile.ident === "siret"
        ? { siren: null, siret: SIRET_FR }
        : { siren: null, siret: null };
  const particulier = profile.kind === "particulier";
  const livraison =
    profile.livraison === "absente" ? null : profile.livraison === "identique" ? { ...factu } : { ...liv };
  return {
    nom: particulier ? "Martin" : profile.kind === "public" ? "Commune de Test" : "SCI Les Balmes",
    prenom: particulier ? "Jules" : null,
    type_client: typeClient(profile.kind),
    ...ident,
    tva_intracom: vatForProfile(profile),
    adresse_facturation: { ...factu },
    adresse_livraison: livraison,
    email: "client-fuzz@example.test",
    tel: "+33100000000",
  };
}

/** Facture stable (1 ligne 10 %) + profil client — pour isoler les cassures Mustang. */
export function facturXSourceFromClientProfile(profile: FuzzClientProfile): FacturXSource {
  const base = fixtureMonoTva();
  return {
    ...base,
    client: snapshotClientFromProfile(profile),
  };
}

export type FuzzEinvoicingExcluded = {
  status: "excluded";
  key: string;
  reason: string;
  blockers: EmissionFacturXBlocker[];
};

export type FuzzEinvoicingInScope = {
  status: "in_scope";
  key: string;
  source: FacturXSource;
};

export type FuzzEinvoicingClassification = FuzzEinvoicingExcluded | FuzzEinvoicingInScope;

/** Même gate que `POST /api/factures/[id]/facturx`. */
export function classifyFuzzEinvoicing(profile: FuzzClientProfile): FuzzEinvoicingClassification {
  const source = facturXSourceFromClientProfile(profile);
  const key = fuzzClientProfileKey(profile);
  const gate = eligibilityFacturX({
    emetteurAdresse: source.emetteur.adresse,
    emetteurConfirmeeAt: MATRIX_CONFIRMED_AT,
    clientType: source.client.type_client,
    clientAdresse: source.client.adresse_facturation,
    clientConfirmeeAt: MATRIX_CONFIRMED_AT,
    natureOperation: source.natureOperation,
    datePrestationDebut: source.datePrestationDebut,
    datePrestationFin: source.datePrestationFin,
    regimeTva: source.regimeTva,
    snapshotEmetteur: source.emetteur,
    snapshotClient: source.client,
    numero: source.numero,
  });
  if (!gate.ok) {
    return { status: "excluded", key, reason: gate.reason, blockers: gate.blockers };
  }
  return { status: "in_scope", key, source };
}

export function partitionFuzzEinvoicingMatrix(): {
  excluded: FuzzEinvoicingExcluded[];
  inScope: FuzzEinvoicingInScope[];
} {
  const excluded: FuzzEinvoicingExcluded[] = [];
  const inScope: FuzzEinvoicingInScope[] = [];
  for (const profile of allFuzzClientProfiles()) {
    const classified = classifyFuzzEinvoicing(profile);
    if (classified.status === "excluded") excluded.push(classified);
    else inScope.push(classified);
  }
  return { excluded, inScope };
}

/** Quantité / prix / remise construits en entiers, exposés en chaînes décimales. */
export function randomFacturXSource(seed: number): FacturXSource {
  const rng = mulberry32(seed);
  const franchise = rng() < 0.08;
  const avoir = !franchise && rng() < 0.08;
  const nLignes = int(rng, 1, 6);
  const rates = franchise ? (["0"] as const) : (["5.50", "10.00", "20.00"] as const);
  const lignes = Array.from({ length: nLignes }, (_, i) => {
    const qtyInt = avoir ? -int(rng, 1, 8) : int(rng, 1, 25);
    const qtyMilli = int(rng, 0, 999);
    const prixEuros = int(rng, 1, 400);
    const prixCents = int(rng, 0, 99);
    const prixTotalCents = prixEuros * 100 + prixCents;
    const hasRemise = !avoir && rng() < 0.35 && prixTotalCents > 1;
    const remiseCents = hasRemise ? int(rng, 1, prixTotalCents - 1) : 0;
    const remiseEuros = Math.floor(remiseCents / 100);
    const remiseRest = remiseCents % 100;
    const type_ligne: TypeLigneFacture = rng() < 0.5 ? "bien" : "service";
    return {
      designation: `Ligne ${i + 1} seed ${seed}`,
      quantite: `${qtyInt}.${String(qtyMilli).padStart(3, "0")}`,
      unite: pick(rng, ["u", "h", "forfait"]),
      prix_ht: `${prixEuros}.${String(prixCents).padStart(2, "0")}`,
      tva: pick(rng, rates),
      remise_unitaire: hasRemise ? `${remiseEuros}.${String(remiseRest).padStart(2, "0")}` : "0.00",
      type_ligne,
    };
  });
  const hasBien = lignes.some((l) => l.type_ligne === "bien");
  const hasService = lignes.some((l) => l.type_ligne === "service");
  const nature = hasBien && hasService ? "mixte" : hasBien ? "biens" : "services";
  const profiles = allFuzzClientProfiles();
  const clientProfile = pick(rng, profiles);
  return {
    numero: `FZ-${seed}`,
    typeCode: avoir ? "381" : "380",
    dateEmission: "2026-03-15",
    dateEcheance: "2026-04-14",
    notes: null,
    natureOperation: nature,
    datePrestationDebut: "2026-03-01",
    datePrestationFin: "2026-03-10",
    optionTvaDebits: rng() < 0.3,
    regimeTva: franchise ? "franchise_293b" : rng() < 0.5 ? "encaissements" : "debits",
    montantPaye: "0.00",
    emetteur: franchise
      ? { ...FIXTURE_EMETTEUR, regime_tva: "franchise_293b", numero_tva_intracom: null, option_tva_debits: false }
      : FIXTURE_EMETTEUR,
    client: snapshotClientFromProfile(clientProfile),
    lignes,
    factureOrigineNumero: avoir ? "FA-ORIGINE-1" : null,
    factureOrigineDate: avoir ? "2026-02-01" : null,
  };
}
