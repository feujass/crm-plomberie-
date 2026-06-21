import Link from "next/link";

import { APP_NAME } from "@/lib/app-branding";

export const metadata = { title: `Conditions générales — ${APP_NAME}` };

export default function CguPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm text-[color:var(--primary)] hover:underline">
        ← Retour
      </Link>
      <h1 className="mt-6 text-2xl font-bold">Conditions générales d&apos;utilisation</h1>
      <div className="prose prose-slate mt-6 space-y-4 text-sm leading-relaxed dark:prose-invert">
        <p>
          Les présentes conditions régissent l&apos;utilisation du service {APP_NAME}, édité pour les artisans et
          entreprises du bâtiment.
        </p>
        <p>
          L&apos;inscription ouvre l&apos;accès aux fonctionnalités de création de devis, envoi client, suivi
          d&apos;activité et facturation selon les offres disponibles.
        </p>
        <p>
          L&apos;utilisateur reste responsable du contenu de ses devis et de la conformité de ses documents commerciaux
          (mentions légales, TVA, conditions de paiement).
        </p>
        <p>
          {APP_NAME} est fourni « en l&apos;état ». Les données sont hébergées conformément à la réglementation en
          vigueur. Pour toute question : contactez l&apos;éditeur via les coordonnées indiquées dans les mentions
          légales.
        </p>
      </div>
    </div>
  );
}
