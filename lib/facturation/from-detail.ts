import type { FacturXLigne, FacturXSource } from "@/lib/facturation/build-facturx-xml";
import { parseRegimeTva } from "@/lib/facturation/regime-tva";
import type { SnapshotClient, SnapshotEmetteur } from "@/lib/facturation/snapshots";
import { computeFactureTotals } from "@/lib/facturation/totals";
import type { NatureOperation, TypeLigneFacture } from "@/lib/facturation/type-ligne";
import { natureOperationFromLignes } from "@/lib/facturation/type-ligne";
import type { BackendFactureDetail } from "@/types/backend";

function asTypeLigne(value: unknown): TypeLigneFacture {
  return value === "bien" ? "bien" : "service";
}

function asNature(value: unknown, lignes: FacturXLigne[]): NatureOperation {
  if (value === "biens" || value === "services" || value === "mixte") return value;
  return natureOperationFromLignes(lignes.map((l) => l.type_ligne));
}

export function isAvoirFacture(factureType: string | undefined, lineTotalCents: number): boolean {
  const t = String(factureType ?? "").toLowerCase();
  if (t === "avoir" || t === "credit" || t === "credit_note") return true;
  return lineTotalCents < 0;
}

export function facturXSourceFromDetail(input: {
  facture: BackendFactureDetail;
  emetteur: SnapshotEmetteur;
  client: SnapshotClient;
}): FacturXSource {
  const { facture, emetteur, client } = input;
  const lignes: FacturXLigne[] = (facture.lignes ?? []).map((l) => ({
    designation: l.designation,
    quantite: l.quantite_decimal ?? l.quantite ?? 1,
    unite: l.unite ?? "u",
    prix_ht: l.prix_ht_decimal ?? l.prix_ht ?? 0,
    tva: l.tva_decimal ?? l.tva ?? 0,
    type_ligne: asTypeLigne(l.type_ligne),
  }));
  const regimeTva = parseRegimeTva(emetteur.regime_tva);
  const totals = computeFactureTotals({
    lignes,
    regimeTva,
    montantPaye: facture.montant_paye ?? 0,
  });
  const avoir = isAvoirFacture(facture.facture_type, totals.lineTotalCents);
  const dateEmission = String(facture.date_emission ?? "").slice(0, 10);
  if (!dateEmission) {
    throw new Error("Date d’émission manquante.");
  }
  return {
    numero: String(facture.numero ?? "").trim(),
    typeCode: avoir ? "381" : "380",
    dateEmission,
    dateEcheance: facture.date_echeance ? String(facture.date_echeance).slice(0, 10) : null,
    notes: facture.notes ?? null,
    natureOperation: asNature(facture.nature_operation ?? facture.operations_type, lignes),
    datePrestationDebut: facture.date_prestation_debut ? String(facture.date_prestation_debut).slice(0, 10) : null,
    datePrestationFin: facture.date_prestation_fin ? String(facture.date_prestation_fin).slice(0, 10) : null,
    optionTvaDebits: Boolean(facture.option_tva_debits),
    regimeTva,
    montantPaye: facture.montant_paye_decimal ?? facture.montant_paye ?? 0,
    emetteur,
    client,
    lignes,
    factureOrigineNumero: facture.facture_origine_numero ?? null,
    factureOrigineDate: facture.facture_origine_date ?? null,
  };
}
