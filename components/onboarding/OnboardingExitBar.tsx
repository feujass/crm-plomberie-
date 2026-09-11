import { CircleBackLink } from "@/components/ui/CircleBackLink";

export function OnboardingExitBar() {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <CircleBackLink href="/accueil" label="Quitter l'onboarding" />
      <p className="text-xs text-gray-500 dark:text-gray-400">Optionnel — complétable plus tard dans Compte</p>
    </div>
  );
}
