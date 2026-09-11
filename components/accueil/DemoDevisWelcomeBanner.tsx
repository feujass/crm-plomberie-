"use client";

import Link from "next/link";

export function DemoDevisWelcomeBanner({ devisId, numero }: { devisId: string; numero?: string }) {
  const label = numero?.trim() || "Votre devis démo";
  return (
    <div
      className="rounded-xl border border-[color:var(--primary)]/25 bg-[color:var(--primary)]/5 px-4 py-3 text-sm text-slate-800 dark:text-slate-100"
      role="status"
    >
      <p className="font-semibold text-[color:var(--primary)] dark:text-[color:var(--chart-1)]">
        Votre devis créé sur la démo est prêt
      </p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Retrouvez-le ci-dessous ou{" "}
        <Link href={`/devis/${devisId}`} className="font-medium text-[color:var(--primary)] hover:underline">
          ouvrir {label}
        </Link>
        .
      </p>
    </div>
  );
}
