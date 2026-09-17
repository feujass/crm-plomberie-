"use client";

import Link from "next/link";
import type { ProfileCompletionState } from "@/lib/profile/completion";
import { cx, focusRing } from "@/lib/utils";

export function ProfileCompletionBanner({
  completion,
  onboardingHref,
}: {
  completion: ProfileCompletionState;
  onboardingHref: string;
}) {
  if (completion.basicComplete) return null;

  return (
    <section className="rounded-2xl border border-[color:var(--primary)]/20 bg-[color:var(--primary)]/[0.05] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--foreground)]">Complète ton profil pour envoyer ton premier devis</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Encore {completion.missingBasic.length} info{completion.missingBasic.length > 1 ? "s" : ""} · environ 2 min
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-[color:var(--primary)] transition-all duration-500"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
        </div>
        <Link
          href={onboardingHref}
          className={cx(
            "inline-flex shrink-0 items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95",
            focusRing,
          )}
        >
          Compléter (2 min)
        </Link>
      </div>
    </section>
  );
}
