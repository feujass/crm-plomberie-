import { saveRelanceSettings } from "@/lib/relances/save-settings";
import { parseRelanceEcheances } from "@/lib/relances/schedule";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = {
  relance_devis_echeances?: string;
  relance_facture_echeances?: string;
};

function normalizeEcheances(raw: unknown, fallback: number[]): string {
  const days = parseRelanceEcheances(typeof raw === "string" ? raw : "", fallback);
  return days.join(", ");
}

export async function POST(req: Request) {
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const devisEcheances = normalizeEcheances(raw.relance_devis_echeances, [3, 7, 14]);
  const factureEcheances = normalizeEcheances(raw.relance_facture_echeances, [0, 7, 14]);

  try {
    const result = await saveRelanceSettings(devisEcheances, factureEcheances);
    revalidatePath("/compte");
    revalidatePath("/compte/relances");
    return NextResponse.json({
      ok: true,
      warning: result.warning,
      message:
        result.warning === "stored_in_preferences"
          ? "Relances enregistrées (mode compatibilité). Pour les relances multiples complètes, appliquez la migration Supabase."
          : "Relances enregistrées.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ message: msg }, { status: 502 });
  }
}
