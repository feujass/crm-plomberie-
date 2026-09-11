import type { SupabaseClient } from "@supabase/supabase-js";

import {
  clientDisplayName,
  mapDevisDetailRow,
  mapDevisLineRow,
  nextFactureNumero,
} from "@/lib/supabase/row-maps";

export { clientDisplayName, mapDevisDetailRow, mapDevisLineRow, nextFactureNumero };

export async function fetchDevisLignesHelper(supabase: SupabaseClient, devisId: string) {
  const { data } = await supabase
    .from("devis_lignes")
    .select("*")
    .eq("devis_id", devisId)
    .order("ordre", { ascending: true });
  return (data ?? []).map((r) => mapDevisLineRow(r as Record<string, unknown>));
}
