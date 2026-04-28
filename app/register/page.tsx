"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = (await res.json().catch(() => null)) as unknown;
    setLoading(false);
    if (!res.ok) {
      const msg = backendErrorMessage(json) ?? "Inscription impossible";
      setError(msg);
      return;
    }
    router.replace("/onboarding");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-gray-50">Inscription</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <Input label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Création…" : "Créer mon compte"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <Link href="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-500">
          Déjà un compte ? Connexion
        </Link>
      </p>
    </div>
  );
}

function backendErrorMessage(json: unknown) {
  if (!json || typeof json !== "object") return null;
  const rec = json as Record<string, unknown>;
  return typeof rec.error === "string" ? rec.error : null;
}
