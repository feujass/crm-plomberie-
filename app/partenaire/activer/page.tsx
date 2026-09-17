import { PartnerActivateForm } from "@/components/affiliate/PartnerActivateForm";

import { isSupabaseAuthConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Activer mon accès partenaire — Flowo" };

export default function PartenaireActiverPage() {
  return <PartnerActivateForm backendConfigured={isSupabaseAuthConfigured()} />;
}
