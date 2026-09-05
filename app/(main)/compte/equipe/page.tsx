import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse } from "@/types/backend";
import { Clock, UserRound } from "lucide-react";

export default async function CompteEquipePage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const label = [me.prenom, me.nom].filter(Boolean).join(" ").trim() || me.email || "Vous";

  return (
    <CompteSubLayout
      title="Équipe"
      description="Invitez et gérez les membres de votre équipe — disponible prochainement sur le plan PME."
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center gap-2">
          <UserRound className="size-5 text-gray-600 dark:text-gray-400" aria-hidden />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Collaboration</p>
            <p className="font-semibold text-[var(--foreground)]">Votre équipe</p>
          </div>
        </div>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">1 membre (votre compte)</p>
        <div className="rounded-xl bg-gray-50 py-6 text-center dark:bg-gray-950/50">
          <UserRound className="mx-auto size-10 text-gray-400" aria-hidden />
          <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{label}</p>
        </div>
        <div className="mt-4 rounded-xl border border-[color:var(--primary)]/15 bg-[color:var(--primary)]/5 px-4 py-5 text-center">
          <Clock className="mx-auto size-8 text-[color:var(--primary)]" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">Bientôt disponible</p>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            L&apos;invitation de collaborateurs sur un même espace entreprise sera incluse dans le plan PME dès la{" "}
            <strong className="font-semibold text-[var(--foreground)]">prochaine mise à jour</strong>.
          </p>
        </div>
      </div>
    </CompteSubLayout>
  );
}
