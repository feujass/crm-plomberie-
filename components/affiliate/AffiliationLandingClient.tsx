"use client";

import { CheckCircle2, ChevronRight, Euro, Link2, MousePointerClick, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { APP_NAME } from "@/lib/app-branding";
import { cx, focusRing } from "@/lib/utils";

const BENEFITS = [
  {
    title: "20 % récurrent",
    text: "Tu touches une commission sur chaque paiement d'abonnement de tes filleuls, tant qu'ils restent clients.",
    Icon: Euro,
  },
  {
    title: "Ton propre dashboard",
    text: "Clics, inscriptions, abonnés, MRR et commissions, comme un vrai business à ton nom.",
    Icon: TrendingUp,
  },
  {
    title: "Liens & textes prêts",
    text: "WhatsApp, réseaux sociaux, lien court : tout est prêt à copier-coller depuis ton espace.",
    Icon: Link2,
  },
  {
    title: "Cookie 30 jours",
    text: "Même si l'artisan s'inscrit plus tard, tu es crédité grâce au suivi d'attribution.",
    Icon: MousePointerClick,
  },
] as const;

const STEPS = [
  "Tu candidatures en 2 minutes",
  "On valide ton profil sous 48 h",
  "Tu partages ton lien et tu suis tout en direct",
] as const;

export function AffiliationLandingClient() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <MarketingHeader />

      <div className="bg-slate-50/50 px-4 py-3 dark:bg-slate-950/50">
        <nav
          aria-label="Fil d'Ariane"
          className="mx-auto flex max-w-4xl flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
        >
          <Link href="/" className="font-medium text-slate-700 hover:text-[color:var(--primary)] dark:text-slate-300">
            {APP_NAME}
          </Link>
          <ChevronRight className="size-4 shrink-0 opacity-50" aria-hidden />
          <span className="font-medium text-violet-700 dark:text-violet-300">Programme partenaire</span>
        </nav>
      </div>

      <section className="px-4 pb-12 pt-10">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl">
            Gagne de l&apos;argent en recommandant {APP_NAME}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
            Tu formes, tu conseilles ou tu accompagnes des artisans ? Propose-leur le CRM qui fait les devis à la voix.
            Tu as ton espace brandé, tes stats et tes commissions, sans utiliser le CRM artisan.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="#candidature"
              className={cx(
                "inline-flex min-h-12 items-center justify-center rounded-xl bg-[color:var(--primary)] px-8 text-base font-semibold text-white shadow-md hover:opacity-95",
                focusRing,
              )}
            >
              Devenir partenaire
            </a>
            <Link
              href="/partenaire/connexion"
              className={cx(
                "inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-base font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
                focusRing,
              )}
            >
              Déjà partenaire ? Connexion
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50/80 px-4 py-12 dark:bg-slate-950/40">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <b.Icon className="size-6 text-[color:var(--primary)]" aria-hidden />
              <h2 className="mt-3 font-semibold text-slate-900 dark:text-slate-50">{b.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-xl">
          <h2 className="text-center text-xl font-bold text-slate-900 dark:text-slate-50">Comment ça marche</h2>
          <ol className="mt-6 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-sm font-bold text-[color:var(--primary)]">
                  {i + 1}
                </span>
                <span className="pt-1 text-sm text-slate-700 dark:text-slate-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="candidature" className="scroll-mt-20 bg-white px-4 py-12 dark:bg-slate-950">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-50">Candidater</h2>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            Réponse sous 48 h. Idéal si tu as déjà une audience d&apos;artisans (formation, réseaux, clients…).
          </p>

          {success ? (
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
              <p className="mt-3 font-semibold text-emerald-950 dark:text-emerald-100">Candidature envoyée !</p>
              <p className="mt-2 text-sm text-emerald-900/90 dark:text-emerald-200/90">
                On t&apos;a envoyé un e-mail de confirmation. Tu recevras ton lien partenaire dès validation.
              </p>
            </div>
          ) : (
            <form
              className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50"
              onSubmit={async (e) => {
                e.preventDefault();
                setPending(true);
                setError(null);
                const fd = new FormData(e.currentTarget);
                const res = await fetch("/api/affiliate/apply", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    display_name: fd.get("display_name"),
                    email: fd.get("email"),
                    brand_name: fd.get("brand_name"),
                    phone: fd.get("phone"),
                    audience_size: fd.get("audience_size"),
                    pitch: fd.get("pitch"),
                  }),
                });
                const json = (await res.json().catch(() => ({}))) as { error?: string };
                setPending(false);
                if (!res.ok) {
                  setError(json.error ?? "Envoi impossible.");
                  return;
                }
                setSuccess(true);
              }}
            >
              {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Prénom et nom *" name="display_name" required />
                <Input label="E-mail *" name="email" type="email" required />
              </div>
              <Input label="Nom de ta marque / activité *" name="brand_name" placeholder="Ex. Formation Dupont BTP" required />
              <Input label="Téléphone" name="phone" type="tel" />
              <Input
                label="Taille de ton audience"
                name="audience_size"
                placeholder="Ex. 2 000 abonnés Instagram, 150 stagiaires/an…"
              />
              <Textarea
                label="Pourquoi veux-tu recommander Flowo ? *"
                name="pitch"
                rows={4}
                placeholder="Qui est ton audience, comment tu comptes promouvoir Flowo…"
                required
              />
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Envoi…" : "Envoyer ma candidature"}
              </Button>
              <p className="text-center text-xs text-slate-500">
                En candidatant, tu acceptes nos{" "}
                <Link href="/legal/cgu" className="text-[color:var(--primary)] hover:underline">
                  CGU
                </Link>{" "}
                et notre{" "}
                <Link href="/legal/confidentialite" className="text-[color:var(--primary)] hover:underline">
                  politique de confidentialité
                </Link>
                .
              </p>
            </form>
          )}
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="mx-auto max-w-xl text-center">
          <Users className="mx-auto size-8 text-[color:var(--primary)]" aria-hidden />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Déjà partenaire actif ?{" "}
            <Link href="/partenaire/connexion" className="font-medium text-[color:var(--primary)] hover:underline">
              Connecte-toi à ton espace partenaire
            </Link>
            {" "}
            ou{" "}
            <Link href="/partenaire/activer" className="font-medium text-[color:var(--primary)] hover:underline">
              active ton accès
            </Link>
            .
          </p>
        </div>
      </section>

      <MarketingFooter plain />
    </div>
  );
}
