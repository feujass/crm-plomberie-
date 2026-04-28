import { Card } from "@/components/ui/Card";
import { OnboardingStep2Form } from "@/components/onboarding/OnboardingClientForms";
import { OnboardingProgress } from "@/components/onboarding/ProgressBar";

export default function OnboardingStep2Page() {
  return (
    <>
      <OnboardingProgress step={2} />
      <Card title="Étape 2 — Paramètres devis">
        <OnboardingStep2Form />
      </Card>
    </>
  );
}
