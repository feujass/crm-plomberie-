import { onboardingStep3Skip, onboardingStep3WithExamples } from "@/app/actions/onboarding";
import { OnboardingProgress } from "@/components/onboarding/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function OnboardingStep3Page() {
  return (
    <>
      <OnboardingProgress step={3} />
      <Card title="Étape 3 — Catalogue de départ">
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Nous pouvons ajouter trois ouvrages exemples à votre catalogue (main d&apos;œuvre, robinet, chauffe-eau).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <form action={onboardingStep3WithExamples} className="flex-1">
            <Button type="submit" className="w-full">
              Démarrer avec ces exemples
            </Button>
          </form>
          <form action={onboardingStep3Skip} className="flex-1">
            <Button type="submit" variant="secondary" className="w-full">
              Passer
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm">
          <Link href="/onboarding/step-2" className="text-sky-600 hover:underline">
            Retour
          </Link>
        </p>
      </Card>
    </>
  );
}
