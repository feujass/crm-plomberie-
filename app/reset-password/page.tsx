"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Lien incomplet : il manque le jeton dans l’URL. Redemande un e-mail depuis « Mot de passe oublié ».");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== password2) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
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
      router.replace("/login?reset=1");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {!token ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Lien invalide ou expiré.{" "}
          <Link href="/forgot-password" className="font-medium underline">
            Demander un nouveau lien
          </Link>
          .
        </p>
      ) : null}
      <Input
        label="Nouveau mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />
      <Input
        label="Confirmer le mot de passe"
        name="password2"
        type="password"
        autoComplete="new-password"
        value={password2}
        onChange={(e) => setPassword2(e.target.value)}
        required
        minLength={6}
      />
      <Button type="submit" className="w-full" disabled={loading || !token}>
        {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-gray-50">Nouveau mot de passe</h1>
      <Suspense fallback={<p className="text-center text-sm text-gray-500">Chargement…</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <Link href="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-500">
          Retour connexion
        </Link>
      </p>
    </div>
  );
}
