import type { PostHog } from "posthog-js";

let posthogClient: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;

export function isPostHogConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim());
}

async function loadPostHog(): Promise<PostHog | null> {
  if (!isPostHogConfigured()) return null;
  if (posthogClient) return posthogClient;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { default: posthog } = await import("posthog-js");
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!.trim(), {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      autocapture: false,
      disable_session_recording: true,
      ip: false,
      loaded: (client) => {
        if (process.env.NODE_ENV === "development") client.debug(false);
      },
    });
    posthogClient = posthog;
    return posthog;
  })();

  return initPromise;
}

export async function enablePostHog(): Promise<void> {
  await loadPostHog();
}

export async function disablePostHog(): Promise<void> {
  if (!posthogClient) return;
  posthogClient.opt_out_capturing();
  posthogClient.reset();
}

export async function trackPageView(path: string): Promise<void> {
  const client = await loadPostHog();
  if (!client || client.has_opted_out_capturing()) return;
  client.capture("$pageview", { $current_url: path });
}

export async function identifyUser(params: {
  userId: string;
  email?: string | null;
  plan?: string | null;
  metier?: string | null;
}): Promise<void> {
  const client = await loadPostHog();
  if (!client || client.has_opted_out_capturing()) return;
  client.identify(params.userId, {
    email: params.email ?? undefined,
    plan: params.plan ?? "free",
    metier: params.metier ?? undefined,
  });
}

export async function trackEvent(event: string, properties?: Record<string, unknown>): Promise<void> {
  const client = await loadPostHog();
  if (!client || client.has_opted_out_capturing()) return;
  client.capture(event, properties);
}

export async function applyAnalyticsConsent(analytics: boolean): Promise<void> {
  if (!isPostHogConfigured()) return;
  if (analytics) {
    const client = await loadPostHog();
    client?.opt_in_capturing();
  } else {
    await disablePostHog();
  }
}
