"use server";

import { backendFetch } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function convertDevisToFacture(devisId: string) {
  const facture = (await backendFetch(`/api/factures/from-devis/${devisId}`, {
    method: "POST",
  })) as { id: string };

  revalidatePath("/facturation");
  revalidatePath("/devis");
  redirect(`/facturation/${facture.id}`);
}

export async function addPaiementAction(factureId: string, formData: FormData) {
  const montant = Number(formData.get("montant") || 0);
  const mode = String(formData.get("mode") || "virement") as "virement" | "cheque" | "especes" | "cb" | "autre";

  await backendFetch(`/api/factures/${factureId}/paiements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      montant,
      date: String(formData.get("date") || new Date().toISOString().slice(0, 10)),
      mode,
    }),
  });

  revalidatePath("/facturation");
  revalidatePath(`/facturation/${factureId}`);
}
