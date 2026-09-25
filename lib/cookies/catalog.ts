export type CookieCategory = "essential" | "analytics";

export type CookieDefinition = {
  name: string;
  category: CookieCategory;
  purpose: string;
  duration: string;
  provider: string;
};

export const COOKIE_CATEGORIES: Record<
  CookieCategory,
  { label: string; description: string; required: boolean }
> = {
  essential: {
    label: "Cookies essentiels",
    description:
      "Indispensables au fonctionnement de Flowo (connexion, sécurité, préférences d'interface). Ils ne nécessitent pas votre consentement.",
    required: true,
  },
  analytics: {
    label: "Cookies analytiques",
    description:
      "Nous aident à comprendre l'utilisation de Flowo (pages visitées, parcours) pour améliorer le produit. Activés uniquement avec votre accord.",
    required: false,
  },
};

/** Liste indicative — les noms exacts peuvent varier selon le navigateur ou le fournisseur. */
export const COOKIE_CATALOG: CookieDefinition[] = [
  {
    name: "access_token / sb-*-auth-token",
    category: "essential",
    purpose: "Maintien de votre session de connexion",
    duration: "7 à 30 jours",
    provider: "Flowo / Supabase",
  },
  {
    name: "sidebar:state",
    category: "essential",
    purpose: "Mémorisation de l'état du menu latéral (ouvert / fermé)",
    duration: "Session",
    provider: "Flowo",
  },
  {
    name: "flowo_pending_checkout",
    category: "essential",
    purpose: "Reprise du parcours d'abonnement Stripe après inscription",
    duration: "Quelques heures",
    provider: "Flowo",
  },
  {
    name: "flowo_cookie_consent",
    category: "essential",
    purpose: "Enregistrement de vos choix en matière de cookies",
    duration: "12 mois",
    provider: "Flowo",
  },
  {
    name: "flowo_analytics_session_id (localStorage)",
    category: "essential",
    purpose: "Identifiant de session anonyme pour mesurer les parcours (pages vues, sorties) — sans lien compte utilisateur",
    duration: "Persistant jusqu'à suppression navigateur",
    provider: "Flowo",
  },
  {
    name: "ph_* / posthog",
    category: "analytics",
    purpose: "Mesure d'audience et statistiques d'utilisation (PostHog)",
    duration: "Jusqu'à 12 mois",
    provider: "PostHog (UE si configuré)",
  },
];

export const DATA_SUBPROCESSORS = [
  { name: "Supabase", role: "Authentification, base de données, stockage fichiers", location: "UE / USA (selon région projet)" },
  { name: "Vercel", role: "Hébergement de l'application web", location: "UE / USA" },
  { name: "Stripe", role: "Paiements et abonnements", location: "UE / USA" },
  { name: "Resend", role: "Envoi d'e-mails transactionnels", location: "USA" },
  { name: "Twilio", role: "Notifications SMS et WhatsApp (si activées)", location: "USA" },
  { name: "OpenAI / Anthropic", role: "Génération de devis et assistant Zeus (IA)", location: "USA" },
  { name: "PostHog", role: "Statistiques d'utilisation (avec consentement)", location: "UE (recommandé)" },
] as const;

export const DATA_RETENTION = [
  { type: "Compte et données métier actives", duration: "Durée du contrat + suppression à la demande" },
  { type: "Factures et pièces comptables", duration: "6 ans minimum (obligation légale française)" },
  { type: "Données clients saisies par l'artisan", duration: "Supprimées avec le compte artisan (sauf obligations légales)" },
  { type: "Enregistrements vocaux (devis IA)", duration: "Jusqu'à génération du devis ou suppression du compte" },
  { type: "Logs techniques et sécurité", duration: "12 mois maximum" },
  { type: "Données analytiques PostHog", duration: "12 mois (configurable)" },
  { type: "Événements parcours anonymes (analytics_events)", duration: "12 mois maximum" },
] as const;
