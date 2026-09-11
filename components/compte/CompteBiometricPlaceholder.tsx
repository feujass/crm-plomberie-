"use client";

import { Fingerprint } from "lucide-react";

/** Encart informatif : pas de biométrie dans le navigateur (WebAuthn non branché sur ce produit). */
export function CompteBiometricPlaceholder() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-950/40">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm dark:bg-gray-900 dark:text-gray-300">
        <Fingerprint className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--foreground)]">Connexion avec biométrie</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Non disponible dans le navigateur : utilisez votre mot de passe pour vous connecter à Flowo sur le web.
        </p>
      </div>
    </div>
  );
}
