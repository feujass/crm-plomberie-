export type InAppOs = "ios" | "android" | "other";

export type InAppAppSlug =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "messenger"
  | "snapchat"
  | "linkedin";

export type InAppBrowserResult =
  | { isInApp: true; app: InAppAppSlug }
  | { isInApp: false };

export type InAppBrowserDetection = {
  isInApp: boolean;
  app: InAppAppSlug | null;
  appName: string | null;
  os: InAppOs;
};

export const IN_APP_DISPLAY_NAMES: Record<InAppAppSlug, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  messenger: "Messenger",
  snapchat: "Snapchat",
  linkedin: "LinkedIn",
};

/** Ordre : Messenger avant Facebook (UA Messenger contient souvent FBAN). */
const IN_APP_PATTERNS: { app: InAppAppSlug; regex: RegExp }[] = [
  { app: "tiktok", regex: /tiktok|musical_ly|bytedancewebview|trill/i },
  { app: "instagram", regex: /instagram/i },
  { app: "messenger", regex: /messenger/i },
  { app: "facebook", regex: /fban|fbav|fb_iab/i },
  { app: "snapchat", regex: /snapchat/i },
  { app: "linkedin", regex: /linkedinapp/i },
];

export function detectOs(userAgent: string): InAppOs {
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  return "other";
}

/** Détecte les webviews in-app (TikTok, Instagram, etc.) — pur, testable. */
export function detectInAppBrowser(userAgent?: string | null): InAppBrowserDetection {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const os = detectOs(ua);
  const empty: InAppBrowserDetection = { isInApp: false, app: null, appName: null, os };
  if (!ua.trim()) return empty;

  for (const { app, regex } of IN_APP_PATTERNS) {
    if (regex.test(ua)) {
      return { isInApp: true, app, appName: IN_APP_DISPLAY_NAMES[app], os };
    }
  }

  return empty;
}

/** Détecte les webviews in-app (TikTok, Instagram, etc.). */
export function isInAppBrowser(userAgent?: string | null): InAppBrowserResult {
  const detected = detectInAppBrowser(userAgent);
  if (detected.isInApp && detected.app) return { isInApp: true, app: detected.app };
  return { isInApp: false };
}

export function inAppSourceName(app: string): string {
  return `inapp_${app}`;
}
