"use client";

import { useEffect } from "react";

function nextErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if ("__NEXT_ERROR_CODE" in error) {
    const c = (error as { __NEXT_ERROR_CODE?: unknown }).__NEXT_ERROR_CODE;
    return c === undefined || c === null ? null : String(c);
  }
  return null;
}

/** Utile quand l’E394 ne passe pas par le `fetch` patché (ordre des chunks Next / autre levée React). */
export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = typeof error?.message === "string" ? error.message : String(error);
    void fetch("/api/debug/session-log", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hypothesisId: "H-error-boundary",
        location: "app/error.tsx",
        message: "error boundary triggered",
        data: {
          name: error.name,
          digest: error.digest ?? null,
          message: msg.slice(0, 800),
          nextErrorCode: nextErrorCode(error),
          stackPreview: typeof error.stack === "string" ? error.stack.slice(0, 2000) : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Une erreur s’est produite</h1>
      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
        {process.env.NODE_ENV === "development" ? error.message : "Réessayez plus tard."}
      </p>
      <button
        type="button"
        className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
        onClick={() => reset()}
      >
        Réessayer
      </button>
    </div>
  );
}
