import { ClientFetchInstrumentation } from "@/components/debug/ClientFetchInstrumentation";
import { ChunkLoadAutoReload } from "@/components/debug/ChunkLoadAutoReload";
import { DebugImgPing } from "@/components/debug/DebugImgPing";
import { DebugRootLayoutVisit } from "@/components/debug/DebugRootLayoutVisit";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { loggingEnabled } from "@/lib/debug-session-append";
import Script from "next/script";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-branding";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  manifest: "/manifest.webmanifest",
  icons: [{ rel: "apple-touch-icon", url: "/zeus-avatar.png" }],
};

/** Debug session : exécuter le root layout à chaque requête HTTP (pas de cache shell) pour `server-root-layout-hit` NDJSON. */
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const dbg = loggingEnabled();
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-dvh antialiased bg-[var(--background)] text-gray-900 dark:bg-gray-950 dark:text-gray-50">
        {dbg ? (
          // #region agent log — preuve JS avant hydrate (compare à `instrument-mount`)
          <Script id="crm-debug-inline-boot-v1" strategy="beforeInteractive">{`
(function(){try{var p=typeof location!=="undefined"?location.pathname:"";
fetch(location.origin+"/api/debug/session-log?inlineboot=v1&p="+encodeURIComponent(p)+"&t="+Date.now(),{credentials:"include",cache:"no-store"}).catch(function(){});}catch(_e){}})();
          `}</Script>
          // #endregion
        ) : null}
        <DebugRootLayoutVisit />
        <DebugImgPing />
        <ChunkLoadAutoReload />
        <ClientFetchInstrumentation />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
