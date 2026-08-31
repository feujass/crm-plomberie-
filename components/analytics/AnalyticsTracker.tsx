"use client";

import { useAnalytics } from "@/lib/analytics/use-analytics";

export function AnalyticsTracker() {
  useAnalytics();
  return null;
}
