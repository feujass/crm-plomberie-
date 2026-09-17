export type InAppBrowserResult =
  | { isInApp: true; app: "tiktok" | "instagram" | "facebook" | "snapchat" | "linkedin" | "messenger" }
  | { isInApp: false };

type InAppApp = Extract<InAppBrowserResult, { isInApp: true }>["app"];

const IN_APP_PATTERNS: { app: InAppApp; regex: RegExp }[] = [
  { app: "tiktok", regex: /tiktok|musical_ly|bytedancewebview|trill_/i },
  { app: "instagram", regex: /instagram/i },
  { app: "facebook", regex: /fbav|fb_iab|fbios|fb4a|fban|facebook/i },
  { app: "messenger", regex: /messenger|messengerlite/i },
  { app: "snapchat", regex: /snapchat/i },
  { app: "linkedin", regex: /linkedin/i },
];

/** Détecte les webviews in-app (TikTok, Instagram, etc.). */
export function isInAppBrowser(userAgent?: string | null): InAppBrowserResult {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (!ua.trim()) return { isInApp: false };

  for (const { app, regex } of IN_APP_PATTERNS) {
    if (regex.test(ua)) return { isInApp: true, app };
  }

  return { isInApp: false };
}

export function inAppSourceName(app: string): string {
  return `inapp_${app}`;
}
