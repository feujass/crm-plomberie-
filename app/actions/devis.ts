"use server";

import { backendFetch } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type DevisLigneInput = {
  id?: string;
  section: string | null;
  designation: string;
  quantite: number;
  unite: string;
  prix_ht: number;
  tva: number;
  ordre: number;
  ligne_type: "prestation" | "fourniture" | "pose";
};

export async function markDevisAccepte(devisId: string) {
  await backendFetch(`/api/devis/${devisId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut: "accepte" }),
  });
  revalidatePath("/devis");
  revalidatePath(`/devis/${devisId}`);
}

export async function markDevisSent(devisId: string) {
  await backendFetch(`/api/devis/${devisId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut: "envoye" }),
  });

  revalidatePath("/devis");
  revalidatePath(`/devis/${devisId}`);
}

export async function duplicateDevisAction(devisId: string) {
  const src = (await backendFetch(`/api/devis/${devisId}`)) as {
    client_id?: string;
    notes?: string;
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
    }>;
  };

  const copy = (await backendFetch("/api/devis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: src.client_id ?? null,
      notes: src.notes ?? "",
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
      })),
    }),
  })) as { id: string };

  revalidatePath("/devis");
  redirect(`/devis/${copy.id}`);
}

export async function archiveDevisAction(devisId: string) {
  await backendFetch(`/api/devis/${devisId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut: "archive" }),
  });
  revalidatePath("/devis");
}

export async function deleteDevisAction(devisId: string) {
  await backendFetch(`/api/devis/${devisId}`, { method: "DELETE" });
  revalidatePath("/devis");
}

export async function addDevisNoteAction(devisId: string, body: string) {
  // Notes internes non implémentées côté backend pour l'instant.
  void devisId;
  void body;
  revalidatePath(`/devis/${devisId}`);
}
