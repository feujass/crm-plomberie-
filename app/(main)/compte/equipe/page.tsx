import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse } from "@/types/backend";
import { Share2, UserRound } from "lucide-react";

export default async function CompteEquipePage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const label = [me.prenom, me.nom].filter(Boolean).join(" ").trim() || me.email || "Vous";

  return (
    <CompteSubLayout
      title="Équipe"
      description="Invitez et gérez les membres de votre équipe."
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center gap-2">
          <UserRound className="size-5 text-gray-600 dark:text-gray-400" aria-hidden />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Collaboration</p>
            <p className="font-semibold text-[var(--foreground)]">Votre équipe</p>
          </div>
        </div>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">1 membre</p>
        <div className="rounded-xl bg-gray-50 py-6 text-center dark:bg-gray-950/50">
          <UserRound className="mx-auto size-10 text-gray-400" aria-hidden />
          <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{label}</p>
        </div>
        <button
          type="button"
          disabled
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--primary)] py-3.5 text-sm font-semibold text-[var(--primary-foreground)] opacity-60"
        >
          <Share2 className="size-4" aria-hidden />
          Inviter
        </button>
        <p className="mt-2 text-center text-xs text-gray-500">Invitation multi-utilisateurs : bientôt disponible.</p>
      </div>
    </CompteSubLayout>
  );
}
