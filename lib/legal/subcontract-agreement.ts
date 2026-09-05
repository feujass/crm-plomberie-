import { APP_NAME, CONTACT_EMAIL } from "@/lib/app-branding";
import { DATA_SUBPROCESSORS } from "@/lib/cookies/catalog";
import { legalPublisherLabel } from "@/lib/legal/publisher";

/** Données des clients finaux traitées pour le compte de l'artisan (sous-traitance). */
export const ARTISAN_CLIENT_DATA_CATEGORIES = [
  "Identité et coordonnées (nom, prénom, adresse, e-mail, téléphone)",
  "Données professionnelles (SIRET, entreprise, adresse de chantier)",
  "Contenu commercial (devis, factures, lignes, montants, conditions)",
  "Échanges relatifs aux devis (e-mails envoyés via Flowo, statuts accepté/refusé)",
] as const;

export function subprocessorsForAgreement() {
  return DATA_SUBPROCESSORS.map((row) => ({
    name: row.name,
    role: row.role,
    location: row.location,
  }));
}

export function agreementPartiesLabel() {
  return {
    processor: legalPublisherLabel(),
    product: APP_NAME,
    contact: CONTACT_EMAIL,
  };
}
