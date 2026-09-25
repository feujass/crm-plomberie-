import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";

/** Un client Supabase par requête RSC (layout + pages + backendFetch). */
export const createClient = cache(async () => {
  const url = supabasePublicUrl();
  const key = supabaseAnonKey();
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY requis.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* set from Server Component */
        }
      },
    },
  });
});
