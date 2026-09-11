"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/login/AuthShell";
import { AuthButton, AuthInput, cn } from "@/components/login/auth-ui";

export function ForgotPasswordForm({ context = "crm" }: { context?: "crm" | "partenaire" }) {
  const isPartner = context === "partenaire";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [devNote, setDevNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevLink(null);
    setDevNote(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, origin: window.location.origin }),
      });
      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Demande impossible");
        return;
      }
      if (typeof json?.message === "string") {
        setMessage(json.message);
      } else {
        setMessage("Si un compte existe, un e-mail de réinitialisation a été envoyé.");
      }
      if (typeof json?.dev_reset_url === "string") {
        setDevLink(json.dev_reset_url);
      }
      if (typeof json?.dev_note === "string") {
        setDevNote(json.dev_note);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Entrez votre e-mail pour recevoir un lien de réinitialisation"
      backHref={isPartner ? "/partenaire/connexion" : "/login"}
      backLabel={isPartner ? "Retour connexion partenaire" : "Retour connexion CRM"}
      heroTitle={isPartner ? "Programme partenaire" : undefined}
      heroSubtitle={isPartner ? "Réinitialisez le mot de passe de votre espace affiliation." : undefined}
    >
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      ) : null}
      {message ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">{message}</p>
      ) : null}
      {devNote ? (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          <p>{devNote}</p>
        </div>
      ) : null}
      {devLink ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-semibold">Mode développement — lien direct</p>
          <p className="mt-1">Utilise ce lien pour tester sans attendre l’e-mail (valable ~1 h).</p>
          <a href={devLink} className="mt-2 block break-all font-mono text-[11px] text-blue-400 underline">
            {devLink}
          </a>
        </div>
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
            placeholder="votre@email.fr"
            required
            className="w-full"
          />
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
              "relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2 text-white transition-all duration-300 hover:from-blue-500 hover:to-indigo-500",
              isHovered ? "shadow-lg shadow-blue-500/25" : "",
            )}
          >
            <span className="relative z-10 flex items-center justify-center">
              {loading ? "Envoi…" : "Recevoir le lien"}
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

        <p className="text-center text-sm text-gray-500">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-blue-500 hover:text-blue-400">
            Créer un compte
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
