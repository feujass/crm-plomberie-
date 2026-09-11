"use client";

import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/login/AuthShell";
import { AuthButton, AuthInput, cn } from "@/components/login/auth-ui";
import { PASSWORD_MIN_LENGTH } from "@/lib/security/password-policy";

export function PartnerActivateForm({ backendConfigured }: { backendConfigured: boolean }) {
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!backendConfigured) {
      setError("Activation indisponible : configuration Supabase manquante.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/partner-activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = (await res.json().catch(() => null)) as {
      error?: string;
      message?: string;
      redirectTo?: string;
      existingAccount?: boolean;
    } | null;
    setLoading(false);
    if (!res.ok) {
      setError(json?.error ?? "Activation impossible");
      return;
    }
    if (json?.message) {
      setInfo(json.message);
      if (json.redirectTo) {
        router.replace(json.redirectTo);
      }
      return;
    }
    router.replace(json?.redirectTo ?? "/partenaire");
    router.refresh();
  }

  return (
    <AuthShell
      title="Activer mon accès partenaire"
      subtitle="Créez votre mot de passe après validation de votre candidature"
      backHref="/partenaire/connexion"
      backLabel="Retour connexion partenaire"
      heroTitle="Bienvenue partenaire"
      heroSubtitle="Aucun compte CRM requis — uniquement votre espace affiliation Flowo."
    >
      {info ? (
        <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100">
          {info}
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
          {error.includes("existe déjà") ? (
            <span className="mt-2 block">
              <Link href="/partenaire/connexion" className="font-medium text-violet-600 hover:underline">
                Aller à la connexion partenaire
              </Link>
            </span>
          ) : null}
        </p>
      ) : null}

      <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-300">
            E-mail de candidature <span className="text-blue-500">*</span>
          </label>
          <AuthInput
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="meme@email.fr"
            required
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
            Choisissez un mot de passe <span className="text-blue-500">*</span>
          </label>
          <div className="relative">
            <AuthInput
              id="password"
              type={isPasswordVisible ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`Minimum ${PASSWORD_MIN_LENGTH} caractères`}
              required
              minLength={PASSWORD_MIN_LENGTH}
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
              "relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-white transition-all duration-300",
              isHovered ? "shadow-lg shadow-violet-500/25" : "",
            )}
          >
            <span className="relative z-10 flex items-center justify-center">
              {loading ? "Activation…" : "Activer mon espace partenaire"}
              {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </span>
          </AuthButton>
        </motion.div>
      </form>
    </AuthShell>
  );
}
