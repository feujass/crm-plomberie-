import { Card } from "@/components/ui/Card";
import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { OnboardingStep3Forms } from "@/components/onboarding/OnboardingClientForms";
import { OnboardingProgress } from "@/components/onboarding/ProgressBar";

export default function OnboardingStep3Page() {
  return (
    <>
      <OnboardingProgress step={3} />
      <Card title="Étape 3 — Bibliothèque personnelle">
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Votre bibliothèque démarre vide. Elle se remplit automatiquement avec vos prix à partir de vos devis — aucun
          tarif par défaut ne sera imposé.
        </p>
        <OnboardingStep3Forms />
        <div className="mt-4 flex justify-center">
          <CircleBackLink href="/onboarding/step-2" label="Retour à l'étape 2" />
        </div>
      </Card>
    </>
  );
}
