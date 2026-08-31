"use client";

import { useEffect } from "react";

import { identifyUser } from "@/lib/analytics/posthog";
import { readCookieConsent } from "@/lib/cookies/consent";

type Props = {
  userId?: string | null;
  email?: string | null;
  plan?: string | null;
  metier?: string | null;
};

/** Identifie l'utilisateur connecté dans PostHog (si cookies analytiques acceptés). */
export function LoggedInAnalytics({ userId, email, plan, metier }: Props) {
  useEffect(() => {
    if (!userId) return;
    const consent = readCookieConsent();
    if (!consent?.analytics) return;
    void identifyUser({ userId, email, plan, metier });
  }, [userId, email, plan, metier]);

  return null;
}
