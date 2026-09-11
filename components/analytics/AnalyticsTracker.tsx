"use client";

import { Suspense } from "react";

import { OAuthAnalyticsCapture } from "@/components/analytics/OAuthAnalyticsCapture";
import { useAnalytics } from "@/lib/analytics/use-analytics";

function AnalyticsTrackerInner() {
  useAnalytics();
  return (
    <Suspense fallback={null}>
      <OAuthAnalyticsCapture />
    </Suspense>
  );
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerInner />
    </Suspense>
  );
}
