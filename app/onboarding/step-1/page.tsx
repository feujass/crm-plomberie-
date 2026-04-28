import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OnboardingProgress } from "@/components/onboarding/ProgressBar";
import { onboardingStep1 } from "@/app/actions/onboarding";
import Link from "next/link";
import { LogoUploadField } from "@/components/onboarding/LogoUploadField";

export default function OnboardingStep1Page() {
  return (
    <>
      <OnboardingProgress step={1} />
      <Card title="Étape 1 — Infos entreprise">
        <form action={onboardingStep1} className="space-y-3">
          <Input label="Prénom" name="prenom" />
          <Input label="Nom" name="nom" />
          <Input label="Nom de l'entreprise" name="entreprise_nom" required />
          <LogoUploadField />
          <Input label="SIRET" name="siret" />
          <Input label="Adresse" name="adresse" />
          <Input label="Téléphone" name="tel" type="tel" />
          <Input label="Email de facturation" name="email_facturation" type="email" />
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">
              Continuer
            </Button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-sky-600 hover:underline">
            Déconnexion
          </Link>
        </p>
      </Card>
    </>
  );
}
