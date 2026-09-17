import { namesFromGoogleUser } from "@/lib/auth/google-metadata";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseDataMode } from "@/lib/supabase/env";

export type OnboardingStep1Defaults = {
  prenom: string;
  nom: string;
  entreprise_nom: string;
  metier: string;
  siret: string;
  adresse: string;
  tel: string;
  email_facturation: string;
  logo_url: string;
};

const EMPTY: OnboardingStep1Defaults = {
  prenom: "",
  nom: "",
  entreprise_nom: "",
  metier: "artisan_btp",
  siret: "",
  adresse: "",
  tel: "",
  email_facturation: "",
  logo_url: "",
};

export async function loadOnboardingStep1Defaults(): Promise<OnboardingStep1Defaults> {
  if (!isSupabaseDataMode()) return EMPTY;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const googleNames = namesFromGoogleUser(user);

  return {
    prenom: String(profile?.prenom ?? googleNames.prenom ?? "").trim(),
    nom: String(profile?.nom ?? googleNames.nom ?? "").trim(),
    entreprise_nom: String(profile?.entreprise_nom ?? "").trim(),
    metier: String(profile?.metier ?? profile?.specialites ?? "artisan_btp").trim(),
    siret: String(profile?.siret ?? "").trim(),
    adresse: String(profile?.adresse ?? "").trim(),
    tel: String(profile?.tel ?? "").trim(),
    email_facturation: String(profile?.email_facturation ?? user.email ?? "").trim(),
    logo_url: String(profile?.logo_url ?? "").trim(),
  };
}
