"use client";

import { cx, focusRing } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function CompteLogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className={cx(
        "flex w-full items-center gap-3 border-b border-gray-100 py-3.5 text-left last:border-b-0 dark:border-gray-800/80",
        focusRing,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
        <LogOut className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-red-600 dark:text-red-400">Déconnexion</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Se déconnecter de ce compte</p>
      </div>
    </button>
  );
}
