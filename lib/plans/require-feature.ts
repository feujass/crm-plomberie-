import { backendFetch } from "@/lib/backend/server";
import { canAccessFeature, type GatedFeature } from "@/lib/plans/features";
import { getRequestAuthUser, getRequestProfileRow } from "@/lib/supabase/request-auth";
import { isSupabaseDataMode } from "@/lib/supabase/env";
import { mapProfileRow } from "@/lib/supabase/row-maps";
import type { BackendMeResponse, BackendProfile } from "@/types/backend";
import { redirect } from "next/navigation";

export async function loadProfileForGating(): Promise<BackendProfile | undefined> {
  try {
    if (isSupabaseDataMode()) {
      const user = await getRequestAuthUser();
      if (!user) return undefined;
      const row = await getRequestProfileRow(user.id);
      return mapProfileRow(row as Record<string, unknown> | null);
    }
    const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
    return me.profile;
  } catch {
    return undefined;
  }
}

export async function requireFeature(feature: GatedFeature, redirectTo = "/compte/donnees"): Promise<BackendProfile | undefined> {
  const profile = await loadProfileForGating();
  if (!canAccessFeature(profile, feature)) {
    redirect(`${redirectTo}?upgrade=${feature}`);
  }
  return profile;
}

export function assertFeatureApi(profile: BackendProfile | undefined, feature: GatedFeature): string | null {
  if (canAccessFeature(profile, feature)) return null;
  if (feature === "facturation") {
    return "La facturation est incluse à partir du plan Pro+. Passez au plan supérieur pour créer et envoyer des factures.";
  }
  if (feature === "rentabilite") {
    return "Le suivi de rentabilité est inclus dans le plan PME.";
  }
  return "Fonctionnalité non incluse dans votre offre actuelle.";
}
