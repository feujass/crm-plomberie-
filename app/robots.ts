import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/accueil",
        "/devis/",
        "/clients",
        "/catalogue",
        "/facturation",
        "/compte",
        "/admin/",
        "/devis/public/",
        "/partenaire/",
        "/onboarding/",
        "/assistant",
        "/rentabilite",
        "/parametres",
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
