import type { SupabaseClient } from "@supabase/supabase-js";

type CloneKind = "avoir" | "nouvelle";

function negate(n: number): number {
  return n === 0 ? 0 : -Math.abs(n);
}

export async function cloneFacture(
  supabase: SupabaseClient,
  userId: string,
  sourceId: string,
  kind: CloneKind,
): Promise<{ id: string }> {
  const { data: source, error: sourceError } = await supabase
    .from("factures")
    .select("*")
    .eq("id", sourceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (sourceError) throw new Error(sourceError.message);
  if (!source) throw new Error("Facture introuvable");
  if (kind === "avoir" && String(source.facture_type ?? "") === "avoir") {
    throw new Error("Impossible de créer un avoir à partir d’un avoir.");
  }

  const { data: lignes, error: lignesError } = await supabase
    .from("facture_lignes")
    .select("*")
    .eq("facture_id", sourceId)
    .order("ordre", { ascending: true });
  if (lignesError) throw new Error(lignesError.message);

  const sign = kind === "avoir" ? -1 : 1;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const echeance = new Date(now);
  echeance.setDate(echeance.getDate() + 30);

  const ht = Number(source.total_ht ?? 0);
  const tva = Number(source.total_tva ?? 0);
  const ttc = Number(source.total_ttc ?? 0);

  const insertRow: Record<string, unknown> = {
    user_id: userId,
    devis_id: source.devis_id,
    client_id: source.client_id,
    statut: "emise",
    statut_cycle_vie: "emise",
    total_ht: sign < 0 ? negate(ht) : ht,
    total_tva: sign < 0 ? negate(tva) : tva,
    total_ttc: sign < 0 ? negate(ttc) : ttc,
    date_emission: today,
    date_echeance: echeance.toISOString().slice(0, 10),
    adresse_livraison_chantier: source.adresse_livraison_chantier,
    operations_type: source.operations_type,
    nature_operation: source.nature_operation,
    option_tva_debits: source.option_tva_debits,
    devise: source.devise ?? "EUR",
    snapshot_emetteur: source.snapshot_emetteur,
    snapshot_client: source.snapshot_client,
    notes: source.notes,
    date_prestation_debut: source.date_prestation_debut,
    date_prestation_fin: source.date_prestation_fin,
    chorus_service_code: source.chorus_service_code,
    conformite_branche: source.conformite_branche,
    conformite_warnings: source.conformite_warnings ?? [],
    locked_at: now.toISOString(),
  };

  if (kind === "avoir") {
    insertRow.facture_type = "avoir";
    insertRow.facture_origine_id = source.id;
    insertRow.facture_origine_numero = source.numero;
    insertRow.facture_origine_date = source.date_emission
      ? String(source.date_emission).slice(0, 10)
      : today;
  } else {
    insertRow.facture_type = "standard";
  }

  const { data: created, error: insertError } = await supabase
    .from("factures")
    .insert(insertRow)
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);
  const newId = String(created.id);

  const copied = (lignes ?? []).map((line, i) => ({
    facture_id: newId,
    section: line.section ?? "",
    designation: line.designation,
    quantite: sign < 0 ? negate(Number(line.quantite ?? 1)) : Number(line.quantite ?? 1),
    unite: line.unite ?? "u",
    prix_ht: Number(line.prix_ht ?? 0),
    tva: Number(line.tva ?? 10),
    total_ht: sign < 0 ? negate(Number(line.total_ht ?? 0)) : Number(line.total_ht ?? 0),
    ordre: line.ordre ?? i,
    type_ligne: line.type_ligne ?? "service",
  }));
  if (copied.length > 0) {
    const { error: copyError } = await supabase.from("facture_lignes").insert(copied);
    if (copyError) throw new Error(copyError.message);
  }

  return { id: newId };
}
