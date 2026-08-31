import Link from "next/link";

import { FAQ } from "@/components/marketing/FAQ";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingFunnelTracker } from "@/components/marketing/MarketingFunnelTracker";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingHeroProduct } from "@/components/marketing/MarketingHeroProduct";
import { MarketingPreviewCarousel } from "@/components/marketing/MarketingPreviewCarousel";
import { MarketingStickyCta } from "@/components/marketing/MarketingStickyCta";
import { MarketingVslPlayer } from "@/components/marketing/MarketingVslPlayer";
import { PricingSection } from "@/components/marketing/PricingSection";
import { SocialProofBanner } from "@/components/marketing/SocialProofBanner";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";
import { APP_NAME } from "@/lib/app-branding";
import { registerReassuranceLine, freeTrialCtaLabel } from "@/lib/plans/trial";
import { cx, focusRing } from "@/lib/utils";

const HIGHLIGHTS = [
  {
    title: "🎙️ Dicte depuis ton camion",
    text: "Dis à Zeus ce que tu as fait : pose de robinets, 3h de main d'œuvre, chauffe-eau. Il rédige chaque ligne, les quantités et le PDF sans que tu touches au clavier.",
  },
  {
    title: "📬 Ton client reçoit un devis pro",
    text: "Un e-mail avec un lien vers une page claire : totaux, TVA, bouton pour accepter. Si pas de réponse sous 3 jours, Flowo relance automatiquement.",
  },
  {
    title: "📊 Sais combien tu vas gagner ce mois",
    text: "Ton CA signé, tes devis en attente, ton taux d'acceptation : tout en un coup d'œil depuis le tableau de bord.",
  },
  {
    title: "🧾 Facture en 1 clic, conforme 2026",
    text: "Le devis est accepté ? Transforme-le en facture en 1 clic. Format conforme à la facturation électronique obligatoire en France (entrée en vigueur 2026).",
  },
] as const;

export function MarketingLanding() {
  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <MarketingFunnelTracker />
      <MarketingHeader />
      <MarketingStickyCta />

      {/* Hero */}
      <section className="px-4 pb-16 pt-8 md:pb-20 md:pt-10 lg:px-8 lg:pb-24 lg:pt-14">
        <div className="mx-auto max-w-2xl text-center lg:max-w-7xl lg:text-left">
          <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 xl:gap-16">
            <div>
              <h1 className="mx-auto max-w-xl text-balance text-3xl font-bold leading-[1.15] tracking-[-0.02em] text-slate-800 dark:text-slate-100 md:text-4xl md:leading-[1.12] lg:mx-0 lg:max-w-none lg:text-[2.75rem] xl:text-5xl">
                Le CRM fait pour les plombiers qui n&apos;ont pas le temps de taper.
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-400 md:mt-6 md:text-lg lg:mx-0 lg:max-w-xl lg:text-xl">
                Parle de ton chantier à voix haute. Zeus rédige le devis, calcule les totaux et l&apos;envoie à ton client en
                moins de 30 secondes.
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                <Link
                  href="/register"
                  data-cta-location="hero"
                  className={cx(
                    focusRing,
                    "inline-flex min-h-12 items-center justify-center rounded-xl bg-[color:var(--primary)] px-8 text-base font-semibold text-white shadow-md hover:opacity-95",
                  )}
                >
                  Créer mon premier devis
                </Link>
                <Link
                  href="#demo"
                  className={cx(
                    focusRing,
                    "inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-base font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  C&apos;est quoi Flowo ?
                </Link>
              </div>
              <p className="mx-auto mt-4 max-w-lg text-sm text-slate-500 lg:mx-0">
                🔒 Sans carte bancaire · ⏱ 14 jours d&apos;essai · ✕ Résiliable en 1 clic
              </p>
            </div>
            <div className="mt-10 lg:mt-0">
              <MarketingHeroProduct />
            </div>
          </div>
        </div>
      </section>

      <SocialProofBanner />

      {/* Carrousel produit */}
      <section className="scroll-mt-24 border-y border-slate-200 bg-white px-4 py-12 dark:border-slate-800 dark:bg-slate-950 md:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl lg:max-w-7xl">
          <h2 className="text-center text-xl font-bold md:text-2xl lg:text-3xl">À quoi ressemble {APP_NAME} ?</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-slate-600 dark:text-slate-400 lg:max-w-2xl lg:text-lg">
            Tableau de bord, devis vocal, envoi client et facturation — le parcours complet.
          </p>
          <div className="mt-10 md:mt-12 lg:mt-14">
            <MarketingPreviewCarousel />
          </div>
        </div>
      </section>

      {/* VSL */}
      <section
        id="demo"
        className="scroll-mt-24 bg-slate-50 px-4 py-12 dark:bg-slate-950/50 md:py-16 lg:px-8 lg:py-20"
      >
        <div className="mx-auto max-w-4xl lg:max-w-7xl">
          <div className="mb-8 text-center lg:mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-[color:var(--primary)]">C&apos;est quoi Flowo ?</span>
            <h2 className="mt-1 text-2xl font-bold lg:text-3xl">75 secondes pour tout comprendre.</h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-600 dark:text-slate-400 lg:max-w-2xl lg:text-lg">
              Dicte un chantier, envoie le devis, suis ton CA — voici Flowo en action.
            </p>
          </div>
          <div className="relative mx-auto aspect-video max-w-2xl overflow-hidden rounded-xl border border-border bg-black shadow-lg lg:max-w-4xl xl:max-w-5xl">
            <MarketingVslPlayer />
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="scroll-mt-24 px-4 pb-10 pt-12 md:pb-12 md:pt-16 lg:px-8 lg:pb-16 lg:pt-20">
        <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 md:gap-4 lg:max-w-7xl lg:gap-6 xl:grid-cols-4">
          {HIGHLIGHTS.map(({ title, text }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:p-5"
            >
              <h3 className="text-sm font-bold md:text-base lg:text-lg">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 md:text-sm lg:text-[15px]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <TestimonialsSection />

      {/* Tarifs */}
      <section
        id="tarifs"
        className="scroll-mt-24 border-y border-slate-200 bg-gradient-to-b from-white via-slate-50/80 to-white py-16 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950 md:py-20 lg:py-24"
      >
        <PricingSection />
      </section>

      <FAQ />

      {/* CTA final */}
      <section className="px-4 py-12 md:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-lg text-center lg:max-w-3xl">
          <h2 className="text-xl font-bold md:text-2xl lg:text-3xl">Prêt à gagner du temps sur tes devis ?</h2>
          <p className="mt-3 text-sm text-slate-500">{registerReassuranceLine()}</p>
          <Link
            href="/register"
            data-cta-location="footer"
            className={cx(
              focusRing,
              "mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[color:var(--primary)] px-8 text-base font-semibold text-white md:mt-10",
            )}
          >
            {freeTrialCtaLabel()}
          </Link>
        </div>
      </section>

      <section className="border-t border-slate-200 px-4 py-10 dark:border-slate-800 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-lg text-center lg:max-w-3xl">
          <Link
            href="/affiliation"
            className={cx(
              focusRing,
              "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-8 text-base font-semibold text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60 sm:w-auto",
            )}
          >
            Programme partenaire {APP_NAME}
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
