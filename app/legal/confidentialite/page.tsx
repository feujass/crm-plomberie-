import Link from "next/link";

import { APP_NAME } from "@/lib/app-branding";

export const metadata = { title: `Politique de confidentialité — ${APP_NAME}` };

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm text-[color:var(--primary)] hover:underline">
        ← Retour
      </Link>
      <h1 className="mt-6 text-2xl font-bold">Politique de confidentialité</h1>
      <div className="prose prose-slate mt-6 space-y-4 text-sm leading-relaxed dark:prose-invert">
        <p>
          {APP_NAME} traite les données nécessaires au fonctionnement du service : compte utilisateur, clients,
          devis, factures et préférences métier.
        </p>
        <p>
          Les enregistrements vocaux sont utilisés uniquement pour générer vos devis et ne sont pas revendus à des
          tiers.
        </p>
        <p>
          Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données depuis votre espace
          Compte ou en contactant le support.
        </p>
        <p>
          Des cookies techniques peuvent être utilisés pour maintenir votre session de connexion.
        </p>
      </div>
    </div>
  );
}
