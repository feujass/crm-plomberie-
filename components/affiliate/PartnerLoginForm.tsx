"use client";

import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/login/AuthShell";
import { AuthButton, AuthInput, cn } from "@/components/login/auth-ui";

export function PartnerLoginForm({
  backendConfigured,
  passwordResetOk = false,
}: {
  backendConfigured: boolean;
  passwordResetOk?: boolean;
}) {
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!backendConfigured) {
      setError("Connexion indisponible : configuration Supabase manquante.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/partner-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = (await res.json().catch(() => null)) as { error?: string; redirectTo?: string } | null;
    setLoading(false);
    if (!res.ok) {
      setError(json?.error ?? "Connexion impossible");
      return;
    }
    router.replace(json?.redirectTo ?? "/partenaire");
    router.refresh();
  }

  return (
    <AuthShell
      title="Espace partenaire"
      subtitle="Connectez-vous à votre tableau de bord affiliation"
      backHref="/affiliation"
      backLabel="Retour au programme partenaire"
      heroTitle="Programme partenaire"
      heroSubtitle="Suivez vos parrainages, commissions et liens de recommandation — sans accéder au CRM artisan."
    >
      {passwordResetOk ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
          Mot de passe réinitialisé. Tu peux te connecter.
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-300">
            E-mail partenaire <span className="text-blue-500">*</span>
          </label>
          <AuthInput
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.fr"
            required
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
              type={isPasswordVisible ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
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
            disabled={loading}
            className={cn(
              "relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-white transition-all duration-300 hover:from-violet-500 hover:to-indigo-500",
              isHovered ? "shadow-lg shadow-violet-500/25" : "",
            )}
          >
            <span className="relative z-10 flex items-center justify-center">
              {loading ? "Connexion…" : "Accéder à mon espace partenaire"}
              {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </span>
          </AuthButton>
        </motion.div>

        <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm">
          <Link href="/forgot-password?from=partenaire" className="text-violet-500 transition-colors hover:text-violet-400">
            Mot de passe oublié ?
          </Link>
          <span className="text-gray-500">
            Première connexion après validation ?{" "}
            <Link href="/partenaire/activer" className="text-violet-500 hover:text-violet-400">
              Activer mon accès
            </Link>
          </span>
          <span className="text-gray-500">
            Compte artisan Flowo ?{" "}
            <Link href="/login" className="text-blue-500 hover:text-blue-400">
              Connexion CRM
            </Link>
          </span>
        </div>
      </form>
    </AuthShell>
  );
}
