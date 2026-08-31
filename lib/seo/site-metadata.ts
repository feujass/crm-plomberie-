import type { Metadata } from "next";

export const SITE_URL = "https://flowo.agency";

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Flowo — Le CRM et devis vocal des plombiers | Devis en 30 secondes",
    template: "%s | Flowo",
  },
  description:
    "Dicte ton chantier à voix haute, Zeus rédige le devis, calcule les totaux et l'envoie à ton client en moins de 30 secondes. CRM, facturation conforme 2026. Essai gratuit sans carte bancaire.",
  keywords: [
    "logiciel devis plombier",
    "CRM artisan",
    "devis vocal",
    "facturation électronique 2026",
    "logiciel plomberie",
    "devis BTP",
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "Flowo",
    title: "Le CRM fait pour les plombiers qui n'ont pas le temps de taper",
    description:
      "Parle de ton chantier à voix haute. Zeus rédige le devis et l'envoie à ton client en moins de 30 secondes. Essai gratuit, sans carte bancaire.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Flowo — devis vocal pour plombiers" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Le CRM fait pour les plombiers qui n'ont pas le temps de taper",
    description: "Devis vocal en 30 secondes. Essai gratuit sans carte bancaire.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export function pageMetadata({
  title,
  description,
  path,
  noIndex,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Flowo — devis vocal pour plombiers" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
