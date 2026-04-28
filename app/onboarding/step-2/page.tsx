import { onboardingStep2 } from "@/app/actions/onboarding";
import { OnboardingProgress } from "@/components/onboarding/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import Link from "next/link";

export default function OnboardingStep2Page() {
  return (
    <>
      <OnboardingProgress step={2} />
      <Card title="Étape 2 — Paramètres devis">
        <form action={onboardingStep2} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            TVA par défaut (%)
            <select
              name="tva_defaut"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
              defaultValue="10"
            >
              <option value="5.5">5,5 %</option>
              <option value="10">10 %</option>
              <option value="20">20 %</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="sep_fourniture_pose" className="rounded border-gray-300" />
            Séparer fourniture et pose
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Structure des lignes
            <select
              name="structure_devis"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
              defaultValue="libre"
            >
              <option value="piece">Par pièce</option>
              <option value="type_travaux">Par type de travaux</option>
              <option value="libre">Libre</option>
            </select>
          </label>
          <Textarea label="Mentions légales personnalisées" name="mention_legale" rows={4} />
          <Textarea label="Conditions de paiement par défaut" name="conditions_paiement_defaut" rows={3} />
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">
              Continuer
            </Button>
            <Link
              href="/onboarding/step-1"
              className="touch-target inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              Retour
            </Link>
          </div>
        </form>
      </Card>
    </>
  );
}
