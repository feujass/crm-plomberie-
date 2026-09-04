import { buildDevisMetaFromIa } from "@/lib/devis/ia-metadata";
import { readDemoSessionId } from "@/lib/demo/cookie";
import type { DevisIaResponse } from "@/lib/schemas/devis-ia";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcDevisTotals, nextDevisNumero } from "@/lib/supabase/row-maps";

async function insertDevisLignes(
  admin: ReturnType<typeof createAdminClient>,
  devisId: string,
  lignesIn: Array<Record<string, unknown>>,
) {
  const raw = lignesIn.map((l, i) => ({
    section: String(l.section ?? ""),
    designation: String(l.designation ?? ""),
    quantite: Number(l.quantite ?? 1),
    unite: String(l.unite ?? "u"),
    prix_ht: Number(l.prix_ht ?? 0),
    tva: Number(l.tva ?? 10),
    ordre: Number(l.ordre ?? i),
    ligne_type: String(l.ligne_type ?? "prestation"),
  }));
  const { lignes } = calcDevisTotals(raw);
  if (lignes.length === 0) return;
  const { error } = await admin.from("devis_lignes").insert(
    lignes.map((l) => ({
      devis_id: devisId,
      section: l.section,
      designation: l.designation,
      quantite: l.quantite,
      unite: l.unite,
      prix_ht: l.prix_ht,
      tva: l.tva,
      total_ht: l.total_ht,
      ordre: l.ordre,
      ligne_type: l.ligne_type,
    })),
  );
  if (error) throw new Error(error.message);
}

/** Rattache le devis démo au compte nouvellement créé et crée le devis CRM. */
export async function linkDemoQuoteToUser(
  userId: string,
  demoSessionCookie: string | undefined | null,
): Promise<{ devisId: string | null; demoQuoteId: string | null }> {
  const demoSessionId = readDemoSessionId(demoSessionCookie);
  if (!demoSessionId) return { devisId: null, demoQuoteId: null };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("demo_quotes")
    .select("*")
    .eq("demo_session_id", demoSessionId)
    .is("user_id", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { devisId: null, demoQuoteId: null };

  const quote = row.quote_json as DevisIaResponse;
  const meta = buildDevisMetaFromIa(quote);
  const lignesIn = quote.lignes.map((l, i) => ({
    designation: l.designation,
    quantite: l.quantite,
    unite: l.unite,
    prix_ht: l.prix_ht,
    tva: l.tva,
    section: l.section ?? null,
    ligne_type: l.ligne_type ?? null,
    ordre: i,
  }));

  const numero = await nextDevisNumero(admin, userId);
  const { total_ht, total_tva, total_ttc } = calcDevisTotals(lignesIn);

  const { data: devis, error: devisErr } = await admin
    .from("devis")
    .insert({
      user_id: userId,
      client_id: null,
      numero,
      statut: "brouillon",
      total_ht,
      total_tva,
      total_ttc,
      notes: meta.notes,
      date_expiration: meta.date_expiration,
      adresse_chantier: quote.adresse_chantier?.trim() || null,
      remise_type: null,
      remise_value: null,
    })
    .select("id")
    .single();

  if (devisErr || !devis?.id) {
    console.error("[demo/link] devis insert failed", devisErr?.message);
    return { devisId: null, demoQuoteId: row.id as string };
  }

  const devisId = String(devis.id);
  await insertDevisLignes(admin, devisId, lignesIn);

  await admin
    .from("demo_quotes")
    .update({ user_id: userId, devis_id: devisId, linked_at: new Date().toISOString() })
    .eq("id", row.id);

  return { devisId, demoQuoteId: row.id as string };
}
