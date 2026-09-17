import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/** Une seule validation de session par requête RSC (layout + plusieurs backendFetch). */
export const getRequestAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/** Une seule lecture du profil par requête RSC. */
export const getRequestProfileRow = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
});
