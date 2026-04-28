"use server";

import { backendFetch } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BackendDevisDetail } from "@/types/backend";

export async function createOuvrageAction(formData: FormData) {
  const tagsRaw = (formData.get("tags") as string) || "";
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  await backendFetch("/api/ouvrages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nom: String(formData.get("nom") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      type: (formData.get("type") as string) || "ouvrage",
      prix_ht: Number(formData.get("prix_ht") || 0),
      unite: String(formData.get("unite") || "forfait").trim(),
      tva: Number(formData.get("tva") || 10),
      tags: tags.length ? tags : [],
    }),
  });

  revalidatePath("/catalogue");
  redirect("/catalogue");
}

export async function deleteOuvrageAction(id: string) {
  await backendFetch(`/api/ouvrages/${id}`, { method: "DELETE" });
  revalidatePath("/catalogue");
}

export async function importOuvragesFromDevis(devisId: string) {
  const devis = (await backendFetch(`/api/devis/${devisId}`)) as BackendDevisDetail;
  const lignes = devis.lignes ?? [];
  if (!lignes.length) return;

  await Promise.all(
    lignes.map((l) =>
      backendFetch("/api/ouvrages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: String(l.designation || "").slice(0, 200),
          description: String(l.section || "").slice(0, 400),
          type: "ouvrage",
          prix_ht: Number(l.prix_ht || 0),
          unite: String(l.unite || "u"),
          tva: Number(l.tva || 10),
          tags: [],
        }),
      }),
    ),
  );
  revalidatePath("/catalogue");
}

export async function importOuvragesFromDevisForm(formData: FormData) {
  const id = String(formData.get("devis_id") || "");
  if (!id) return;
  await importOuvragesFromDevis(id);
  redirect("/catalogue");
}
