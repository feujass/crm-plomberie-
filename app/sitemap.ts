import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const publicPaths = [
    "",
    "/register",
    "/login",
    "/affiliation",
    "/decouvrir",
    "/legal/cgu",
    "/legal/confidentialite",
    "/legal/mentions",
    "/legal/cookies",
    "/legal/sous-traitance",
    "/forgot-password",
  ];

  return publicPaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
