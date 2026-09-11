import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/app-branding";
import { DATA_RETENTION } from "@/lib/cookies/catalog";
import {
  ARTISAN_CLIENT_DATA_CATEGORIES,
  agreementPartiesLabel,
  subprocessorsForAgreement,
} from "@/lib/legal/subcontract-agreement";
import { SUBPROCESSOR_AGREEMENT_VERSION } from "@/lib/legal/constants";
import { formatSiret, getLegalPublisher } from "@/lib/legal/publisher";
import Link from "next/link";

import { pageMetadata } from "@/lib/seo/site-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Accord de sous-traitance",
  description: "Accord RGPD entre Flowo et l'artisan pour le traitement des données clients.",
  path: "/legal/sous-traitance",
});

export default function SousTraitancePage() {
  const publisher = getLegalPublisher();
  const parties = agreementPartiesLabel();
  const subprocessors = subprocessorsForAgreement();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <CircleBackLink href="/" />
      <h1 className="mt-6 text-2xl font-bold">Accord de sous-traitance (RGPD art. 28)</h1>
      <p className="mt-2 text-xs text-slate-500">Version {SUBPROCESSOR_AGREEMENT_VERSION}</p>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Document incorporé aux{" "}
        <Link href="/legal/cgu" className="text-[color:var(--primary)] hover:underline">
          conditions générales
        </Link>
        . Il régit le traitement, par {APP_NAME}, des données personnelles que vous saisissez concernant{" "}
        <strong>vos clients</strong>.
      </p>

      <div className="prose prose-slate mt-6 space-y-6 text-sm leading-relaxed dark:prose-invert">
        <section>
          <h2 className="text-lg font-semibold">1. Parties et rôles</h2>
          <ul className="list-disc pl-5">
            <li>
              <strong>Responsable de traitement</strong> : vous, l&apos;artisan ou l&apos;entreprise utilisatrice de{" "}
              {APP_NAME}, pour les données de vos clients et prospects.
            </li>
            <li>
              <strong>Sous-traitant</strong> : {parties.processor}, éditeur du service {parties.product}
              {publisher ? (
                <>
                  {" "}
                  (SIRET {formatSiret(publisher.siret)}, {publisher.address})
                </>
              ) : null}
              .
            </li>
          </ul>
          <p className="mt-2">
            Vous garantissez disposer d&apos;une base légale (contrat, consentement, intérêt légitime, etc.) pour
            confier ces données à {APP_NAME}.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Objet, durée et nature du traitement</h2>
          <p>
            Le sous-traitant traite des données pour votre compte afin de fournir le CRM {APP_NAME} : gestion des
            clients, création et envoi de devis et factures, relances, stockage des documents, assistant Zeus (IA), et
            notifications que vous activez.
          </p>
          <p>
            <strong>Durée</strong> : pendant toute la durée de votre abonnement ou compte actif, puis selon les
            modalités de fin de contrat (section 10).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Catégories de données et personnes concernées</h2>
          <p>
            <strong>Personnes concernées</strong> : vos clients, prospects et contacts professionnels saisis dans{" "}
            {APP_NAME}.
          </p>
          <ul className="list-disc pl-5">
            {ARTISAN_CLIENT_DATA_CATEGORIES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Obligations du sous-traitant</h2>
          <p>{parties.processor} s&apos;engage à :</p>
          <ul className="list-disc pl-5">
            <li>traiter les données uniquement sur vos instructions documentées (utilisation du service et paramètres) ;</li>
            <li>garantir la confidentialité des personnes autorisées à accéder aux données ;</li>
            <li>
              mettre en œuvre des mesures de sécurité appropriées (authentification, isolation par compte, chiffrement
              en transit) ;
            </li>
            <li>
              ne pas recruter un autre sous-traitant sans information préalable (liste à la section 5 ; changement
              substantiel notifié via mise à jour de la{" "}
              <Link href="/legal/confidentialite" className="text-[color:var(--primary)] hover:underline">
                politique de confidentialité
              </Link>
              ) ;
            </li>
            <li>vous assister pour répondre aux demandes d&apos;exercice des droits des personnes concernées, dans la mesure du possible ;</li>
            <li>
              vous notifier sans délai indu toute violation de données personnelles dont il a connaissance, après en
              avoir identifié la nature ;
            </li>
            <li>
              supprimer ou restituer les données en fin de contrat, sauf obligation légale de conservation (notamment
              factures : 6 ans).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Sous-traitants ultérieurs</h2>
          <p>
            Vous autorisez {APP_NAME} à faire appel aux prestataires suivants, strictement pour les besoins du service :
          </p>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-2">Prestataire</th>
                <th className="py-2 pr-2">Rôle</th>
                <th className="py-2">Localisation</th>
              </tr>
            </thead>
            <tbody>
              {subprocessors.map((row) => (
                <tr key={row.name} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-2 font-medium">{row.name}</td>
                  <td className="py-2 pr-2">{row.role}</td>
                  <td className="py-2">{row.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">
            Des garanties de transfert (clauses contractuelles types) sont en place avec ces prestataires lorsque des
            données sont traitées hors Union européenne.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Instructions et responsabilité du responsable de traitement</h2>
          <p>
            Vous êtes seul responsable de l&apos;exactitude des données saisies, des mentions légales sur vos devis et
            factures, des bases légales vis-à-vis de vos clients, et des éventuelles demandes d&apos;opposition ou
            d&apos;effacement que vous recevez de vos clients.
          </p>
          <p>
            Les instructions particulières (effacement, export) peuvent être transmises via les fonctionnalités du
            compte ou à{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[color:var(--primary)] hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Durées de conservation (résumé)</h2>
          <ul className="list-disc pl-5">
            {DATA_RETENTION.filter((r) => r.type.includes("client") || r.type.includes("métier") || r.type.includes("Factures")).map(
              (row) => (
                <li key={row.type}>
                  {row.type} : {row.duration}
                </li>
              ),
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Audits</h2>
          <p>
            Sur demande raisonnable et préalable, vous pouvez obtenir les informations nécessaires pour vérifier le
            respect du présent accord (documentation sécurité, DPA prestataires). Un audit sur site n&apos;est pas
            prévu pour les offres standard, sauf obligation légale ou accord écrit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Acceptation</h2>
          <p>
            Le présent accord est accepté lors de la création de votre compte et de l&apos;acceptation des{" "}
            <Link href="/legal/cgu" className="text-[color:var(--primary)] hover:underline">
              CGU
            </Link>
            . Il est reconduit tacitement tant que votre compte reste actif.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">10. Fin du contrat et sort des données</h2>
          <p>
            À la suppression de votre compte (Compte → Sécurité), les données de vos clients sont effacées de nos
            systèmes actifs, sous réserve des sauvegardes techniques à rotation limitée et des obligations légales de
            conservation des pièces émises (factures).
          </p>
          <p>
            Vous pouvez exporter vos données avant suppression via Compte → Sécurité → Télécharger mes données.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">11. Contact</h2>
          <p>
            Questions relative à la sous-traitance :{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[color:var(--primary)] hover:underline">
              {CONTACT_EMAIL}
            </a>
            . Coordonnées éditeur :{" "}
            <Link href="/legal/mentions" className="text-[color:var(--primary)] hover:underline">
              mentions légales
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
