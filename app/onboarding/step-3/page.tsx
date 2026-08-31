import { Card } from "@/components/ui/Card";
import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { OnboardingStep3Forms } from "@/components/onboarding/OnboardingClientForms";
import { OnboardingProgress } from "@/components/onboarding/ProgressBar";

export default function OnboardingStep3Page() {
  return (
    <>
      <OnboardingProgress step={3} />
      <Card title="Étape 3 — Catalogue de départ">
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Nous pouvons ajouter trois ouvrages exemples à votre catalogue (main d&apos;œuvre, robinet, chauffe-eau).
        </p>
        <OnboardingStep3Forms />
        <div className="mt-4 flex justify-center">
          <CircleBackLink href="/onboarding/step-2" label="Retour à l'étape 2" />
        </div>
      </Card>
    </>
  );
}
