import type { BackendProfile } from "@/types/backend";

/** SIRET fictifs connus (démo, tests, onboarding incomplet). */
const PLACEHOLDER_SIRETS = new Set([
  "12345432345676",
  "12345678901234",
  "12345678900012",
  "00000000000000",
]);

export type LegalExportCheck = {
  ok: boolean;
  missing: string[];
  message: string;
};

export function checkLegalExportReady(profile: BackendProfile | undefined): LegalExportCheck {
  const missing: string[] = [];
  const p = profile ?? {};

  const siret = (p.siret ?? "").replace(/\D/g, "");
  if (siret.length !== 14 || PLACEHOLDER_SIRETS.has(siret)) {
    missing.push("SIRET valide (14 chiffres)");
  }

  if (!String(p.entreprise ?? "").trim()) {
    missing.push("Raison sociale / nom d'entreprise");
  }

  if (!String(p.adresse ?? "").trim()) {
    missing.push("Adresse de l'entreprise");
  }

  if (!String(p.decennale_mention ?? "").trim()) {
    missing.push("Assurance décennale (mention sur le devis)");
  }

  const ok = missing.length === 0;
  const message = ok
    ? ""
    : `Informations légales incomplètes : ${missing.join(", ")}. Complète ton profil entreprise (Compte) avant d'envoyer ou d'exporter le devis.`;

  return { ok, missing, message };
}
