"use client";

import { useEffect, useState } from "react";

import {
  clearInternalAnalyticsCookieClient,
  hasInternalAnalyticsCookie,
  setInternalAnalyticsCookieClient,
} from "@/lib/analytics/internal-cookie";

export function InternalDevClient() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(hasInternalAnalyticsCookie());
  }, []);

  function activate() {
    setInternalAnalyticsCookieClient();
    setActive(true);
  }

  function deactivate() {
    clearInternalAnalyticsCookieClient();
    setActive(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Trafic interne analytics</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Active le cookie <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">flowo_internal</code> pour
        marquer tes visites comme internes dans le dashboard analytics (1 an, SameSite=Lax).
      </p>

      {active ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="font-medium text-emerald-800 dark:text-emerald-200">Cookie interne actif</p>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
            Tes prochains événements analytics seront marqués <code>is_internal=true</code>.
          </p>
          <button
            type="button"
            onClick={deactivate}
            className="mt-4 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100"
          >
            Retirer le cookie
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={activate}
          className="mt-6 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
        >
          Activer le trafic interne
        </button>
      )}
    </div>
  );
}
