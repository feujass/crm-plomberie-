import { AccueilDashboard } from "@/components/accueil/AccueilDashboard";
import { AccueilLanding } from "@/components/accueil/AccueilLanding";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { backendFetch } from "@/lib/backend/server";
import { greetingDisplayName } from "@/lib/greeting-display-name";
import { computeProfileCompletion } from "@/lib/profile/completion";
import type { BackendDashboardStats, BackendMeResponse } from "@/types/backend";

export const dynamic = "force-dynamic";

type RentabiliteKpis = {
  monthly?: { mois: string; ca: number }[];
};

export default async function AccueilPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const stats = (await backendFetch("/api/dashboard/stats")) as BackendDashboardStats;

  let monthly: { mois: string; ca: number }[] = [];
  try {
    const rentabilite = (await backendFetch("/api/dashboard/rentabilite")) as RentabiliteKpis;
    monthly = rentabilite.monthly ?? [];
  } catch {
    monthly = [];
  }

  const displayName = greetingDisplayName(me);
  const completion = computeProfileCompletion(me);

  return (
    <div className="space-y-5 lg:space-y-8">
      <ProfileCompletionBanner completion={completion} onboardingHref="/onboarding/step-1" />
      <AccueilLanding displayName={displayName} />
      <AccueilDashboard stats={stats} monthly={monthly} />
    </div>
  );
}
