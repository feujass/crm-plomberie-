import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { AnalyticsProvider } from "@/components/legal/AnalyticsProvider";
import { ClientFetchInstrumentation } from "@/components/debug/ClientFetchInstrumentation";
import { ChunkLoadAutoReload } from "@/components/debug/ChunkLoadAutoReload";
import { DebugImgPing } from "@/components/debug/DebugImgPing";
import { DebugRootLayoutVisit } from "@/components/debug/DebugRootLayoutVisit";
import { SupabaseRecoveryBootstrap } from "@/components/auth/SupabaseRecoveryBootstrap";
import { ForceLightThemeScript } from "@/components/providers/ForceLightThemeScript";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { loggingEnabled } from "@/lib/debug-session-append";
import Script from "next/script";
import { APP_NAME } from "@/lib/app-branding";
import { siteMetadata } from "@/lib/seo/site-metadata";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  ...siteMetadata,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  manifest: "/manifest.webmanifest",
  icons: [{ rel: "apple-touch-icon", url: "/zeus-avatar.png" }],
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#fafafa" },
  ],
};

/** Debug session : exécuter le root layout à chaque requête HTTP (pas de cache shell) pour `server-root-layout-hit` NDJSON. */
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const dbg = loggingEnabled();
  return (
    <html lang="fr" className="light" suppressHydrationWarning style={{ colorScheme: "light only" }}>
      <body className="min-h-dvh antialiased bg-[var(--background)] text-gray-900" style={{ colorScheme: "light only" }}>
        <ForceLightThemeScript />
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
        <SupabaseRecoveryBootstrap />
        <ThemeProvider>
          {children}
          <CookieConsentBanner />
          <AnalyticsProvider />
          <AnalyticsTracker />
        </ThemeProvider>
      </body>
    </html>
  );
}
