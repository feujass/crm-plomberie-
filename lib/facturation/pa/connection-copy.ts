import type { ConnectionStatus } from "@/lib/facturation/pa/types";

export const CONNECTION_STATUS_COPY: Record<
  ConnectionStatus,
  { title: string; body: string; tone: "neutral" | "pending" | "ok" | "warn" | "error" }
> = {
  disconnected: {
    title: "Pas encore raccordé",
    body: "Vous pouvez générer des factures Factur-X (EN 16931 et CIUS-FR). Le dépôt auprès d’une plateforme agréée n’est pas encore actif.",
    tone: "neutral",
  },
  pending_verification: {
    title: "Raccordement en cours",
    body: "La plateforme vérifie que vous êtes bien rattaché à votre entreprise (contrôle d’identité). Cela peut prendre quelques heures. Vous n’avez rien à renvoyer : on vous préviendra ici dès que c’est validé.",
    tone: "pending",
  },
  needs_review: {
    title: "Dossier en revue",
    body: "Un écart a été détecté (par exemple un nom d’entreprise qui ne correspond pas). L’équipe Super PDP examine votre dossier. Pas d’action de votre côté pour le moment.",
    tone: "warn",
  },
  verified: {
    title: "Raccordé",
    body: "Votre entreprise est enregistrée auprès de la plateforme. Le dépôt auprès d’une plateforme agréée n’est pas encore actif.",
    tone: "ok",
  },
  failed: {
    title: "Vérification refusée",
    body: "La plateforme n’a pas pu confirmer votre rattachement à l’entreprise. Vérifiez SIREN et identité, puis reconnectez-vous. Si le problème continue, contactez le support Flowo.",
    tone: "error",
  },
  token_expired: {
    title: "Connexion expirée",
    body: "Votre autorisation a expiré. Le dépôt auprès d’une plateforme agréée n’est pas encore actif — vos factures déjà émises ne sont pas perdues.",
    tone: "warn",
  },
};
