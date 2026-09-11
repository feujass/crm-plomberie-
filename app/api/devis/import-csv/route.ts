import { assertDevisCreationAllowed, loadSubscriptionContext } from "@/lib/plans/subscription-context";
import { TRIAL_EXPIRED_PAYWALL_CODE } from "@/lib/plans/paywall";
import { parseDevisImportCsv } from "@/lib/devis/import-csv";
import { syncDevisLignesToCatalogue } from "@/lib/catalogue/sync-from-devis-lignes";
import { normalizeLignesWithProfile } from "@/lib/devis-ouvrage-mode";
import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import type { BackendMeResponse, BackendProfile } from "@/types/backend";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Formulaire invalide" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ message: "Fichier CSV requis" }, { status: 400 });
  }

  const text = await file.text();
  let lignesIn;
  try {
    lignesIn = parseDevisImportCsv(text);
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "CSV invalide" }, { status: 400 });
  }

  const clientIdRaw = formData.get("client_id");
  const client_id = typeof clientIdRaw === "string" && clientIdRaw.trim() ? clientIdRaw.trim() : null;
  const notesRaw = formData.get("notes");
  const notes = typeof notesRaw === "string" ? notesRaw.trim() : "";

  try {
    const subscriptionCtx = await loadSubscriptionContext();
    const blocked = assertDevisCreationAllowed(subscriptionCtx);
    if (blocked) {
      return NextResponse.json({ message: blocked, code: TRIAL_EXPIRED_PAYWALL_CODE }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }

  let profile: BackendProfile | undefined;
  try {
    const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
    profile = me.profile;
  } catch {
    profile = undefined;
  }

  const normalized = normalizeLignesWithProfile(
    lignesIn.map((l, i) => ({
      section: l.section || null,
      designation: l.designation,
      quantite: l.quantite,
      unite: l.unite,
      prix_ht: l.prix_ht,
      tva: l.tva,
      ordre: i,
    })),
    profile,
  );

  try {
    const devis = (await backendFetch("/api/devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id,
        notes: notes || "Import CSV",
        lignes: normalized.map((l) => ({
          section: l.section ?? "",
          designation: l.designation,
          quantite: l.quantite,
          unite: l.unite,
          prix_ht: l.prix_ht,
          tva: l.tva,
          ligne_type: l.ligne_type,
        })),
      }),
    })) as { id: string };

    try {
      await syncDevisLignesToCatalogue(
        normalized.map((l) => ({
          section: l.section ?? "",
          designation: l.designation,
          quantite: l.quantite,
          unite: l.unite,
          prix_ht: l.prix_ht,
          tva: l.tva,
          ligne_type: l.ligne_type,
        })),
      );
      revalidatePath("/catalogue");
    } catch {
      /* catalogue best-effort */
    }

    return NextResponse.json({ id: devis.id, lignes: normalized.length }, { status: 201 });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
