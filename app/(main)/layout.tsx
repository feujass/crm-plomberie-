import { PlannerAppShell } from "@/components/layout/PlannerAppShell";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { BackendMeResponse } from "@/types/backend";

export const dynamic = "force-dynamic";

export default async function MainAppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) redirect("/login");

  const backend = process.env.BACKEND_URL?.trim();
  if (!backend) {
    throw new Error("BACKEND_URL manquant (voir .env.example).");
  }

  const meRes = await fetch(`${backend.replace(/\/+$/, "")}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!meRes.ok) redirect("/login");
  const me = (await meRes.json().catch(() => null)) as BackendMeResponse | null;
  const profile = me?.profile ?? {};

  const onboardingStep = typeof profile?.onboarding_step === "number" ? profile.onboarding_step : 0;
  const onboardingComplete = Boolean(profile?.onboarding_complete) || onboardingStep >= 3;
  if (!onboardingComplete) {
    redirect("/onboarding");
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
