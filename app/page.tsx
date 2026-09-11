import { MarketingLanding } from "@/components/marketing/MarketingLanding";
import { MarketingJsonLd } from "@/components/marketing/MarketingJsonLd";
import { ReferralCapture } from "@/components/affiliate/ReferralCapture";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseDataMode } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (isSupabaseDataMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/accueil");
  } else {
    const token = (await cookies()).get("access_token")?.value;
    if (token) redirect("/accueil");
  }

  return (
    <>
      <MarketingJsonLd />
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <MarketingLanding />
    </>
  );
}
