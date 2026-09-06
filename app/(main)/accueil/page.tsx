import { AccueilDashboard } from "@/components/accueil/AccueilDashboard";
import { AccueilLanding } from "@/components/accueil/AccueilLanding";
import { DemoDevisWelcomeBanner } from "@/components/accueil/DemoDevisWelcomeBanner";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { backendFetch } from "@/lib/backend/server";
import { greetingDisplayName } from "@/lib/greeting-display-name";
import { computeProfileCompletion } from "@/lib/profile/completion";
import type { BackendDashboardStats, BackendMeResponse } from "@/types/backend";

export const dynamic = "force-dynamic";

type RentabiliteKpis = {
  monthly?: { mois: string; ca: number }[];
};

export default async function AccueilPage({
  searchParams,
}: {
  searchParams: Promise<{ devis_demo?: string }>;
}) {
  const sp = await searchParams;
  const highlightDevisId = sp.devis_demo?.trim() || undefined;

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
  const highlightedDevis = highlightDevisId
    ? (stats.recent_devis ?? []).find((d) => d.id === highlightDevisId)
    : undefined;

  return (
    <div className="space-y-5 lg:space-y-8">
      <ProfileCompletionBanner completion={completion} onboardingHref="/onboarding/step-1" />
      {highlightDevisId ? (
        <DemoDevisWelcomeBanner devisId={highlightDevisId} numero={highlightedDevis?.numero} />
      ) : null}
      <AccueilLanding displayName={displayName} />
      <AccueilDashboard stats={stats} monthly={monthly} highlightDevisId={highlightDevisId} />
    </div>
  );
}
