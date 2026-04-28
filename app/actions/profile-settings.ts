"use server";

import { backendFetch } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateProfileSettings(formData: FormData) {
  await backendFetch("/api/auth/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prenom: String(formData.get("prenom") || "").trim(),
      nom: String(formData.get("nom") || "").trim(),
    }),
  });

  await backendFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entreprise: String(formData.get("entreprise") || "").trim() || null,
      siret: String(formData.get("siret") || "").trim() || null,
      adresse: String(formData.get("adresse") || "").trim() || null,
      tel: String(formData.get("tel") || "").trim() || null,
      email_facturation: String(formData.get("email_facturation") || "").trim() || null,
      mention_legale: String(formData.get("mention_legale") || "").trim() || null,
      conditions_paiement: String(formData.get("conditions_paiement") || "").trim() || null,
      tva_defaut: Number(formData.get("tva_defaut") || 10),
      sep_fourniture_pose: formData.get("sep_fourniture_pose") === "on",
      structure_devis: String(formData.get("structure_devis") || "libre"),
    }),
  });

  revalidatePath("/parametres");
  revalidatePath("/accueil");
}

export async function deleteAccountAndData() {
  // Suppression de compte non implémentée côté backend pour l'instant.
  redirect("/parametres");
}
