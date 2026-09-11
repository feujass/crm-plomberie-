import { createAdminClient } from "@/lib/supabase/admin";
import { mapMinimalRegisterToSupabaseProfile, mapRegisterToSupabaseProfile } from "@/lib/supabase/profile-map";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Attend la ligne `profiles` créée par le trigger Supabase (auth.users → profiles). */
async function waitForProfileRow(admin: ReturnType<typeof createAdminClient>, userId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (data?.id) return true;
    await sleep(200);
  }
  return false;
}

export async function saveMinimalSupabaseProfile(
  userId: string,
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Configuration Supabase serveur : ${msg}` };
  }

  await waitForProfileRow(admin, userId);

  const patch = mapMinimalRegisterToSupabaseProfile(email);
  const { error } = await admin.from("profiles").update(patch).eq("id", userId);
  if (error) {
    const { error: upsertError } = await admin.from("profiles").upsert({ id: userId, ...patch }, { onConflict: "id" });
    if (upsertError) {
      return { ok: false, message: upsertError.message };
    }
  }

  return { ok: true };
}

export async function saveSupabaseProfile(
  userId: string,
  body: Record<string, unknown>,
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Configuration Supabase serveur : ${msg}` };
  }

  const { core, extended } = mapRegisterToSupabaseProfile({
    prenom: String(body.prenom ?? "").trim(),
    nom: String(body.nom ?? "").trim(),
    tel: String(body.tel ?? "").trim(),
    entreprise: String(body.entreprise ?? "").trim(),
    siret: String(body.siret ?? "").trim(),
    adresse: String(body.adresse ?? "").trim(),
    siren: typeof body.siren === "string" ? body.siren : "",
    forme_juridique: typeof body.forme_juridique === "string" ? body.forme_juridique : "",
    capital_social: typeof body.capital_social === "string" ? body.capital_social : "",
    rcs_ville: typeof body.rcs_ville === "string" ? body.rcs_ville : "",
    numero_tva_intracom: typeof body.numero_tva_intracom === "string" ? body.numero_tva_intracom : "",
    email_facturation: typeof body.email_facturation === "string" ? body.email_facturation : email,
  });

  await waitForProfileRow(admin, userId);

  const { error: upsertError } = await admin.from("profiles").upsert(
    { id: userId, ...core },
    { onConflict: "id" },
  );

  if (upsertError) {
    const { error: updateError } = await admin.from("profiles").update(core).eq("id", userId);
    if (updateError) {
      const { error: insertError } = await admin.from("profiles").insert({ id: userId, ...core });
      if (insertError) {
        return { ok: false, message: insertError.message };
      }
    }
  }

  if (Object.keys(extended).length > 0) {
    await admin.from("profiles").update(extended).eq("id", userId);
  }

  const { data: saved } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!saved?.id) {
    return { ok: false, message: "Profil non trouvé après enregistrement." };
  }

  return { ok: true };
}
