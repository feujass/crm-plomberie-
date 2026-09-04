import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { DATA_RETENTION, DATA_SUBPROCESSORS } from "@/lib/cookies/catalog";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/app-branding";
import { PRIVACY_POLICY_VERSION } from "@/lib/legal/constants";
import Link from "next/link";

import { pageMetadata } from "@/lib/seo/site-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Politique de confidentialité",
  description: "Comment Flowo collecte, utilise et protège tes données personnelles (RGPD).",
  path: "/legal/confidentialite",
});

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <CircleBackLink href="/" />
      <h1 className="mt-6 text-2xl font-bold">Politique de confidentialité</h1>
      <p className="mt-2 text-xs text-slate-500">Version {PRIVACY_POLICY_VERSION}</p>
      <div className="prose prose-slate mt-6 space-y-6 text-sm leading-relaxed dark:prose-invert">
        <section>
          <h2 className="text-lg font-semibold">1. Responsable du traitement</h2>
          <p>
            Le service {APP_NAME} est édité pour les artisans et entreprises du bâtiment. Pour toute question relative
            à vos données personnelles :{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[color:var(--primary)] hover:underline">
              {CONTACT_EMAIL}
            </a>
            . Les coordonnées complètes de l&apos;éditeur figurent dans les{" "}
            <Link href="/legal/mentions" className="text-[color:var(--primary)] hover:underline">
              mentions légales
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Données traitées</h2>
          <ul className="list-disc pl-5">
            <li>Compte : identité, e-mail, téléphone, entreprise, SIRET, préférences</li>
            <li>Données métier : clients, devis, factures, catalogue, paiements</li>
            <li>Contenus vocaux ou textuels pour la génération de devis (Zeus)</li>
            <li>
              <strong>Démo vocale sur la page d&apos;accueil</strong> : description de chantier (voix ou texte) conservée
              temporairement (30 jours max) pour générer un aperçu de devis avant inscription ; le fichier audio brut n&apos;est
              pas conservé après transcription
            </li>
            <li>Données techniques : logs, adresse IP, cookies (voir <Link href="/legal/cookies" className="text-[color:var(--primary)] hover:underline">politique cookies</Link>)</li>
            <li>Données de facturation Stripe (gérées par Stripe)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Finalités et bases légales</h2>
          <ul className="list-disc pl-5">
            <li><strong>Exécution du contrat</strong> : fourniture du CRM, devis, facturation, notifications</li>
            <li><strong>Obligation légale</strong> : conservation des pièces comptables</li>
            <li><strong>Intérêt légitime</strong> : sécurité, support, amélioration du service (statistiques avec consentement)</li>
            <li><strong>Consentement</strong> : cookies analytiques, notifications marketing optionnelles</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Sous-traitants</h2>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-2">Prestataire</th>
                <th className="py-2 pr-2">Rôle</th>
                <th className="py-2">Localisation</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SUBPROCESSORS.map((row) => (
                <tr key={row.name} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-2 font-medium">{row.name}</td>
                  <td className="py-2 pr-2">{row.role}</td>
                  <td className="py-2">{row.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">
            Des garanties appropriées (clauses contractuelles types, hébergement UE) sont mises en place lorsque des
            données sont transférées hors Union européenne.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Durées de conservation</h2>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-2">Type</th>
                <th className="py-2">Durée</th>
              </tr>
            </thead>
            <tbody>
              {DATA_RETENTION.map((row) => (
                <tr key={row.type} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-2">{row.type}</td>
                  <td className="py-2">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Vos droits (RGPD)</h2>
          <p>Vous disposez des droits suivants :</p>
          <ul className="list-disc pl-5">
            <li><strong>Accès et portabilité</strong> : export JSON depuis Compte → Sécurité</li>
            <li><strong>Rectification</strong> : modification de votre profil dans l&apos;application</li>
            <li><strong>Effacement</strong> : suppression du compte (sous réserve des obligations légales sur les factures)</li>
            <li><strong>Opposition / limitation</strong> : contactez le support</li>
            <li><strong>Retrait du consentement</strong> : gestion des cookies analytiques à tout moment</li>
            <li><strong>Réclamation</strong> : auprès de la CNIL (<a href="https://www.cnil.fr" className="text-[color:var(--primary)] hover:underline" rel="noopener noreferrer" target="_blank">cnil.fr</a>)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Données de vos clients</h2>
          <p>
            En tant qu&apos;artisan utilisateur de {APP_NAME}, vous êtes responsable de traitement des données de vos
            propres clients (carnet d&apos;adresses, devis). {APP_NAME} agit en sous-traitant pour ces données,
            conformément à l&apos;
            <Link href="/legal/sous-traitance" className="text-[color:var(--primary)] hover:underline">
              accord de sous-traitance (RGPD art. 28)
            </Link>
            , incorporé aux CGU. À la suppression de votre compte, les données de vos clients sont effacées de nos
            systèmes, sauf obligation légale de conservation des factures émises.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Sécurité</h2>
          <p>
            Authentification sécurisée, isolation des données par compte (RLS), chiffrement en transit (HTTPS), accès
            restreint aux secrets d&apos;API.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Cookies</h2>
          <p>
            Consultez la{" "}
            <Link href="/legal/cookies" className="text-[color:var(--primary)] hover:underline">
              politique cookies
            </Link>{" "}
            pour le détail des traceurs et la gestion de vos préférences.
          </p>
        </section>
      </div>
    </div>
  );
}
