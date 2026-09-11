import type { BackendMeResponse } from "@/types/backend";

export type ProfileCompletionState = {
  percent: number;
  missingBasic: string[];
  legalComplete: boolean;
  basicComplete: boolean;
};

function metierFilled(me: BackendMeResponse): boolean {
  const p = me.profile;
  return Boolean(String(p?.metier ?? p?.specialites ?? "").trim());
}

export function computeProfileCompletion(me: BackendMeResponse): ProfileCompletionState {
  const checks: { label: string; ok: boolean }[] = [
    { label: "Prénom", ok: Boolean(me.prenom?.trim()) },
    { label: "Nom", ok: Boolean(me.nom?.trim()) },
    { label: "Entreprise", ok: Boolean(me.profile?.entreprise?.trim()) },
    { label: "Téléphone", ok: Boolean(me.profile?.tel?.trim()) },
    { label: "Métier", ok: metierFilled(me) },
  ];

  const done = checks.filter((c) => c.ok).length;
  const missingBasic = checks.filter((c) => !c.ok).map((c) => c.label);
  const siretOk = (me.profile?.siret?.replace(/\D/g, "") ?? "").length === 14;
  const adresseOk = Boolean(me.profile?.adresse?.trim());

  return {
    percent: Math.round((done / checks.length) * 100),
    missingBasic,
    legalComplete: siretOk && adresseOk,
    basicComplete: missingBasic.length === 0,
  };
}
