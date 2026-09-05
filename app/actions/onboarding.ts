"use server";

import { backendFetch } from "@/lib/backend/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireSession() {
  try {
    await backendFetch("/api/auth/me");
  } catch {
    throw new Error("Non authentifié");
  }
}

export async function onboardingStep1(formData: FormData) {
  await requireSession();

  const prenom = String(formData.get("prenom") || "").trim();
  const nom = String(formData.get("nom") || "").trim();
  const entreprise = String(formData.get("entreprise_nom") || "").trim();
  const logo_url = (formData.get("logo_url") as string) || null;

  await backendFetch("/api/auth/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prenom, nom }),
  });

  await backendFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entreprise: entreprise || null,
      logo_url,
      siret: String(formData.get("siret") || "").trim() || null,
      adresse: String(formData.get("adresse") || "").trim() || null,
      tel: String(formData.get("tel") || "").trim() || null,
      email_facturation: String(formData.get("email_facturation") || "").trim() || null,
      onboarding_step: 1,
      onboarding_complete: false,
    }),
  });

  revalidatePath("/onboarding");
  redirect("/onboarding/step-2");
}

export async function onboardingStep2(formData: FormData) {
  await requireSession();

  const tva = Number(formData.get("tva_defaut") || 10);
  const sep = formData.get("sep_fourniture_pose") === "on";
  const structure = (formData.get("structure_devis") as string) || "libre";

  await backendFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tva_defaut: tva,
      sep_fourniture_pose: sep,
      structure_devis: structure,
      mention_legale: String(formData.get("mention_legale") || "").trim() || null,
      conditions_paiement: String(formData.get("conditions_paiement_defaut") || "").trim() || null,
      onboarding_step: 2,
      onboarding_complete: false,
    }),
  });

  revalidatePath("/onboarding");
  redirect("/onboarding/step-3");
}

const EXAMPLE_OUVRAGES = [
  {
    nom: "Main d'œuvre plomberie",
    description: "Intervention horaire",
    type: "main_oeuvre",
    prix_ht: 55,
    unite: "h",
    tva: 10,
    tags: ["mo"],
  },
  {
    nom: "Remplacement robinet",
    description: "Fourniture + pose",
    type: "ouvrage",
    prix_ht: 120,
    unite: "forfait",
    tva: 10,
    tags: ["sanitaire"],
  },
  {
    nom: "Pose chauffe-eau",
    description: "Forfait pose",
    type: "ouvrage",
    prix_ht: 350,
    unite: "forfait",
    tva: 10,
    tags: ["chauffage"],
  },
] as const;

export async function onboardingStep3WithExamples() {
  await requireSession();

  for (const o of EXAMPLE_OUVRAGES) {
    await backendFetch("/api/ouvrages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...o, tags: [...o.tags] }),
    });
  }

  await backendFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      onboarding_step: 3,
      onboarding_complete: true,
    }),
  });

  revalidatePath("/onboarding");
  revalidatePath("/accueil");
  redirect("/accueil");
}

export async function onboardingStep3Skip() {
  await requireSession();

  await backendFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      onboarding_step: 3,
      onboarding_complete: true,
    }),
  });

  revalidatePath("/onboarding");
  revalidatePath("/accueil");
  redirect("/accueil");
}
