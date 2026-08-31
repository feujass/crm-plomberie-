"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cx } from "@/lib/utils";

const faqItems = [
  {
    question: "Est-ce que ça marche sur téléphone ?",
    answer:
      "Oui. Flowo est optimisé mobile. Tu peux dicter un devis, le valider et l'envoyer directement depuis ton smartphone sur chantier.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Oui. Tes données sont hébergées en France, chiffrées, et ne sont jamais partagées avec des tiers.",
  },
  {
    question: "Est-ce que je peux importer mes anciens devis ?",
    answer:
      "Oui. Depuis Devis → Importer, envoie un PDF ou une photo de ton ancien devis : Zeus recrée les lignes automatiquement. Tu peux aussi importer un fichier CSV (modèle téléchargeable) depuis Excel ou ton ancien logiciel.",
  },
  {
    question: "C'est compatible avec ma compta ?",
    answer:
      "Oui. Flowo exporte tes factures en CSV comptable (compatible Pennylane, Indy et la plupart des cabinets) et en écritures ventes FEC. Retrouve les exports dans Facturation → Export compta / Export FEC.",
  },
  {
    question: "Je peux annuler quand je veux ?",
    answer:
      "Oui, sans engagement. Tu peux résilier ton abonnement à tout moment depuis ton espace client, sans frais ni préavis.",
  },
  {
    question: "La facturation électronique est-elle incluse ?",
    answer:
      "La préparation à la facturation électronique obligatoire (France, 2026) est incluse dans les plans Pro+ et PME.",
  },
] as const;

/** Évite qu’un « ? » se retrouve seul en début de ligne (mobile). */
function formatFaqQuestion(text: string) {
  return text.replace(/\s+\?/g, "\u00a0?");
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="scroll-mt-24 px-4 py-12 md:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-2xl lg:max-w-6xl">
        <h2 className="text-center text-2xl font-bold md:text-3xl lg:text-4xl">Questions fréquentes</h2>
        <ul className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 lg:mt-10 xl:grid xl:grid-cols-2 xl:divide-y-0 xl:gap-4 xl:divide-x-0 xl:border-0 xl:bg-transparent xl:dark:bg-transparent">
          {faqItems.map((item, index) => {
            const open = openIndex === index;
            return (
              <li key={item.question} className="xl:rounded-2xl xl:border xl:border-slate-200 xl:bg-white xl:dark:border-slate-800 xl:dark:bg-slate-900">
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-5 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-100 md:items-center md:gap-4 md:text-base"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : index)}
                >
                  <span className="min-w-0 flex-1">{formatFaqQuestion(item.question)}</span>
                  <ChevronDown
                    className={cx("mt-0.5 size-5 shrink-0 text-slate-500 transition-transform md:mt-0", open && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {open ? (
                  <p className="border-t border-slate-100 px-5 pb-4 pt-2 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">
                    {item.answer}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
