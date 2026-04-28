"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LogoUploadField } from "@/components/onboarding/LogoUploadField";
import Link from "next/link";
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

export function OnboardingStep1Form() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        const body = {
          prenom: String(fd.get("prenom") || "").trim(),
          nom: String(fd.get("nom") || "").trim(),
          entreprise_nom: String(fd.get("entreprise_nom") || "").trim(),
          logo_url: (fd.get("logo_url") as string) || null,
          siret: String(fd.get("siret") || "").trim(),
          adresse: String(fd.get("adresse") || "").trim(),
          tel: String(fd.get("tel") || "").trim(),
          email_facturation: String(fd.get("email_facturation") || "").trim(),
        };
        try {
          const res = await fetch("/api/onboarding/step-1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const ct = res.headers.get("content-type") ?? "";
          const json = ct.includes("json") ? ((await res.json()) as { redirect?: string; message?: string }) : {};
          _agentIngest({
            hypothesisId: "onboarding-route",
            location: "OnboardingClientForms:step1",
            message: "step-1 resp",
            data: { ok: res.ok, status: res.status, ct, redirect: json.redirect ?? null },
          });

          if (!res.ok) {
            setErr(json.message ?? `Erreur ${res.status}`);
            return;
          }
          const r = typeof json.redirect === "string" ? json.redirect : "/onboarding/step-2";
          router.push(r);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <Input label="Prénom" name="prenom" />
      <Input label="Nom" name="nom" />
      <Input label="Nom de l'entreprise" name="entreprise_nom" required />
      <LogoUploadField />
      <Input label="SIRET" name="siret" />
      <Input label="Adresse" name="adresse" />
      <Input label="Téléphone" name="tel" type="tel" />
      <Input label="Email de facturation" name="email_facturation" type="email" />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "…" : "Continuer"}
        </Button>
      </div>
    </form>
  );
}

export function OnboardingStep1Footer() {
  return (
    <p className="mt-4 text-center text-sm">
      <Link href="/login" className="text-sky-600 hover:underline">
        Déconnexion
      </Link>
    </p>
  );
}

export function OnboardingStep2Form() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        const body = {
          tva_defaut: Number(fd.get("tva_defaut") || 10),
          sep_fourniture_pose: fd.get("sep_fourniture_pose") === "on",
          structure_devis: String(fd.get("structure_devis") || "libre"),
          mention_legale: String(fd.get("mention_legale") || "").trim() || null,
          conditions_paiement_defaut: String(fd.get("conditions_paiement_defaut") || "").trim() || null,
        };
        try {
          const res = await fetch("/api/onboarding/step-2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = (await res.json().catch(() => ({}))) as { redirect?: string; message?: string };
          if (!res.ok) {
            setErr(json.message ?? `Erreur ${res.status}`);
            return;
          }
          const r = typeof json.redirect === "string" ? json.redirect : "/onboarding/step-3";
          router.push(r);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        TVA par défaut (%)
        <select
          name="tva_defaut"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
          defaultValue="10"
        >
          <option value="5.5">5,5 %</option>
          <option value="10">10 %</option>
          <option value="20">20 %</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="sep_fourniture_pose" className="rounded border-gray-300" />
        Séparer fourniture et pose
      </label>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Structure des lignes
        <select
          name="structure_devis"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
          defaultValue="libre"
        >
          <option value="piece">Par pièce</option>
          <option value="type_travaux">Par type de travaux</option>
          <option value="libre">Libre</option>
        </select>
      </label>
      <Textarea label="Mentions légales personnalisées" name="mention_legale" rows={4} />
      <Textarea label="Conditions de paiement par défaut" name="conditions_paiement_defaut" rows={3} />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "…" : "Continuer"}
        </Button>
        <Link
          href="/onboarding/step-1"
          className="touch-target inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Retour
        </Link>
      </div>
    </form>
  );
}

export function OnboardingStep3Forms() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [which, setWhich] = useState<null | "examples" | "skip">(null);

  async function run(mode: "examples" | "skip") {
    setErr(null);
    setWhich(mode);
    try {
      const res = await fetch("/api/onboarding/step-3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = (await res.json().catch(() => ({}))) as { redirect?: string; message?: string };
      if (!res.ok) {
        setErr(json.message ?? `Erreur ${res.status}`);
        return;
      }
      router.push(typeof json.redirect === "string" ? json.redirect : "/accueil");
      router.refresh();
    } finally {
      setWhich(null);
    }
  }

  return (
    <div className="space-y-3">
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Button
            type="button"
            className="w-full"
            disabled={which !== null}
            onClick={() => void run("examples")}
          >
            {which === "examples" ? "…" : "Démarrer avec ces exemples"}
          </Button>
        </div>
        <div className="flex-1">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={which !== null}
            onClick={() => void run("skip")}
          >
            {which === "skip" ? "…" : "Passer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
