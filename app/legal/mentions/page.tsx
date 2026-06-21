import Link from "next/link";

import { APP_NAME } from "@/lib/app-branding";

export const metadata = { title: `Mentions légales — ${APP_NAME}` };

export default function MentionsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm text-[color:var(--primary)] hover:underline">
        ← Retour
      </Link>
      <h1 className="mt-6 text-2xl font-bold">Mentions légales</h1>
      <div className="prose prose-slate mt-6 space-y-4 text-sm leading-relaxed dark:prose-invert">
        <p>
          <strong>Éditeur :</strong> {APP_NAME} — SaaS de gestion de devis pour artisans BTP.
        </p>
        <p>
          <strong>Contact :</strong> support@flowo.app (adresse indicative — à compléter avant mise en production).
        </p>
        <p>
          <strong>Hébergement :</strong> à renseigner selon l&apos;infrastructure de déploiement retenue.
        </p>
        <p>
          Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique, les
          informations d&apos;identification de l&apos;éditeur doivent être complétées avant lancement commercial.
        </p>
      </div>
    </div>
  );
}
