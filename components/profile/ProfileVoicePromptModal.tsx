"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { EntrepriseGouvResult } from "@/lib/entreprise/recherche-entreprises";
import { lookupEntrepriseBySiretClient } from "@/lib/entreprise/recherche-entreprises-client";
import { METIER_OPTIONS } from "@/lib/metier-options";
import { cx, focusRing } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const SKIP_KEY = "flowo_voice_profile_skipped";

export function hasSkippedVoiceProfilePrompt(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SKIP_KEY) === "1";
}

export function skipVoiceProfilePrompt(): void {
  window.localStorage.setItem(SKIP_KEY, "1");
  void fetch("/api/compte/profile-voice-prompt/skip", { method: "POST" });
}

type Props = {
  open: boolean;
  onClose: () => void;
  defaults?: {
    prenom?: string;
    nom?: string;
    tel?: string;
    entreprise?: string;
    metier?: string;
  };
  onSaved?: () => void;
};

export function ProfileVoicePromptModal({ open, onClose, defaults, onSaved }: Props) {
  const [prenom, setPrenom] = useState(defaults?.prenom ?? "");
  const [nom, setNom] = useState(defaults?.nom ?? "");
  const [tel, setTel] = useState(defaults?.tel ?? "");
  const [entreprise, setEntreprise] = useState(defaults?.entreprise ?? "");
  const [metier, setMetier] = useState(defaults?.metier ?? "artisan_btp");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPrenom(defaults?.prenom ?? "");
    setNom(defaults?.nom ?? "");
    setTel(defaults?.tel ?? "");
    setEntreprise(defaults?.entreprise ?? "");
    setMetier(defaults?.metier ?? "artisan_btp");
    setErr(null);
  }, [open, defaults]);

  if (!open) return null;

  async function save() {
    setErr(null);
    if (!prenom.trim() || !nom.trim() || !entreprise.trim() || !tel.trim()) {
      setErr("Remplis au moins prénom, nom, entreprise et téléphone.");
      return;
    }
    setBusy(true);
    try {
      const profilRes = await fetch("/api/compte/profil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom: prenom.trim(), nom: nom.trim(), tel: tel.trim() }),
      });
      if (!profilRes.ok) {
        const j = (await profilRes.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? "Erreur profil");
      }
      const entRes = await fetch("/api/compte/entreprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entreprise: entreprise.trim(),
          metier,
          specialites: METIER_OPTIONS.find((o) => o.value === metier)?.label ?? "",
        }),
      });
      if (!entRes.ok) {
        const j = (await entRes.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? "Erreur entreprise");
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  function handleSkip() {
    skipVoiceProfilePrompt();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={handleSkip}
          className={cx("absolute right-3 top-3 rounded-md p-1 text-slate-500 hover:bg-slate-100", focusRing)}
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>
        <h2 className="pr-8 text-lg font-bold text-[var(--foreground)]">Avant ton premier devis vocal</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Quelques infos pour personnaliser tes devis. Tu peux passer une fois et compléter plus tard.
        </p>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" />
            <Input label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" />
          </div>
          <Input label="Entreprise" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} autoComplete="organization" />
          <div>
            <label htmlFor="voice-metier" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Métier
            </label>
            <select
              id="voice-metier"
              className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-base shadow-sm md:text-sm dark:border-gray-800 dark:bg-gray-950"
              value={metier}
              onChange={(e) => setMetier(e.target.value)}
            >
              {METIER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Input label="Téléphone" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" />
        </div>
        {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="flex-1" disabled={busy} onClick={() => void save()}>
            {busy ? "Enregistrement…" : "Continuer"}
          </Button>
          <Button type="button" variant="secondary" className="flex-1" onClick={handleSkip}>
            Plus tard
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LegalIdentityModal({
  open,
  onClose,
  onSaved,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaults?: { siret?: string; adresse?: string; entreprise?: string };
}) {
  const [siret, setSiret] = useState(defaults?.siret ?? "");
  const [adresse, setAdresse] = useState(defaults?.adresse ?? "");
  const [entreprise, setEntreprise] = useState(defaults?.entreprise ?? "");
  const [lookupLabel, setLookupLabel] = useState<string | null>(null);
  const [lookupData, setLookupData] = useState<EntrepriseGouvResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSiret(defaults?.siret ?? "");
    setAdresse(defaults?.adresse ?? "");
    setEntreprise(defaults?.entreprise ?? "");
    setLookupLabel(null);
    setLookupData(null);
    setErr(null);
  }, [open, defaults]);

  useEffect(() => {
    const digits = siret.replace(/\D/g, "");
    if (digits.length !== 14) {
      setLookupLabel(null);
      setLookupData(null);
      return;
    }
    let cancelled = false;
    void lookupEntrepriseBySiretClient(digits).then((hit) => {
      if (cancelled || !hit) return;
      setLookupData(hit);
      if (hit.nom && !entreprise.trim()) setEntreprise(hit.nom);
      if (hit.adresse && !adresse.trim()) setAdresse(hit.adresse);
      setLookupLabel(hit.nom ? `✓ Entreprise trouvée : ${hit.nom}` : null);
    });
    return () => {
      cancelled = true;
    };
  }, [siret, adresse, entreprise]);

  if (!open) return null;

  async function save() {
    setErr(null);
    const digits = siret.replace(/\D/g, "");
    if (digits.length !== 14) {
      setErr("Le SIRET doit contenir 14 chiffres.");
      return;
    }
    if (!adresse.trim()) {
      setErr("L'adresse de ton entreprise est requise sur le PDF.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/compte/entreprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entreprise: entreprise.trim() || undefined,
          siret: digits,
          adresse: adresse.trim(),
          siren: lookupData?.siren ?? undefined,
          forme_juridique: lookupData?.forme_juridique ?? undefined,
          rcs_ville: lookupData?.rcs_ville ?? undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? "Erreur");
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Infos légales pour le PDF</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Ton SIRET et ton adresse doivent figurer sur le devis. On te les demande une seule fois.
        </p>
        <div className="mt-4 space-y-3">
          <Input label="SIRET (14 chiffres)" inputMode="numeric" value={siret} onChange={(e) => setSiret(e.target.value)} />
          {lookupLabel ? <p className="text-sm font-medium text-emerald-700">{lookupLabel}</p> : null}
          <Input label="Nom de l'entreprise" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} />
          <Input label="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} autoComplete="street-address" />
        </div>
        {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
        <div className="mt-5 flex gap-2">
          <Button type="button" className="flex-1" disabled={busy} onClick={() => void save()}>
            {busy ? "Enregistrement…" : "Enregistrer et télécharger"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
