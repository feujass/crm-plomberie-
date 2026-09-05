"use server";

import { ASSISTANT_DISPLAY_NAME } from "@/lib/assistant-branding";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse } from "@/types/backend";
import { revalidatePath } from "next/cache";

export type AssistantSettingsPayload = {
  prenom: string;
  nom: string;
  tva_defaut: number;
  pays: string;
  sep_fourniture_pose: boolean;
  use_personal_library: boolean;
  structure_devis: string;
  assistant_name: string;
};

export async function flushAssistantSettingsAction(data: AssistantSettingsPayload): Promise<{ ok: true; me: BackendMeResponse } | { ok: false; error: string }> {
  try {
    await backendFetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prenom: data.prenom.trim(),
        nom: data.nom.trim(),
      }),
    });
    await backendFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tva_defaut: data.tva_defaut,
        sep_fourniture_pose: data.sep_fourniture_pose,
        structure_devis: data.structure_devis,
        pays: data.pays.trim() || "FR",
        use_personal_library: data.use_personal_library,
        assistant_name: ASSISTANT_DISPLAY_NAME,
      }),
    });
    const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
    revalidatePath("/assistant");
    revalidatePath("/accueil");
    return { ok: true, me };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    return { ok: false, error: msg };
  }
}
