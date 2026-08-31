/** Nom produit affiché dans l’UI (web). */
export const APP_NAME = "Flowo";

export const APP_DESCRIPTION = "CRM et devis pour artisans";

/** E-mail de contact / support affiché (footer, mentions légales, équipe). */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "contact@flowo.agency";

/** Picto seul (PNG carré, fond transparent). Fichier : `public/flowo-logo-mark.png`. */
export const APP_LOGO_MARK_SRC = "/flowo-logo-mark.png";
