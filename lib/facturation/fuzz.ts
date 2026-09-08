import type { FacturXSource } from "@/lib/facturation/build-facturx-xml";
import { FIXTURE_CLIENT_ENTREPRISE, FIXTURE_EMETTEUR } from "@/lib/facturation/facturx-fixtures";
import type { TypeLigneFacture } from "@/lib/facturation/type-ligne";

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
    client: FIXTURE_CLIENT_ENTREPRISE,
    lignes,
    factureOrigineNumero: avoir ? "FA-ORIGINE-1" : null,
    factureOrigineDate: avoir ? "2026-02-01" : null,
  };
}
