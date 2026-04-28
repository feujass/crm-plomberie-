"use client";

import { Fingerprint } from "lucide-react";
import { useState } from "react";

export function CompteBiometricPlaceholder() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-950/40">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm dark:bg-gray-900 dark:text-gray-300">
        <Fingerprint className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--foreground)]">Connexion avec biométrie</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Bientôt disponible (app native). Préférez le mot de passe pour le web.</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-[color:var(--primary)]" : "bg-gray-300 dark:bg-gray-600"}`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${on ? "left-5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
