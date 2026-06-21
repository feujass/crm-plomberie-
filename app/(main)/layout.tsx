import { PlannerAppShell } from "@/components/layout/PlannerAppShell";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { BackendMeResponse } from "@/types/backend";

import { buildMeResponse } from "@/lib/supabase/profile-map";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseDataMode } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function MainAppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  let me: BackendMeResponse | null = null;

  if (isSupabaseDataMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    me = buildMeResponse(user, profile);
  } else {
    const token = cookieStore.get("access_token")?.value;
    if (!token) redirect("/login");

    const backend = process.env.BACKEND_URL?.trim();
    if (!backend) {
      throw new Error("BACKEND_URL manquant (voir .env.example).");
    }

    const meUrl = `${backend.replace(/\/+$/, "")}/api/auth/me`;
    let meRes: Response;
    try {
      meRes = await fetch(meUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });
    } catch (e) {
      const cause = e instanceof Error ? e.message : String(e);
      throw new Error(`Connexion à l'API Flowo impossible (${meUrl}). ${cause}`, { cause: e });
    }
    if (!meRes.ok) redirect("/login");
    me = (await meRes.json().catch(() => null)) as BackendMeResponse | null;
  }

  const defaultSidebarOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <PlannerAppShell
      prenom={me?.prenom ?? null}
      email={me?.email ?? null}
      defaultSidebarOpen={defaultSidebarOpen}
    >
      {children}
    </PlannerAppShell>
  );
}
