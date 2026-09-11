import { redirect } from "next/navigation";

import { resolvePartnerForUser } from "@/lib/affiliate/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseDataMode } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function PartenairePortalLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseDataMode()) {
    redirect("/partenaire/connexion");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/partenaire/connexion");
  }

  const partner = await resolvePartnerForUser(user.id, user.email);
  if (!partner || partner.status !== "active") {
    redirect("/affiliation");
  }

  return <div className="min-h-dvh bg-[var(--background)]">{children}</div>;
}
