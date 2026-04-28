"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function onboardingStep1(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const logo_url = (formData.get("logo_url") as string) || null;

  await supabase
    .from("profiles")
    .update({
      prenom: (formData.get("prenom") as string) || null,
      nom: (formData.get("nom") as string) || null,
      entreprise_nom: (formData.get("entreprise_nom") as string) || null,
      logo_url,
      siret: (formData.get("siret") as string) || null,
      adresse: (formData.get("adresse") as string) || null,
      tel: (formData.get("tel") as string) || null,
      email_facturation: (formData.get("email_facturation") as string) || null,
      onboarding_steps_completed: 1,
    })
    .eq("id", user.id);

  revalidatePath("/onboarding");
  redirect("/onboarding/step-2");
}

export async function onboardingStep2(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const tva = Number(formData.get("tva_defaut") || 10);
  const sep = formData.get("sep_fourniture_pose") === "on";
  const structure = (formData.get("structure_devis") as string) || "libre";

  await supabase
    .from("profiles")
    .update({
      tva_defaut: tva,
      sep_fourniture_pose: sep,
      structure_devis: structure as "piece" | "type_travaux" | "libre",
      mention_legale: (formData.get("mention_legale") as string) || null,
      conditions_paiement_defaut: (formData.get("conditions_paiement_defaut") as string) || null,
      onboarding_steps_completed: 2,
    })
    .eq("id", user.id);

  revalidatePath("/onboarding");
  redirect("/onboarding/step-3");
}

export async function onboardingStep3WithExamples() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase.from("ouvrages").insert([
    {
      user_id: user.id,
      nom: "Main d'œuvre plomberie",
      description: "Intervention horaire",
      type: "main_oeuvre",
      prix_ht: 55,
      unite: "h",
      tva: 10,
      tags: ["mo"],
    },
    {
      user_id: user.id,
      nom: "Remplacement robinet",
      description: "Fourniture + pose",
      type: "ouvrage",
      prix_ht: 120,
      unite: "forfait",
      tva: 10,
      tags: ["sanitaire"],
    },
    {
      user_id: user.id,
      nom: "Pose chauffe-eau",
      description: "Forfait pose",
      type: "ouvrage",
      prix_ht: 350,
      unite: "forfait",
      tva: 10,
      tags: ["chauffage"],
    },
  ]);

  await supabase.from("profiles").update({ onboarding_steps_completed: 3 }).eq("id", user.id);
  revalidatePath("/onboarding");
  revalidatePath("/accueil");
  redirect("/accueil");
}

export async function onboardingStep3Skip() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  await supabase.from("profiles").update({ onboarding_steps_completed: 3 }).eq("id", user.id);
  revalidatePath("/onboarding");
  revalidatePath("/accueil");
  redirect("/accueil");
}
