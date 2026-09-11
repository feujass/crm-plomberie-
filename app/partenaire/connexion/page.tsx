import { PartnerLoginForm } from "@/components/affiliate/PartnerLoginForm";

import { isSupabaseAuthConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Connexion partenaire — Flowo" };

export default async function PartenaireConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const sp = await searchParams;
  return (
    <PartnerLoginForm
      backendConfigured={isSupabaseAuthConfigured()}
      passwordResetOk={sp.reset === "1"}
    />
  );
}
