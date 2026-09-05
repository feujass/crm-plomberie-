"use server";

import { backendFetch } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createClientAction(formData: FormData) {
  const created = (await backendFetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nom: String(formData.get("nom") || "").trim(),
      prenom: String(formData.get("prenom") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      tel: String(formData.get("tel") || "").trim(),
      adresse: String(formData.get("adresse") || "").trim(),
      type: (formData.get("type") as string) || "particulier",
      siret: String(formData.get("siret") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      inactive: false,
    }),
  })) as { id: string };

  revalidatePath("/clients");
  redirect(`/clients/${created.id}`);
}

export async function updateClientAction(clientId: string, formData: FormData) {
  await backendFetch(`/api/clients/${clientId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nom: String(formData.get("nom") || "").trim(),
      prenom: String(formData.get("prenom") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      tel: String(formData.get("tel") || "").trim(),
      adresse: String(formData.get("adresse") || "").trim(),
      type: (formData.get("type") as string) || "particulier",
      siret: String(formData.get("siret") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      inactive: formData.get("inactive") === "on",
    }),
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function enrichClientFromChantier(clientId: string, adresseChantier: string | null) {
  // Les chantiers ne sont pas encore exposés côté FastAPI dans cette version.
  // On garde cette fonction en no-op pour éviter de casser les appels existants.
  void clientId;
  void adresseChantier;
}
