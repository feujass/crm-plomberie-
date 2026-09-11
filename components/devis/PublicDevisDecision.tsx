"use client";

import { Button } from "@/components/ui/Button";
import { cx, focusRing } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  token: string;
  initialStatut: string;
  numero: string;
  peutRepondre: boolean;
  initialIntent?: "accepte" | "refuse" | null;
};

export function PublicDevisDecision({ token, initialStatut, numero, peutRepondre, initialIntent = null }: Props) {
  const router = useRouter();
  const [statut, setStatut] = useState(initialStatut);
  const [pending, setPending] = useState<"accepte" | "refuse" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intentHint, setIntentHint] = useState<"accepte" | "refuse" | null>(initialIntent);

  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!initialIntent || statut !== "envoye" || !peutRepondre) return;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [initialIntent, statut, peutRepondre]);

  async function decide(decision: "accepte" | "refuse") {
    if (pending) return;
    if (decision === "refuse") {
      const ok = window.confirm("Confirmez-vous le refus de ce devis ?");
      if (!ok) return;
    }

    setError(null);
    setPending(decision);
    try {
      const res = await fetch(`/api/public/devis/${encodeURIComponent(token)}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; statut?: string; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Réponse impossible pour le moment.");
        return;
      }
      setStatut(json.statut ?? decision);
      setIntentHint(null);
      router.refresh();
    } catch {
      setError("Connexion impossible. Réessayez dans un instant.");
    } finally {
      setPending(null);
    }
  }

  if (statut === "accepte") {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <p className="mt-3 text-lg font-semibold text-emerald-900 dark:text-emerald-100">Devis accepté</p>
        <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
          Merci — votre réponse pour le devis <strong>{numero}</strong> a bien été enregistrée. L&apos;artisan sera prévenu.
        </p>
      </div>
    );
  }

  if (statut === "refuse") {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-900/60">
        <XCircle className="mx-auto size-10 text-slate-500" aria-hidden />
        <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Devis refusé</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Votre refus pour le devis <strong>{numero}</strong> a été transmis.
        </p>
      </div>
    );
  }

  if (!peutRepondre || statut !== "envoye") {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className="mt-8 rounded-2xl border border-[color:var(--primary)]/20 bg-white p-5 shadow-sm dark:border-[color:var(--primary)]/25 dark:bg-slate-900"
    >
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Votre réponse</h2>
      {intentHint === "accepte" ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          Vous souhaitez accepter ce devis — confirmez ci-dessous pour valider.
        </p>
      ) : null}
      {intentHint === "refuse" ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Vous souhaitez refuser ce devis — confirmez ci-dessous pour transmettre votre réponse.
        </p>
      ) : null}
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Vous pouvez accepter ou refuser ce devis en ligne. L&apos;artisan sera notifié immédiatement.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          className={cx("min-h-11 flex-1 rounded-xl", focusRing)}
          disabled={pending !== null}
          isLoading={pending === "accepte"}
          onClick={() => void decide("accepte")}
        >
          Accepter le devis
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cx("min-h-11 flex-1 rounded-xl", focusRing)}
          disabled={pending !== null}
          isLoading={pending === "refuse"}
          onClick={() => void decide("refuse")}
        >
          Refuser
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </section>
  );
}
