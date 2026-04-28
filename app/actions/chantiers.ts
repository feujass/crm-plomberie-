"use server";

import { createClient } from "@/lib/supabase/server";
import { enrichClientFromChantier } from "@/app/actions/clients";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createChantierAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const clientId = (formData.get("client_id") as string) || null;
  const adresse = (formData.get("adresse") as string) || null;

  const { data: row, error } = await supabase
    .from("chantiers")
    .insert({
      user_id: user.id,
      client_id: clientId,
      devis_id: (formData.get("devis_id") as string) || null,
      nom: String(formData.get("nom") || "Chantier"),
      adresse,
      statut: (formData.get("statut") as "en_cours" | "planifie" | "termine" | "pause") || "en_cours",
      date_debut: (formData.get("date_debut") as string) || null,
      date_fin: (formData.get("date_fin") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .select("id")
    .single();

  if (error || !row) throw error;

  if (clientId && adresse) await enrichClientFromChantier(clientId, adresse);

  revalidatePath("/chantiers");
  redirect(`/chantiers/${row.id}`);
}

export async function updateChantierAction(chantierId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const clientId = (formData.get("client_id") as string) || null;
  const adresse = (formData.get("adresse") as string) || null;

  await supabase
    .from("chantiers")
    .update({
      client_id: clientId,
      nom: String(formData.get("nom") || ""),
      adresse,
      statut: (formData.get("statut") as "en_cours" | "planifie" | "termine" | "pause") || "en_cours",
      date_debut: (formData.get("date_debut") as string) || null,
      date_fin: (formData.get("date_fin") as string) || null,
      avancement: Number(formData.get("avancement") || 0),
      notes: (formData.get("notes") as string) || null,
    })
    .eq("id", chantierId)
    .eq("user_id", user.id);

  if (clientId && adresse) await enrichClientFromChantier(clientId, adresse);

  revalidatePath("/chantiers");
  revalidatePath(`/chantiers/${chantierId}`);
}

export async function addJournalEntryAction(chantierId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase.from("chantier_journal").insert({
    chantier_id: chantierId,
    user_id: user.id,
    date: String(formData.get("date") || new Date().toISOString().slice(0, 10)),
    duree_h: Number(formData.get("duree_h") || 0) || null,
    description: String(formData.get("description") || ""),
    technicien: (formData.get("technicien") as string) || null,
  });

  revalidatePath(`/chantiers/${chantierId}`);
}

export async function addChantierPhotoFromForm(chantierId: string, formData: FormData) {
  const url = String(formData.get("url") || "").trim();
  if (!url) return;
  await addChantierPhotoAction(chantierId, url);
}

export async function addChantierDocumentFromForm(chantierId: string, formData: FormData) {
  const label = String(formData.get("label") || "").trim();
  const url = String(formData.get("url") || "").trim();
  if (!url) return;
  await addChantierDocumentAction(chantierId, label, url);
}

export async function addChantierPhotoAction(chantierId: string, url: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: ch } = await supabase.from("chantiers").select("id").eq("id", chantierId).eq("user_id", user.id).maybeSingle();
  if (!ch) throw new Error("Chantier introuvable");

  await supabase.from("chantier_photos").insert({ chantier_id: chantierId, url });
  revalidatePath(`/chantiers/${chantierId}`);
}

export async function addChantierDocumentAction(chantierId: string, label: string, url: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: ch } = await supabase.from("chantiers").select("id").eq("id", chantierId).eq("user_id", user.id).maybeSingle();
  if (!ch) throw new Error("Chantier introuvable");

  await supabase.from("chantier_documents").insert({ chantier_id: chantierId, label, url });
  revalidatePath(`/chantiers/${chantierId}`);
}
