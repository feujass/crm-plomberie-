"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevLink(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-gray-50">Mot de passe oublié</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}
        {devLink ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">Mode développement</p>
            <p className="mt-1">Aucun e-mail configuré (Resend) : ouvre ce lien pour définir un nouveau mot de passe.</p>
            <a href={devLink} className="mt-2 block break-all font-mono text-[11px] text-blue-700 underline dark:text-blue-400">
              {devLink}
            </a>
          </div>
        ) : null}
        <Input label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Envoi…" : "Recevoir le lien"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <Link href="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-500">
          Retour connexion
        </Link>
      </p>
    </div>
  );
}
