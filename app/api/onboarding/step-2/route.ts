import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = {
  tva_defaut?: number;
  sep_fourniture_pose?: boolean;
  structure_devis?: string;
  mention_legale?: string | null;
  conditions_paiement_defaut?: string | null;
};

export async function POST(req: Request) {
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const tva = Number(raw.tva_defaut ?? 10);
  const sep = Boolean(raw.sep_fourniture_pose);
  const structure = String(raw.structure_devis || "libre");

  try {
    await backendFetch("/api/auth/me");
    await backendFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tva_defaut: tva,
        sep_fourniture_pose: sep,
        structure_devis: structure,
        mention_legale: String(raw.mention_legale ?? "").trim() || null,
        conditions_paiement: String(raw.conditions_paiement_defaut ?? "").trim() || null,
        onboarding_step: 2,
        onboarding_complete: false,
      }),
    });

    revalidatePath("/onboarding");
    return NextResponse.json({ redirect: "/onboarding/step-3" });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
