"use client";

import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthShell } from "@/components/login/AuthShell";
import { AuthButton, AuthInput, cn } from "@/components/login/auth-ui";
import { PASSWORD_MIN_LENGTH } from "@/lib/security/password-policy";
import { cleanRecoveryUrl, establishRecoverySession } from "@/lib/supabase/recovery-client";

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const urlError = searchParams.get("error")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [error, setError] = useState<string | null>(urlError || null);
  const [loading, setLoading] = useState(false);
  const [supabaseRecovery, setSupabaseRecovery] = useState<boolean | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (token) {
      setSupabaseRecovery(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const result = await establishRecoverySession(window.location.search, window.location.hash);
      if (cancelled) return;

      if (result.ok) {
        if (result.method !== "session") {
          cleanRecoveryUrl("/reset-password");
        }
        setSupabaseRecovery(true);
        return;
      }

      setSupabaseRecovery(false);
      if (result.error) {
        setError(result.error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token && supabaseRecovery === false) {
      setError("Lien incomplet ou expiré. Redemande un e-mail depuis « Mot de passe oublié ».");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`);
      return;
    }
    if (password !== password2) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      if (token) {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          setError(typeof json?.error === "string" ? json.error : "Réinitialisation impossible");
          return;
        }
      } else {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message);
          return;
        }
        await supabase.auth.signOut();
      }
      router.replace("/login?reset=1");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = Boolean(token || supabaseRecovery);
  const checkingSession = !token && supabaseRecovery === null;

  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe sécurisé pour votre compte"
      backHref="/login"
      backLabel="Retour connexion"
    >
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      ) : null}
      {checkingSession ? (
        <p className="mb-4 text-sm text-gray-500">Vérification du lien…</p>
      ) : !canSubmit ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          Lien invalide ou expiré.{" "}
          <Link href="/forgot-password" className="font-medium text-blue-400 underline">
            Demander un nouveau lien
          </Link>
          .
        </p>
      ) : null}

      <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
            Nouveau mot de passe <span className="text-blue-500">*</span>
          </label>
          <div className="relative">
            <AuthInput
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              disabled={!canSubmit || checkingSession}
              className="w-full pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="password2" className="mb-1 block text-sm font-medium text-gray-300">
            Confirmer le mot de passe <span className="text-blue-500">*</span>
          </label>
          <div className="relative">
            <AuthInput
              id="password2"
              name="password2"
              type={showPassword2 ? "text" : "password"}
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              disabled={!canSubmit || checkingSession}
              className="w-full pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
              onClick={() => setShowPassword2(!showPassword2)}
              aria-label={showPassword2 ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword2 ? <EyeOff size={18} /> : <Eye size={18} />}
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
            disabled={loading || !canSubmit || checkingSession}
            className={cn(
              "relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2 text-white transition-all duration-300 hover:from-blue-500 hover:to-indigo-500",
              isHovered ? "shadow-lg shadow-blue-500/25" : "",
            )}
          >
            <span className="relative z-10 flex items-center justify-center">
              {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
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
      </form>
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<div className="relative flex min-h-dvh items-center justify-center text-gray-400">Chargement…</div>}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
