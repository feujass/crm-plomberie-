import {
  CompteDeleteAccountFormClient,
} from "@/components/compte/CompteFormsClient";
import { CompteBiometricPlaceholder } from "@/components/compte/CompteBiometricPlaceholder";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { Shield, Trash2 } from "lucide-react";
import Link from "next/link";

export default function CompteSecuritePage() {
  return (
    <CompteSubLayout
      title="Sécurité"
      description="Gérez les options de connexion et les actions sensibles de votre compte."
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <Shield className="size-4 text-gray-700 dark:text-gray-300" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Sécurité</p>
              <p className="font-semibold text-[var(--foreground)]">Connexion biométrique</p>
            </div>
          </div>
          <CompteBiometricPlaceholder />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <Trash2 className="size-4 text-gray-700 dark:text-gray-300" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Confidentialité</p>
              <p className="font-semibold text-[var(--foreground)]">Suppression du compte</p>
            </div>
          </div>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Action sensible — irréversible.</p>
          <Link
            href="/forgot-password"
            className="mb-4 block text-sm font-medium text-[color:var(--primary)] hover:underline"
          >
            Réinitialiser le mot de passe (e-mail)
          </Link>
          <CompteDeleteAccountFormClient />
        </div>
      </div>
    </CompteSubLayout>
  );
}
