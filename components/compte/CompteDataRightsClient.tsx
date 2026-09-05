"use client";

import { Download, Settings2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { openCookieSettings } from "@/components/legal/CookieConsentBanner";
import { Button } from "@/components/ui/Button";
import { CONTACT_EMAIL } from "@/lib/app-branding";

export function CompteDataRightsClient() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Conformément au RGPD, vous pouvez exporter vos données, gérer les cookies analytiques ou demander la
        rectification via{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-[color:var(--primary)] hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2"
          onClick={async () => {
            setError(null);
            setOk(null);
            setPending(true);
            try {
              const res = await fetch("/api/export/me", { credentials: "same-origin" });
              if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                setError(typeof (j as { message?: string }).message === "string" ? (j as { message: string }).message : `Erreur ${res.status}`);
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `flowo-export-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              setOk("Export téléchargé.");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Erreur");
            } finally {
              setPending(false);
            }
          }}
        >
          <Download className="size-4" aria-hidden />
          {pending ? "Export…" : "Télécharger mes données"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="inline-flex items-center justify-center gap-2"
          onClick={() => openCookieSettings()}
        >
          <Settings2 className="size-4" aria-hidden />
          Gérer les cookies
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {ok ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{ok}</p> : null}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        <Link href="/legal/confidentialite" className="text-[color:var(--primary)] hover:underline">
          Politique de confidentialité
        </Link>
        {" · "}
        <Link href="/legal/cookies" className="text-[color:var(--primary)] hover:underline">
          Politique cookies
        </Link>
        {" · "}
        <Link href="/legal/sous-traitance" className="text-[color:var(--primary)] hover:underline">
          Sous-traitance
        </Link>
      </p>
    </div>
  );
}
