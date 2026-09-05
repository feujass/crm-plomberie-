import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/app-branding";
import {
  formatSiret,
  getLegalPublisher,
  isLegalPublisherConfigured,
  LEGAL_HOSTING,
  legalPublisherLabel,
} from "@/lib/legal/publisher";
import Link from "next/link";

import { pageMetadata } from "@/lib/seo/site-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Mentions légales",
  description: "Éditeur, hébergeur et informations légales du site flowo.agency.",
  path: "/legal/mentions",
});

export default function MentionsPage() {
  const publisher = getLegalPublisher();
  const configured = isLegalPublisherConfigured();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <CircleBackLink href="/" />
      <h1 className="mt-6 text-2xl font-bold">Mentions légales</h1>
      <p className="mt-2 text-xs text-slate-500">
        Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique (LCEN).
      </p>

      <div className="prose prose-slate mt-6 space-y-6 text-sm leading-relaxed dark:prose-invert">
        {!configured ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 not-prose dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-semibold">Identité éditeur incomplète</p>
            <p className="mt-1 text-sm leading-relaxed">
              Les coordonnées légales de l&apos;éditeur (raison sociale, SIRET, adresse) doivent être configurées via les
              variables d&apos;environnement <code className="text-xs">NEXT_PUBLIC_LEGAL_*</code> avant un lancement
              commercial.
            </p>
          </div>
        ) : null}

        <section>
          <h2 className="text-lg font-semibold">Éditeur du site</h2>
          {publisher ? (
            <ul className="mt-2 list-none space-y-1 p-0">
              <li>
                <strong>Raison sociale :</strong> {publisher.companyName}
                {publisher.legalForm ? ` — ${publisher.legalForm}` : null}
              </li>
              <li>
                <strong>SIRET :</strong> {formatSiret(publisher.siret)}
              </li>
              <li>
                <strong>Adresse :</strong> {publisher.address}
              </li>
              <li>
                <strong>Contact :</strong>{" "}
                <a href={`mailto:${publisher.email}`} className="text-[color:var(--primary)] hover:underline">
                  {publisher.email}
                </a>
              </li>
            </ul>
          ) : (
            <p>
              <strong>{APP_NAME}</strong> — SaaS de gestion de devis et facturation pour artisans du BTP.
              <br />
              <strong>Contact :</strong>{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[color:var(--primary)] hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold">Directeur de la publication</h2>
          <p>
            {publisher?.director ??
              (publisher ? publisher.companyName : "À renseigner (NEXT_PUBLIC_LEGAL_DIRECTOR)")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Hébergeur</h2>
          <p>
            Le site {APP_NAME} est hébergé par :
          </p>
          <ul className="mt-2 list-none space-y-1 p-0">
            <li>
              <strong>{LEGAL_HOSTING.name}</strong>
            </li>
            <li>{LEGAL_HOSTING.address}</li>
            <li>
              <a
                href={LEGAL_HOSTING.website}
                className="text-[color:var(--primary)] hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                {LEGAL_HOSTING.website.replace(/^https:\/\//, "")}
              </a>
            </li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Les données applicatives (comptes, devis, factures) sont également traitées via des sous-traitants listés dans
            la{" "}
            <Link href="/legal/confidentialite" className="text-[color:var(--primary)] hover:underline">
              politique de confidentialité
            </Link>
            , notamment Supabase (base de données) et Stripe (paiements).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble du site {legalPublisherLabel()}, de sa structure et de ses contenus (textes, logos, graphismes,
            logiciel) est protégé par le droit de la propriété intellectuelle. Toute reproduction ou exploitation non
            autorisée est interdite.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Données personnelles</h2>
          <p>
            Pour connaître vos droits et la manière dont vos données sont traitées, consultez la{" "}
            <Link href="/legal/confidentialite" className="text-[color:var(--primary)] hover:underline">
              politique de confidentialité
            </Link>{" "}
            et la{" "}
            <Link href="/legal/cookies" className="text-[color:var(--primary)] hover:underline">
              politique cookies
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
