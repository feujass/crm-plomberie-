import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/app-branding";
import { CGU_VERSION } from "@/lib/legal/constants";
import { legalPublisherLabel } from "@/lib/legal/publisher";
import Link from "next/link";

import { pageMetadata } from "@/lib/seo/site-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Conditions générales",
  description: "Conditions générales d'utilisation du service Flowo pour artisans et plombiers.",
  path: "/legal/cgu",
});

export default function CguPage() {
  const editor = legalPublisherLabel();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <CircleBackLink href="/" />
      <h1 className="mt-6 text-2xl font-bold">Conditions générales d&apos;utilisation</h1>
      <p className="mt-2 text-xs text-slate-500">Version {CGU_VERSION}</p>
      <div className="prose prose-slate mt-6 space-y-6 text-sm leading-relaxed dark:prose-invert">
        <section>
          <h2 className="text-lg font-semibold">1. Objet et acceptation</h2>
          <p>
            Les présentes conditions générales (« CGU ») régissent l&apos;accès et l&apos;utilisation du service{" "}
            {APP_NAME}, édité par {editor}, SaaS de gestion de devis, clients et facturation à destination des
            artisans et entreprises du bâtiment.
          </p>
          <p>
            L&apos;inscription ou l&apos;utilisation du service vaut acceptation des présentes CGU, de la{" "}
            <Link href="/legal/confidentialite" className="text-[color:var(--primary)] hover:underline">
              politique de confidentialité
            </Link>
            , de la{" "}
            <Link href="/legal/cookies" className="text-[color:var(--primary)] hover:underline">
              politique cookies
            </Link>{" "}
            et de l&apos;
            <Link href="/legal/sous-traitance" className="text-[color:var(--primary)] hover:underline">
              accord de sous-traitance (RGPD art. 28)
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Éditeur et contact</h2>
          <p>
            Éditeur : {editor}. Coordonnées complètes dans les{" "}
            <Link href="/legal/mentions" className="text-[color:var(--primary)] hover:underline">
              mentions légales
            </Link>
            . Support :{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[color:var(--primary)] hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Compte et éligibilité</h2>
          <p>
            Le service s&apos;adresse aux <strong>professionnels</strong> (artisans, TPE, PME). Vous déclarez agir à
            des fins professionnelles et fournir des informations exactes (identité, entreprise, SIRET le cas échéant).
          </p>
          <p>
            Vous êtes responsable de la confidentialité de vos identifiants. Toute activité réalisée depuis votre compte
            est réputée effectuée par vous.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Description du service</h2>
          <p>{APP_NAME} permet notamment :</p>
          <ul className="list-disc pl-5">
            <li>gestion de clients et de catalogue ;</li>
            <li>création, envoi et suivi de devis (y compris assistant Zeus par IA) ;</li>
            <li>facturation et export comptable ;</li>
            <li>relances automatiques configurables ;</li>
            <li>notifications (e-mail, et autres canaux lorsqu&apos;ils sont disponibles).</li>
          </ul>
          <p>
            Les fonctionnalités peuvent évoluer. {APP_NAME} est fourni en mode SaaS ; une connexion Internet est
            requise.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Offres, essai et abonnement</h2>
          <p>
            Les tarifs en vigueur sont présentés sur le site (page Tarifs / Abonnement) au moment de la souscription.
            Les prix s&apos;entendent en euros, hors taxes applicables selon votre statut (TVA non applicable en
            franchise de base le cas échéant).
          </p>
          <p>
            Un <strong>essai gratuit</strong> ou une offre promotionnelle peut être proposé ; ses conditions (durée,
            limites) sont indiquées lors de l&apos;inscription.
          </p>
          <p>
            Les abonnements payants sont facturés via <strong>Stripe</strong> (carte bancaire ou moyen accepté par
            Stripe). Le paiement est exigible selon la périodicité choisie (mensuelle ou annuelle). Le renouvellement
            est tacite pour la même durée, sauf résiliation préalable.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Résiliation et remboursement</h2>
          <p>
            Vous pouvez <strong>résilier</strong> votre abonnement à tout moment depuis Compte → Abonnement (portail
            Stripe) ou en contactant le support. La résiliation prend effet à la fin de la période déjà payée ; aucun
            remboursement au prorata n&apos;est dû sauf disposition légale impérative ou erreur de facturation avérée.
          </p>
          <p>
            {editor} peut suspendre ou résilier un compte en cas de violation des CGU, d&apos;impayé, de fraude ou
            d&apos;usage abusive (spam, contenu illicite). Vous pouvez exporter vos données avant clôture (Compte →
            Sécurité).
          </p>
          <p>
            Le service s&apos;adresse à des <strong>professionnels</strong> : le droit de rétractation de 14 jours des
            consommateurs (Code de la consommation) ne s&apos;applique en principe pas, sauf si vous agissez en qualité
            de consommateur non professionnel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Obligations de l&apos;utilisateur</h2>
          <ul className="list-disc pl-5">
            <li>respecter la réglementation applicable à votre activité (devis, factures, TVA, assurances) ;</li>
            <li>ne pas utiliser {APP_NAME} pour des contenus illicites, diffamatoires ou portant atteinte aux droits de tiers ;</li>
            <li>obtenir les bases légales nécessaires pour traiter les données de vos clients confiées à {APP_NAME} ;</li>
            <li>ne pas tenter d&apos;accéder aux systèmes ou données d&apos;autres utilisateurs ;</li>
            <li>maintenir vos informations de facturation à jour.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Données personnelles</h2>
          <p>
            Pour vos propres données de compte, {editor} agit en responsable de traitement. Pour les données de vos
            clients saisies dans {APP_NAME}, vous êtes responsable de traitement et {APP_NAME} agit en sous-traitant —
            voir l&apos;
            <Link href="/legal/sous-traitance" className="text-[color:var(--primary)] hover:underline">
              accord de sous-traitance
            </Link>{" "}
            et la{" "}
            <Link href="/legal/confidentialite" className="text-[color:var(--primary)] hover:underline">
              politique de confidentialité
            </Link>
            .
          </p>
          <p>
            Vous disposez des droits RGPD (accès, export, rectification, effacement) via Compte → Sécurité ou par e-mail
            au support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Propriété intellectuelle</h2>
          <p>
            {APP_NAME}, son interface, logos, marque et logiciel restent la propriété de {editor}. Vous conservez la
            propriété de vos contenus (devis, données clients). Vous accordez à {editor} une licence limitée pour
            héberger et traiter ces contenus aux seules fins de fourniture du service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">10. Disponibilité et support</h2>
          <p>
            {APP_NAME} est fourni « en l&apos;état ». Nous visons une haute disponibilité mais ne garantissons pas un
            fonctionnement ininterrompu (maintenance, dépendance aux hébergeurs, force majeure). Le support est assuré
            par e-mail aux heures ouvrées, dans des délais raisonnables.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">11. Limitation de responsabilité</h2>
          <p>
            Dans les limites autorisées par la loi, la responsabilité de {editor} est limitée aux dommages directs
            prouvés, et plafonnée au montant total payé par vous au titre du service sur les <strong>12 derniers
            mois</strong> précédant le fait générateur.
          </p>
          <p>
            {editor} n&apos;est pas responsable des pertes indirectes (perte de chiffre d&apos;affaires, de clientèle,
            de données non sauvegardées par vos soins), ni du contenu de vos devis ou de votre conformité réglementaire
            métier.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">12. Modifications</h2>
          <p>
            Les CGU peuvent être mises à jour. La version en vigueur est indiquée en tête de page. En cas de changement
            substantiel, vous serez informé par e-mail ou notification in-app ; la poursuite d&apos;utilisation vaut
            acceptation, sauf résiliation de votre part.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">13. Droit applicable et litiges</h2>
          <p>
            Les présentes CGU sont soumises au <strong>droit français</strong>. En cas de litige, et à défaut de
            résolution amiable, compétence exclusive est attribuée aux tribunaux du ressort du siège de l&apos;éditeur
            ({editor}), sous réserve des règles impératives protectrices de l&apos;utilisateur professionnel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">14. Documents associés</h2>
          <ul className="list-disc pl-5">
            <li>
              <Link href="/legal/mentions" className="text-[color:var(--primary)] hover:underline">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/legal/confidentialite" className="text-[color:var(--primary)] hover:underline">
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link href="/legal/cookies" className="text-[color:var(--primary)] hover:underline">
                Politique cookies
              </Link>
            </li>
            <li>
              <Link href="/legal/sous-traitance" className="text-[color:var(--primary)] hover:underline">
                Accord de sous-traitance (art. 28 RGPD)
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
