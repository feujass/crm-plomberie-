"use server";

import { createClient } from "@/lib/supabase/server";
import { sendDevisEmail } from "@/lib/resend-mail";
import { revalidatePath } from "next/cache";

export async function sendDevisByEmailAction(devisId: string, to: string, publicUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: devis } = await supabase.from("devis").select("numero").eq("id", devisId).eq("user_id", user.id).single();
  if (!devis) throw new Error("Devis introuvable");

  const html = `<p>Bonjour,</p><p>Veuillez trouver votre devis <strong>${devis.numero}</strong>.</p><p><a href="${publicUrl}">Voir le devis en ligne</a></p>`;
  const res = await sendDevisEmail({ to, subject: `Devis ${devis.numero}`, html });

  if (!res.ok) throw new Error(typeof res.error === "string" ? res.error : "Envoi impossible");

  await supabase
    .from("devis")
    .update({ statut: "envoye", date_envoi: new Date().toISOString() })
    .eq("id", devisId)
    .eq("user_id", user.id);

  revalidatePath("/devis");
  revalidatePath(`/devis/${devisId}`);
}
