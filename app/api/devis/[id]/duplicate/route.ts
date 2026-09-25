import { NextResponse } from "next/server";

import { assertDevisCreationAllowed, loadSubscriptionContext } from "@/lib/plans/subscription-context";
import { TRIAL_EXPIRED_PAYWALL_CODE } from "@/lib/plans/paywall";
import { backendFetch, type BackendFetchError } from "@/lib/backend/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    try {
      const subscriptionCtx = await loadSubscriptionContext();
      const blocked = assertDevisCreationAllowed(subscriptionCtx);
      if (blocked) {
        return NextResponse.json({ message: blocked, code: TRIAL_EXPIRED_PAYWALL_CODE }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const src = (await backendFetch(`/api/devis/${id}`)) as {
      client_id?: string;
      notes?: string;
      internal_notes?: string;
      date_expiration?: string;
      remise_type?: string;
      remise_valeur?: number;
      lignes?: Array<{
        section?: string;
        designation: string;
        quantite?: number;
        unite?: string;
        prix_ht?: number;
        tva?: number;
        ligne_type?: string;
      }>;
    };

    const copy = (await backendFetch("/api/devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: src.client_id ?? null,
        notes: src.notes ?? "",
        internal_notes: src.internal_notes ?? "",
        date_expiration: src.date_expiration ?? null,
        remise_type: src.remise_type ?? null,
        remise_valeur: src.remise_valeur ?? 0,
        lignes: (src.lignes ?? []).map((l) => ({
          section: l.section ?? "",
          designation: l.designation,
          quantite: Number(l.quantite ?? 1),
          unite: String(l.unite ?? "u"),
          prix_ht: Number(l.prix_ht ?? 0),
          tva: Number(l.tva ?? 10),
          ligne_type:
            l.ligne_type === "fourniture" || l.ligne_type === "pose" || l.ligne_type === "prestation"
              ? l.ligne_type
              : "prestation",
        })),
      }),
    })) as { id: string };

    return NextResponse.json({ id: copy.id });
  } catch (err) {
    const e = err as BackendFetchError;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: e.status ?? 502 });
  }
}
