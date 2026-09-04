"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";
import { trackFunnelEvent } from "@/lib/analytics/funnel";
import { cx, focusRing } from "@/lib/utils";
import { useEffect, useState } from "react";

type Variant = "register" | "login";

function buildCallbackUrl(opts: {
  mode: Variant;
  redirectTo?: string;
  plan?: string;
  billing?: string;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams();
  if (opts.mode === "register") params.set("signup", "1");
  if (opts.redirectTo?.startsWith("/")) params.set("next", opts.redirectTo);
  if (opts.plan) params.set("plan", opts.plan);
  if (opts.billing) params.set("billing", opts.billing);
  const qs = params.toString();
  return `${origin}/auth/callback${qs ? `?${qs}` : ""}`;
}

export function GoogleAuthButton({
  mode,
  redirectTo,
  plan,
  billing,
  className,
  label,
  requirePrivacyAccepted,
  onPrivacyRequired,
}: {
  mode: Variant;
  redirectTo?: string;
  plan?: string;
  billing?: string;
  className?: string;
  label?: string;
  /** Si true, bloque le clic tant que les CGU ne sont pas cochées (sans attribut disabled). */
  requirePrivacyAccepted?: boolean;
  onPrivacyRequired?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isSupabaseAuthConfigured()) return null;

  const defaultLabel =
    mode === "register" ? "S'inscrire avec Google" : "Continuer avec Google";

  if (!mounted) {
    return (
      <div className={className}>
        <div
          className={cx(
            "inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400",
          )}
          aria-hidden
        >
          <GoogleIcon />
          Chargement…
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={pending}
        className={cx(
          "inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
          focusRing,
        )}
        onClick={async () => {
          if (requirePrivacyAccepted) {
            onPrivacyRequired?.();
            return;
          }

          setErr(null);
          setPending(true);
          trackFunnelEvent("google_oauth_click", { properties: { mode } });

          try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: buildCallbackUrl({ mode, redirectTo, plan, billing }),
                queryParams: { prompt: mode === "register" ? "select_account" : "consent" },
              },
            });
            if (error) {
              setErr(error.message);
              setPending(false);
            }
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Connexion Google impossible");
            setPending(false);
          }
        }}
      >
        <GoogleIcon />
        {pending ? "Redirection…" : (label ?? defaultLabel)}
      </button>
      {err ? <p className="mt-2 text-center text-sm text-red-600 dark:text-red-400">{err}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
