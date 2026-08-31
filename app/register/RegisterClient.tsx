"use client";

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { RegisterPasswordField } from "@/components/auth/RegisterPasswordField";
import { ReferralCapture } from "@/components/affiliate/ReferralCapture";
import { Button } from "@/components/ui/Button";
import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { Input } from "@/components/ui/Input";
import { trackFunnelEvent } from "@/lib/analytics/funnel";
import { trackMetaEvent } from "@/lib/analytics/meta-pixel";
import { getOrCreateSessionId } from "@/lib/analytics/session";
import { translateSupabaseAuthError } from "@/lib/auth/supabase-auth-errors";
import { FREE_TRIAL_DAYS } from "@/lib/plans/trial";
import { validatePassword } from "@/lib/security/password-policy";
import { isFlowoBilling, isFlowoPlanId } from "@/lib/stripe/plans";
import { cx } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutPlan = searchParams.get("plan") ?? "";
  const checkoutBilling = searchParams.get("billing") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setEmailError(null);
    setPasswordError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setEmailError("Entre une adresse e-mail valide.");
      return;
    }

    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setPasswordError(pwdErr);
      return;
    }

    if (!acceptedPrivacy) {
      setFormError("Accepte les CGU et la politique de confidentialité pour continuer.");
      return;
    }

    setLoading(true);
    trackFunnelEvent("register_submit");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: trimmedEmail,
        password,
        privacy_accepted: true,
        analytics_session_id: getOrCreateSessionId(),
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      needsEmailConfirmation?: boolean;
      message?: string;
      error?: string;
    } | null;
    setLoading(false);

    if (!res.ok) {
      const msg = translateSupabaseAuthError(json?.error ?? json?.message ?? "Inscription impossible");
      const field = /mot de passe|password/i.test(msg) ? "password" : /e-mail|email|mail/i.test(msg) ? "email" : "form";
      trackFunnelEvent("register_error", { properties: { field, message: msg } });
      if (/e-mail|email|mail/i.test(msg)) {
        setEmailError(msg);
      } else if (/mot de passe|password/i.test(msg)) {
        setPasswordError(msg);
      } else {
        setFormError(msg);
      }
      return;
    }

    trackFunnelEvent("register_success");
    trackMetaEvent("CompleteRegistration");

    if (json?.needsEmailConfirmation) {
      router.replace(`/login?registered=confirm&message=${encodeURIComponent(json.message ?? "Confirme ton e-mail.")}`);
      return;
    }

    if (isFlowoPlanId(checkoutPlan) && isFlowoBilling(checkoutBilling)) {
      const params = new URLSearchParams({ checkout: "1", plan: checkoutPlan, billing: checkoutBilling });
      router.replace(`/compte/donnees?${params.toString()}`);
      return;
    }

    router.replace("/accueil");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
      <ReferralCapture />
      <CircleBackLink href="/" label="Retour à l'accueil" className="mb-4" />
      <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-50">Crée ton compte</h1>
      <p className="mb-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Essai gratuit · accès Pro+ · teste Flowo en 20 secondes
      </p>

      <GoogleAuthButton
        mode="register"
        label="Continuer avec Google"
        plan={isFlowoPlanId(checkoutPlan) ? checkoutPlan : undefined}
        billing={isFlowoBilling(checkoutBilling) ? checkoutBilling : undefined}
        disabled={!acceptedPrivacy}
        className="mb-4"
      />

      <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-gray-400">ou</p>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        {formError ? <p className="text-sm text-red-600 dark:text-red-400">{formError}</p> : null}

        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(null);
          }}
          hasError={Boolean(emailError)}
        />
        {emailError ? <p className="-mt-2 text-xs text-red-600">{emailError}</p> : null}

        <RegisterPasswordField
          value={password}
          onChange={setPassword}
          serverError={passwordError}
          onClearServerError={() => setPasswordError(null)}
        />

        <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={acceptedPrivacy}
            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
            className="mt-0.5"
            required
          />
          <span>
            J&apos;accepte les{" "}
            <Link href="/legal/cgu" className="font-medium text-[color:var(--primary)] hover:underline" target="_blank">
              CGU
            </Link>
            , l&apos;
            <Link href="/legal/sous-traitance" className="font-medium text-[color:var(--primary)] hover:underline" target="_blank">
              accord de sous-traitance
            </Link>{" "}
            et la{" "}
            <Link href="/legal/confidentialite" className="font-medium text-[color:var(--primary)] hover:underline" target="_blank">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>

        <p className="text-center text-sm text-slate-500">
          🔒 Sans carte bancaire · ⏱ {FREE_TRIAL_DAYS} jours d&apos;essai · ✕ Résiliable en 1 clic
        </p>

        <Button type="submit" className={cx("w-full")} disabled={loading || !acceptedPrivacy}>
          {loading ? "Création…" : "Créer mon compte gratuitement"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <Link href="/login" className="font-medium text-[color:var(--primary)] hover:underline">
          Déjà un compte ? Connexion
        </Link>
      </p>
    </div>
  );
}
