import { ASSISTANT_DISPLAY_NAME } from "@/lib/assistant-branding";
import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { AssistantSettingsPayload } from "@/types/assistant-settings";
import type { BackendMeResponse } from "@/types/backend";

type Ok = { ok: true; me: BackendMeResponse };
type Err = { ok: false; error: string };

/**
 * Remplace `flushAssistantSettingsAction` — pas de Server Action pour éviter E394.
 */
export async function POST(req: Request) {
  let data: AssistantSettingsPayload;
  try {
    data = (await req.json()) as AssistantSettingsPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" } satisfies Err, { status: 400 });
  }

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
    return NextResponse.json({ ok: true, me } satisfies Ok);
  } catch (e) {
    const err = e as BackendFetchError;
    const msg = err.message || "Erreur";
    return NextResponse.json({ ok: false, error: msg } satisfies Err, {
      status: typeof err.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 502,
    });
  }
}
