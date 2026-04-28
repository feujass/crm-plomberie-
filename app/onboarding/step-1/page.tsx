import { Card } from "@/components/ui/Card";
import {
  OnboardingStep1Footer,
  OnboardingStep1Form,
} from "@/components/onboarding/OnboardingClientForms";
import { OnboardingProgress } from "@/components/onboarding/ProgressBar";

export default function OnboardingStep1Page() {
  return (
    <>
      <OnboardingProgress step={1} />
      <Card title="Étape 1 — Infos entreprise">
        <OnboardingStep1Form />
        <OnboardingStep1Footer />
      </Card>
    </>
  );
}
