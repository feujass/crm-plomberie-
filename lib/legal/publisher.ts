import { APP_NAME, CONTACT_EMAIL } from "@/lib/app-branding";

/** Hébergeur du site web (LCEN art. 6 III 2°) — déploiement Next.js sur Vercel. */
export const LEGAL_HOSTING = {
  name: "Vercel Inc.",
  address: "440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis",
  website: "https://vercel.com",
} as const;

export type LegalPublisher = {
  companyName: string;
  legalForm?: string;
  siret: string;
  address: string;
  director?: string;
  email: string;
};

function env(key: string): string {
  return process.env[key]?.trim() ?? "";
}

/** Identité de l'éditeur — renseigner via NEXT_PUBLIC_LEGAL_* dans .env.local / Vercel. */
export function getLegalPublisher(): LegalPublisher | null {
  const companyName = env("NEXT_PUBLIC_LEGAL_COMPANY_NAME");
  const siret = env("NEXT_PUBLIC_LEGAL_SIRET").replace(/\s/g, "");
  const address = env("NEXT_PUBLIC_LEGAL_ADDRESS");

  if (!companyName || siret.length !== 14 || !/^\d{14}$/.test(siret) || !address) {
    return null;
  }

  return {
    companyName,
    legalForm: env("NEXT_PUBLIC_LEGAL_LEGAL_FORM") || undefined,
    siret,
    address,
    director: env("NEXT_PUBLIC_LEGAL_DIRECTOR") || undefined,
    email: CONTACT_EMAIL,
  };
}

export function formatSiret(siret: string): string {
  const d = siret.replace(/\D/g, "");
  if (d.length !== 14) return siret;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9, 14)}`;
}

export function isLegalPublisherConfigured(): boolean {
  return getLegalPublisher() !== null;
}

export function legalPublisherLabel(): string {
  const p = getLegalPublisher();
  if (!p) return APP_NAME;
  return p.legalForm ? `${p.companyName} (${p.legalForm})` : p.companyName;
}
