import {
  FREE_TRIAL_DAYS,
  TRIAL_EXPIRED_ACCOUNT_MESSAGE,
} from "@/lib/plans/trial";

export function TrialActiveBanner({ daysLeft }: { daysLeft: number }) {
  return (
    <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
      Essai gratuit actif — encore {daysLeft} jour{daysLeft > 1 ? "s" : ""} sur {FREE_TRIAL_DAYS} (accès Pro+).
    </p>
  );
}

export function TrialExpiredBanner() {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
      {TRIAL_EXPIRED_ACCOUNT_MESSAGE}
    </p>
  );
}

export function TrialFeatureError({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
      {message}
    </p>
  );
}
