import { Card } from "@/components/ui/Card";
import { OnboardingStep3Forms } from "@/components/onboarding/OnboardingClientForms";
import { OnboardingProgress } from "@/components/onboarding/ProgressBar";
import Link from "next/link";

export default function OnboardingStep3Page() {
  return (
    <>
      <OnboardingProgress step={3} />
      <Card title="Étape 3 — Catalogue de départ">
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Nous pouvons ajouter trois ouvrages exemples à votre catalogue (main d&apos;œuvre, robinet, chauffe-eau).
        </p>
        <OnboardingStep3Forms />
        <p className="mt-4 text-center text-sm">
          <Link href="/onboarding/step-2" className="text-sky-600 hover:underline">
            Retour
          </Link>
        </p>
      </Card>
    </>
  );
}
