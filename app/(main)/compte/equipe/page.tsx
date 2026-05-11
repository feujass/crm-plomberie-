import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse } from "@/types/backend";
import { cx, focusRing } from "@/lib/utils";
import { Share2, UserRound } from "lucide-react";

const SUPPORT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "bonjour@flowo.app").trim();

export default async function CompteEquipePage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const label = [me.prenom, me.nom].filter(Boolean).join(" ").trim() || me.email || "Vous";

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Ajout de membres équipe — Flowo")}&body=${encodeURIComponent(
    "Bonjour,\n\nJe souhaite ajouter des collaborateurs à mon espace Flowo.\n\nMon compte : " + (me.email || "") + "\n\nMerci,\n",
  )}`;

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
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">1 membre (votre compte)</p>
        <div className="rounded-xl bg-gray-50 py-6 text-center dark:bg-gray-950/50">
          <UserRound className="mx-auto size-10 text-gray-400" aria-hidden />
          <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{label}</p>
        </div>
        <a
          href={mailto}
          className={cx(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--primary)] py-3.5 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-95",
            focusRing,
          )}
        >
          <Share2 className="size-4" aria-hidden />
          Demander plusieurs accès
        </a>
        <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          Un e-mail s’ouvre pour contacter le support : nous configurons les sièges supplémentaires sur votre compte.
        </p>
      </div>
    </CompteSubLayout>
  );
}
