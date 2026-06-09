import type { RequestErrorContext } from "next/dist/server/instrumentation/types";

/**
 * Hook Next.js — doit rester compatible Edge (pas de fs/path).
 * Le debug NDJSON local vit dans lib/debug-session-append.ts (routes API uniquement).
 */
export async function register(): Promise<void> {}

export async function onRequestError(
  _error: unknown,
  _errorRequest: Readonly<{ path: string; method: string; headers: NodeJS.Dict<string | string[]> }>,
  _errorContext: Readonly<RequestErrorContext>,
): Promise<void> {}
