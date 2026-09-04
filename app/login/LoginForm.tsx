"use client";

import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { OAuthErrorAnalyticsCapture } from "@/components/analytics/OAuthAnalyticsCapture";
import { AuthShell } from "@/components/login/AuthShell";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { AuthButton, AuthInput, cn } from "@/components/login/auth-ui";
import { formFieldAnalyticsHandlers } from "@/lib/analytics/form-fields";
import {
  isInternalAnalyticsEmail,
  setInternalAnalyticsCookieClient,
} from "@/lib/analytics/internal-cookie";
import { getOrCreateSessionId } from "@/lib/analytics/session";

export function LoginForm({
  redirectTo,
  backendConfigured,
  passwordResetOk = false,
  authError = false,
  oauthErrorCode = null,
  oauthErrorMessage = null,
  registrationPending = false,
  registrationMessage = null,
  accountDeleted = false,
  noCrmAccount = false,
}: {
  redirectTo: string;
  backendConfigured: boolean;
  passwordResetOk?: boolean;
  authError?: boolean;
  oauthErrorCode?: string | null;
  oauthErrorMessage?: string | null;
  registrationPending?: boolean;
  registrationMessage?: string | null;
  accountDeleted?: boolean;
  noCrmAccount?: boolean;
}) {
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailFieldAnalytics = formFieldAnalyticsHandlers("email", () => email);
  const passwordFieldAnalytics = formFieldAnalyticsHandlers("password", () => password);

  const authDisabled = !backendConfigured;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (authDisabled) {
      setError(
        "Auth indisponible : configurez Supabase (NEXT_PUBLIC_SUPABASE_*) ou BACKEND_URL dans les variables d'environnement.",
      );
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, analytics_session_id: getOrCreateSessionId() }),
    });
    const json = (await res.json().catch(() => null)) as {
      redirectTo?: string;
      partnerPortal?: boolean;
      error?: string;
    } | null;
    setLoading(false);
    if (!res.ok) {
      const msg = backendErrorMessage(json) ?? "Connexion impossible";
      setError(
        json?.partnerPortal
          ? `${msg} → utilisez l'espace partenaire.`
          : msg,
      );
      return;
    }
    if (isInternalAnalyticsEmail(email)) setInternalAnalyticsCookieClient();
    router.replace(redirectTo);
  }

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Connectez-vous à votre compte"
      backHref="/"
      backLabel="Découvrir Flowo sans se connecter"
    >
      <OAuthErrorAnalyticsCapture
        authError={authError}
        errorCode={oauthErrorCode}
        errorMessage={oauthErrorMessage}
      />
      {authDisabled ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          Connexion indisponible : configurez{" "}
          <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
          <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> sur Vercel, ou{" "}
          <code className="rounded bg-black/30 px-1">BACKEND_URL</code> pour le mode FastAPI local.
        </p>
      ) : null}

      {authError ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Connexion Google interrompue. Réessayez ou utilisez votre e-mail et mot de passe.
        </p>
      ) : null}

      {passwordResetOk ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
          Mot de passe réinitialisé. Tu peux te connecter avec ton nouveau mot de passe.
        </p>
      ) : null}

      {registrationPending ? (
        <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100">
          {registrationMessage ??
            "Compte créé. Consultez votre boîte e-mail et cliquez sur le lien de confirmation avant de vous connecter."}
        </p>
      ) : null}

      {accountDeleted ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
          Votre compte a été supprimé.
        </p>
      ) : null}

      {noCrmAccount ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          Ce compte n&apos;a pas d&apos;accès CRM.{" "}
          <Link href="/partenaire/connexion" className="font-medium text-violet-600 hover:underline dark:text-violet-400">
            Utilisez l&apos;espace partenaire
          </Link>{" "}
          ou{" "}
          <Link href="/register" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            créez un compte artisan
          </Link>
          .
        </p>
      ) : null}

      {!authDisabled ? (
        <>
          <GoogleAuthButton mode="login" redirectTo={redirectTo} />
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2a2d3a]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-400 dark:bg-gray-900">ou</span>
            </div>
          </div>
        </>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      ) : null}

      <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-300">
            Email <span className="text-blue-500">*</span>
          </label>
          <AuthInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={emailFieldAnalytics.onFocus}
            onBlur={emailFieldAnalytics.onBlur}
            placeholder="votre@email.fr"
            required
            disabled={authDisabled}
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
            Mot de passe <span className="text-blue-500">*</span>
          </label>
          <div className="relative">
            <AuthInput
              id="password"
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={passwordFieldAnalytics.onFocus}
              onBlur={passwordFieldAnalytics.onBlur}
              placeholder="••••••••"
              required
              disabled={authDisabled}
              className="w-full pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              aria-label={isPasswordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className="pt-2"
        >
          <AuthButton
            type="submit"
            disabled={loading || authDisabled}
            className={cn(
              "relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2 text-white transition-all duration-300 hover:from-blue-500 hover:to-indigo-500",
              isHovered ? "shadow-lg shadow-blue-500/25" : "",
            )}
          >
            <span className="relative z-10 flex items-center justify-center">
              {loading ? "Connexion…" : "Se connecter"}
              {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </span>
            {isHovered ? (
              <motion.span
                initial={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                style={{ filter: "blur(8px)" }}
              />
            ) : null}
          </AuthButton>
        </motion.div>

        <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm">
          <Link href="/forgot-password" className="text-blue-500 transition-colors hover:text-blue-400">
            Mot de passe oublié ?
          </Link>
          <span className="text-gray-500">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-blue-500 hover:text-blue-400">
              Créer un compte artisan
            </Link>
          </span>
          <span className="text-gray-500">
            Partenaire affilié ?{" "}
            <Link href="/partenaire/connexion" className="text-violet-500 hover:text-violet-400">
              Connexion espace partenaire
            </Link>
          </span>
        </div>
      </form>
    </AuthShell>
  );
}

function backendErrorMessage(json: unknown) {
  if (!json || typeof json !== "object") return null;
  const rec = json as Record<string, unknown>;
  return typeof rec.error === "string" ? rec.error : null;
}
