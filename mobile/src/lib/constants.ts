import Constants from "expo-constants";

/** URL du site Next (API `/api/*`). Dev: http://localhost:3000 — machine physique: IP du Mac. */
export function getApiBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  if (fromExtra) return fromExtra.replace(/\/$/, "");
  const env = process.env.EXPO_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  return "http://localhost:3000";
}
