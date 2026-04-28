import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { Bell } from "lucide-react";

export default function CompteNotificationsPage() {
  return (
    <CompteSubLayout
      title="Notifications"
      description="Push, e-mail, SMS et WhatsApp — personnalisez comment Flowo vous prévient."
    >
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <Bell className="size-5 text-gray-700 dark:text-gray-300" aria-hidden />
          </span>
          <p className="font-semibold text-[var(--foreground)]">Préférences</p>
        </div>
        <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>Activez les notifications du navigateur pour les relances et rappels.</li>
          <li>Le numéro WhatsApp affiché sur l&apos;accueil permet à vos clients de vous contacter.</li>
          <li>Les e-mails transactionnels (devis, factures) utilisent votre configuration d&apos;envoi.</li>
        </ul>
        <p className="text-xs text-gray-500">
          Réglages granulaires par canal : en cours d&apos;intégration. Utilisez les réglages système de votre téléphone pour les push.
        </p>
      </div>
    </CompteSubLayout>
  );
}
