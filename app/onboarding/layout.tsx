import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OnboardingExitBar } from "@/components/onboarding/OnboardingExitBar";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseDataMode } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseDataMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  } else {
    const backend = process.env.BACKEND_URL?.trim();
    if (!backend) throw new Error("BACKEND_URL manquant (voir .env.example).");

    const token = (await cookies()).get("access_token")?.value;
    if (!token) redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-lg">
        <OnboardingExitBar />
        {children}
      </div>
    </div>
  );
}
