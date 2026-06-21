import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-branding";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/accueil",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#15803d",
    lang: "fr",
    icons: [
      {
        src: "/zeus-avatar.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
