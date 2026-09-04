"use client";

import { useEffect } from "react";

import { syncInternalAnalyticsSession } from "@/lib/analytics/internal-cookie";

/** Pose le cookie interne dès le chargement (équipe connectée ou ?flowo_internal=1). */
export function InternalAnalyticsBootstrap() {
  useEffect(() => {
    void syncInternalAnalyticsSession();
  }, []);
  return null;
}
