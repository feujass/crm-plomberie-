import { listFactureCycleEvents, type CycleJournalRow } from "@/lib/facturation/pa/redeposit";
import { createClient } from "@/lib/supabase/server";

export async function loadFactureCycleJournal(factureId: string): Promise<CycleJournalRow[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    return await listFactureCycleEvents(supabase, user.id, factureId);
  } catch {
    return [];
  }
}
