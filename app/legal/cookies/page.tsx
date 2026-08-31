import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { COOKIE_CATALOG, COOKIE_CATEGORIES } from "@/lib/cookies/catalog";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/app-branding";

import { pageMetadata } from "@/lib/seo/site-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Politique cookies",
  description: "Cookies utilisés sur flowo.agency et gestion de ton consentement analytique.",
  path: "/legal/cookies",
});

export default function CookiesPage() {
  const essential = COOKIE_CATALOG.filter((c) => c.category === "essential");
  const analytics = COOKIE_CATALOG.filter((c) => c.category === "analytics");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <CircleBackLink href="/" />
      <h1 className="mt-6 text-2xl font-bold">Politique cookies</h1>
      <div className="prose prose-slate mt-6 space-y-6 text-sm leading-relaxed dark:prose-invert">
        <p>
          Cette page décrit les traceurs utilisés sur {APP_NAME}. Vous pouvez modifier vos préférences à tout moment
          depuis <strong>Compte → Sécurité → Données personnelles</strong> ou via la bannière affichée lors de votre
          première visite.
        </p>

        {(["essential", "analytics"] as const).map((cat) => (
          <section key={cat}>
            <h2 className="text-lg font-semibold">{COOKIE_CATEGORIES[cat].label}</h2>
            <p>{COOKIE_CATEGORIES[cat].description}</p>
            <table className="mt-3 w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-2">Nom</th>
                  <th className="py-2 pr-2">Finalité</th>
                  <th className="py-2 pr-2">Durée</th>
                  <th className="py-2">Fournisseur</th>
                </tr>
              </thead>
              <tbody>
                {(cat === "essential" ? essential : analytics).map((row) => (
                  <tr key={row.name} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-2 font-mono">{row.name}</td>
                    <td className="py-2 pr-2">{row.purpose}</td>
                    <td className="py-2 pr-2">{row.duration}</td>
                    <td className="py-2">{row.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <section>
          <h2 className="text-lg font-semibold">Mesure d&apos;audience (PostHog)</h2>
          <p>
            Si vous acceptez les cookies analytiques, nous utilisons{" "}
            <a href="https://posthog.com/privacy" className="text-[color:var(--primary)] hover:underline" rel="noopener noreferrer" target="_blank">
              PostHog
            </a>{" "}
            pour mesurer les pages visitées et les actions dans l&apos;application (création de devis, navigation).
            Les données sont pseudonymisées ; nous n&apos;envoyons pas le contenu de vos devis ni les coordonnées de
            vos clients dans ces statistiques.
          </p>
          <p>
            Recommandation : héberger PostHog en région <strong>UE</strong> (
            <code className="text-xs">NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com</code>).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p>
            Questions :{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[color:var(--primary)] hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
