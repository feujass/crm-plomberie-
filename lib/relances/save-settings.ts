import { backendFetch } from "@/lib/backend/server";
import {
  parseNotificationPreferences,
  serializeNotificationPreferences,
} from "@/lib/notifications/preferences";
import { parseRelanceEcheances } from "@/lib/relances/schedule";
import { isSupabaseDataMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type SaveRelanceResult = {
  ok: true;
  warning?: "stored_in_preferences";
};

function isMissingColumn(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("schema cache") || m.includes("could not find");
}

export async function saveRelanceSettings(
  devisEcheances: string,
  factureEcheances: string,
): Promise<SaveRelanceResult> {
  const firstDevis = parseRelanceEcheances(devisEcheances, [3])[0] ?? 3;
  const firstFacture = parseRelanceEcheances(factureEcheances, [0])[0] ?? 0;

  if (isSupabaseDataMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    const fullPayload = {
      relance_devis_echeances: devisEcheances,
      relance_facture_echeances: factureEcheances,
      relance_devis_jours: firstDevis,
      relance_facture_jours: firstFacture,
    };

    const { error: fullError } = await supabase.from("profiles").update(fullPayload).eq("id", user.id);
    if (!fullError) return { ok: true };

    if (!isMissingColumn(fullError.message)) {
      throw new Error(fullError.message);
    }

    const { data: prof, error: readErr } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", user.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    const prefs = parseNotificationPreferences(prof?.notification_preferences);
    const notification_preferences = serializeNotificationPreferences({
      ...prefs,
      relance_devis_echeances: devisEcheances,
      relance_facture_echeances: factureEcheances,
    });

    const { error: fallbackError } = await supabase
      .from("profiles")
      .update({
        notification_preferences,
        relance_devis_jours: firstDevis,
        relance_facture_jours: firstFacture,
      })
      .eq("id", user.id);

    if (fallbackError) throw new Error(fallbackError.message);
    return { ok: true, warning: "stored_in_preferences" };
  }

  await backendFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relance_devis_echeances: devisEcheances,
      relance_facture_echeances: factureEcheances,
      relance_devis_jours: firstDevis,
      relance_facture_jours: firstFacture,
    }),
  });
  return { ok: true };
}

/** Lit les échéances depuis le profil (colonnes dédiées ou repli JSON). */
export function relanceEcheancesFromProfile(profile: {
  relance_devis_echeances?: string | null;
  relance_facture_echeances?: string | null;
  relance_devis_jours?: number | null;
  relance_facture_jours?: number | null;
  notification_preferences?: unknown;
}) {
  const prefs = parseNotificationPreferences(profile.notification_preferences);
  return {
    relance_devis_echeances:
      profile.relance_devis_echeances?.trim() || prefs.relance_devis_echeances?.trim() || undefined,
    relance_facture_echeances:
      profile.relance_facture_echeances?.trim() || prefs.relance_facture_echeances?.trim() || undefined,
    relance_devis_jours: profile.relance_devis_jours,
    relance_facture_jours: profile.relance_facture_jours,
  };
}
