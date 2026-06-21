import Image from "next/image";
import Link from "next/link";

import { FAQ } from "@/components/marketing/FAQ";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingPreviewCarousel } from "@/components/marketing/MarketingPreviewCarousel";
import { PricingSection } from "@/components/marketing/PricingSection";
import { SocialProofBanner } from "@/components/marketing/SocialProofBanner";
import { APP_NAME } from "@/lib/app-branding";
import { cx, focusRing } from "@/lib/utils";

const ZEUS_AVATAR = "/zeus-avatar.png";

const ZEUS_INTRO_BULLETS = [
  "Je transforme ta dictée en devis prêt à envoyer.",
  "Je prépare une page client détaillée, avec quantités, TVA et totaux.",
  "Je te suis avec un tableau de bord et des relances automatiques.",
] as const;

const HIGHLIGHTS = [
  {
    title: "🎙️ Dicte depuis ton camion",
    text: "Dis à Zeus ce que tu as fait : pose de robinets, 3h de main d'œuvre, chauffe-eau. Il rédige chaque ligne, les quantités et le PDF — sans que tu touches au clavier.",
  },
  {
    title: "📬 Ton client reçoit un devis pro",
    text: "Un e-mail avec un lien vers une page claire : totaux, TVA, bouton pour accepter. Si pas de réponse sous 3 jours, Flowo relance automatiquement.",
  },
  {
    title: "📊 Sais combien tu vas gagner ce mois",
    text: "Ton CA signé, tes devis en attente, ton taux d'acceptation — en un coup d'œil depuis le tableau de bord.",
  },
  {
    title: "🧾 Facture en 1 clic, conforme 2026",
    text: "Le devis est accepté ? Transforme-le en facture en 1 clic. Format conforme à la facturation électronique obligatoire en France (entrée en vigueur 2026).",
  },
] as const;

export function MarketingLanding() {
  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <MarketingHeader />

      {/* Hero */}
      <section className="px-4 pb-16 pt-8 md:pb-20 md:pt-10">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mx-auto max-w-xl text-balance text-3xl font-bold leading-[1.15] tracking-[-0.02em] text-slate-800 dark:text-slate-100 md:text-4xl md:leading-[1.12] lg:text-[2.75rem]">
            Le CRM fait pour les plombiers qui n&apos;ont pas le temps de taper.
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-400 md:mt-6 md:text-lg">
            Parle de ton chantier à voix haute. Zeus rédige le devis, calcule les totaux et l&apos;envoie à ton client — en
            moins de 30 secondes.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/register"
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
              Voir Zeus en action
            </Link>
          </div>

          <div className="mx-auto mt-8 flex justify-center md:mt-10">
            <div className="relative aspect-square w-24 overflow-hidden rounded-full ring-1 ring-[color:var(--primary)]/20 shadow-md md:w-28">
              <Image
                src={ZEUS_AVATAR}
                alt="Zeus, assistant IA Flowo"
                width={112}
                height={112}
                className="h-full w-full object-cover object-[center_18%]"
                sizes="112px"
                priority
              />
            </div>
          </div>

          <div
            className="mx-auto mt-5 max-w-lg rounded-2xl border border-[color:var(--primary)]/15 bg-white p-5 text-left shadow-[0_4px_24px_rgba(15,23,42,0.06)] dark:border-[color:var(--primary)]/20 dark:bg-slate-900 dark:shadow-none md:mt-6 md:p-6"
            aria-label="Message de Zeus, assistant IA Flowo"
          >
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 md:text-lg">
              Salut&nbsp;! Moi c&apos;est <span className="text-[color:var(--primary)]">Zeus</span>.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-[15px]">
              Je suis l&apos;assistant IA de {APP_NAME}, ta mascotte et ton interlocuteur dans l&apos;app.{" "}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                Parle-moi de ton chantier à voix haute
              </strong>
              , je rédige le devis pour toi&nbsp;: lignes, quantités et PDF.
            </p>

            <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300 md:text-[15px]">
              {ZEUS_INTRO_BULLETS.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-[color:var(--primary)]" aria-hidden>
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <SocialProofBanner />

      {/* Démo */}
      <section
        id="demo"
        className="scroll-mt-24 border-y border-slate-200 bg-slate-50 px-4 py-12 dark:border-slate-800 dark:bg-slate-950/50 md:py-16"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[color:var(--primary)]">Zeus en action</span>
            <h2 className="mt-1 text-2xl font-bold">Dicte ton chantier. Zeus fait le reste.</h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-600 dark:text-slate-400">
              Depuis ton camion ou sur chantier, parle à Zeus. Il génère les lignes, les quantités, la TVA — et envoie le PDF au
              client.
            </p>
          </div>

          <div className="relative mx-auto mb-10 flex aspect-video max-w-2xl items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
            <div className="text-center text-muted-foreground">
              <p className="mb-2 text-4xl">🎙️</p>
              <p className="font-medium">Démo vidéo Zeus — à venir</p>
              <p className="text-sm">En attendant, crée ton compte et teste gratuitement</p>
            </div>
          </div>

          <h2 className="text-center text-xl font-bold md:text-2xl">À quoi ressemble {APP_NAME} ?</h2>
          <div className="mt-10 md:mt-12">
            <MarketingPreviewCarousel />
          </div>
        </div>
      </section>

      {/* Piliers */}
      <section id="fonctionnalites" className="scroll-mt-24 px-4 pb-10 pt-12 md:pb-12 md:pt-16">
        <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 md:gap-4">
          {HIGHLIGHTS.map(({ title, text }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <h3 className="text-sm font-bold md:text-base">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 md:text-sm">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <FAQ />

      {/* Tarifs */}
      <section
        id="tarifs"
        className="scroll-mt-24 border-y border-slate-200 bg-gradient-to-b from-white via-slate-50/80 to-white py-16 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950 md:py-20"
      >
        <PricingSection />
      </section>

      {/* CTA final */}
      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-xl font-bold md:text-2xl">Prêt à gagner du temps sur vos devis ?</h2>
          <Link
            href="/register"
            className={cx(
              focusRing,
              "mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[color:var(--primary)] px-8 text-base font-semibold text-white md:mt-10",
            )}
          >
            Essayer Flowo gratuitement — 14 jours
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-4 py-10 dark:border-slate-800 md:py-12">
        <nav className="mx-auto flex max-w-lg flex-col items-center gap-4 text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-3">
          <a
            href="mailto:hello@flowo.app"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Une question ? Écris-nous
          </a>
          <Link href="/legal/cgu" className="hover:text-[color:var(--primary)] hover:underline">
            Conditions générales
          </Link>
          <Link href="/legal/mentions" className="hover:text-[color:var(--primary)] hover:underline">
            Mentions légales
          </Link>
          <Link href="/legal/confidentialite" className="hover:text-[color:var(--primary)] hover:underline">
            Confidentialité
          </Link>
        </nav>
        <p className="mt-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </footer>
    </div>
  );
}
