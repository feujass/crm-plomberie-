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
      "L'import de données est prévu dans une prochaine mise à jour. En attendant, tu peux recréer tes modèles rapidement grâce à Zeus.",
  },
  {
    question: "C'est compatible avec ma compta ?",
    answer:
      "Flowo génère des factures au format standard. L'export comptable (FEC, connecteur Pennylane/Indy) est en cours de développement.",
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

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="scroll-mt-24 px-4 py-12 md:py-16">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center text-2xl font-bold md:text-3xl">Questions fréquentes</h2>
        <ul className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {faqItems.map((item, index) => {
            const open = openIndex === index;
            return (
              <li key={item.question}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-100 md:text-base"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : index)}
                >
                  {item.question}
                  <ChevronDown
                    className={cx("size-5 shrink-0 text-slate-500 transition-transform", open && "rotate-180")}
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
