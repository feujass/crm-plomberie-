import { Card } from "@/components/ui/Card";
import {
  OnboardingStep1Footer,
  OnboardingStep1Form,
} from "@/components/onboarding/OnboardingClientForms";
import { OnboardingProgress } from "@/components/onboarding/ProgressBar";
import { loadOnboardingStep1Defaults } from "@/lib/onboarding/step1-defaults";

export default async function OnboardingStep1Page() {
  const defaults = await loadOnboardingStep1Defaults();

  return (
    <>
      <OnboardingProgress step={1} />
      <Card title="Étape 1 — Ton profil artisan">
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Complète ton profil artisan — SIRET et adresse seront demandés au premier PDF.
        </p>
        <OnboardingStep1Form defaults={defaults} />
        <OnboardingStep1Footer />
      </Card>
    </>
  );
}
