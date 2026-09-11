"use server";

import { backendFetch } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";

function revalidateCompteAll() {
  revalidatePath("/compte");
  revalidatePath("/compte/profil");
  revalidatePath("/compte/entreprise");
  revalidatePath("/compte/devis-apparence");
  revalidatePath("/compte/devis-regles");
  revalidatePath("/accueil");
}

export async function updateProfilPersonnelAction(formData: FormData) {
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
      tel: String(formData.get("tel") || "").trim() || null,
    }),
  });
  revalidateCompteAll();
}

export async function updateLogoUrlAction(formData: FormData) {
  const logo = String(formData.get("logo_url") || "").trim();
  await backendFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logo_url: logo || null }),
  });
  revalidateCompteAll();
}

export async function updateDevisReglesAction(formData: FormData) {
  await backendFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tva_defaut: Number(formData.get("tva_defaut") || 10),
      sep_fourniture_pose: formData.get("sep_fourniture_pose") === "on",
      structure_devis: String(formData.get("structure_devis") || "libre"),
    }),
  });
  revalidateCompteAll();
}

export async function updateEntrepriseIdentityAction(formData: FormData) {
  await backendFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entreprise: String(formData.get("entreprise") || "").trim() || null,
      siret: String(formData.get("siret") || "").trim() || null,
      adresse: String(formData.get("adresse") || "").trim() || null,
      email_facturation: String(formData.get("email_facturation") || "").trim() || null,
      logo_url: String(formData.get("logo_url") || "").trim() || null,
      mention_legale: String(formData.get("mention_legale") || "").trim() || null,
      conditions_paiement: String(formData.get("conditions_paiement") || "").trim() || null,
      specialites: String(formData.get("specialites") || "").trim() || null,
    }),
  });
  revalidateCompteAll();
}
