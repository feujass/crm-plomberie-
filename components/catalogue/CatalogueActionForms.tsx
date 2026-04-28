"use client";

import { cx, focusRing } from "@/lib/utils";
import type { BackendDevis } from "@/types/backend";
import { useRouter } from "next/navigation";
import { useState } from "react";

// #region agent log
const _agentIngest = (payload: Record<string, unknown>) =>
  fetch("http://127.0.0.1:7491/ingest/2e2dbe90-bece-4fb6-a37a-f62acd64652c", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0f238e" },
    body: JSON.stringify({ sessionId: "0f238e", timestamp: Date.now(), ...payload }),
  }).catch(() => {});
// #endregion

export function ImportFromDevisFormClient({
  devisSelect,
  className,
}: {
  devisSelect: BackendDevis[];
  className?: string;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        const fd = new FormData(e.currentTarget);
        const devis_id = String(fd.get("devis_id") || "").trim();
        if (!devis_id) {
          setErr("Choisissez un devis");
          return;
        }
        setPending(true);
        try {
          const res = await fetch("/api/catalogue/import-from-devis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ devis_id }),
          });
          const ct = res.headers.get("content-type") ?? "";
          let body: Record<string, unknown> = {};
          try {
            body = res.headers.get("content-type")?.includes("json") ? ((await res.json()) as Record<string, unknown>) : {};
          } catch {
            body = {};
          }
          _agentIngest({
            hypothesisId: "catalogue-fetch",
            location: "CatalogueActionForms.tsx:ImportFromDevis",
            message: "import-from-devis response",
            data: { ok: res.ok, ct, status: res.status, redirect: typeof body.redirect === "string" ? body.redirect : null },
          });

          if (!res.ok) {
            const message = typeof body.message === "string" ? body.message : `Erreur ${res.status}`;
            setErr(message);
            return;
          }
          const redirect = typeof body.redirect === "string" ? body.redirect : "/catalogue";
          router.push(redirect);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="block flex-1 text-xs font-medium text-slate-600 dark:text-slate-400">
        Devis source
        <select
          name="devis_id"
          required
          disabled={pending}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">Choisir un devis…</option>
          {devisSelect.map((d) => (
            <option key={d.id} value={d.id}>
              {d.numero}
            </option>
          ))}
        </select>
      </label>
      {err ? (
        <p className="shrink-0 text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={cx(
          "rounded-full border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-slate-50/80 hover:text-[color:var(--primary)] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/75 disabled:opacity-60",
          focusRing,
        )}
      >
        {pending ? "…" : "Importer les lignes"}
      </button>
    </form>
  );
}

export function SeedExamplesButton() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div>
      {err ? <p className="mb-2 text-sm text-red-600">{err}</p> : null}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setPending(true);
          try {
            const res = await fetch("/api/catalogue/seed-defaults", { method: "POST" });
            let body: Record<string, unknown> = {};
            try {
              body = res.headers.get("content-type")?.includes("json")
                ? ((await res.json()) as Record<string, unknown>)
                : {};
            } catch {
              body = {};
            }

            _agentIngest({
              hypothesisId: "catalogue-fetch",
              location: "CatalogueActionForms.tsx:SeedExamples",
              message: "seed-defaults response",
              data: {
                ok: res.ok,
                ct: res.headers.get("content-type"),
                status: res.status,
                redirect: typeof body.redirect === "string" ? body.redirect : null,
              },
            });

            if (!res.ok) {
              const message = typeof body.message === "string" ? body.message : `Erreur ${res.status}`;
              setErr(message);
              return;
            }
            const redirect = typeof body.redirect === "string" ? body.redirect : "/catalogue";
            router.push(redirect);
            router.refresh();
          } finally {
            setPending(false);
          }
        }}
      >
        <button
          type="submit"
          disabled={pending}
          className={cx(
            "w-full rounded-full bg-[color:var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 sm:w-auto disabled:opacity-60",
            focusRing,
          )}
        >
          {pending ? "…" : "Démarrer avec ces exemples"}
        </button>
      </form>
    </div>
  );
}
