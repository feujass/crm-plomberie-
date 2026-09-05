/** Meta Pixel — préparé, chargé uniquement si consentement analytique + NEXT_PUBLIC_META_PIXEL_ID. */
export function isMetaPixelConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim());
}

export function trackMetaEvent(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !isMetaPixelConfigured()) return;
  const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq !== "function") return;
  fbq("track", event, params);
}

export function loadMetaPixel(): void {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  if (!pixelId || typeof window === "undefined") return;
  if ((window as Window & { fbq?: unknown }).fbq) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  const fbq = function (...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fbq as any).callMethod ? (fbq as any).callMethod(...args) : (fbq as any).queue.push(args);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  (window as Window & { fbq?: typeof fbq; _fbq?: typeof fbq }).fbq = fbq;
  (window as Window & { _fbq?: typeof fbq })._fbq = fbq;
  fbq("init", pixelId);
  fbq("track", "PageView");
}
