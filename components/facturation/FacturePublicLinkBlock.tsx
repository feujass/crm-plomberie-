"use client";

import { useState } from "react";
import { cx, focusRing } from "@/lib/utils";

type Props = { publicUrl: string };

export function FacturePublicLinkBlock({ publicUrl }: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/50">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Lien public (lecture seule)</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Vos clients peuvent consulter cette facture sans se connecter. Ne partagez le lien qu’avec les personnes concernées.
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          readOnly
          value={publicUrl}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
        <button
          type="button"
          className={cx(
            "shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700",
            focusRing,
          )}
          onClick={() => {
            void navigator.clipboard.writeText(publicUrl).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
    </div>
  );
}
