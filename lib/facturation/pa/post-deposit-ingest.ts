import { after } from "next/server";

/** Délais après le POST invoices : le 1er poll ne voit souvent que `api:uploaded`. */
export const POST_DEPOSIT_INGEST_DELAYS_MS = [5_000, 30_000] as const;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Enchaîne des ingestions ciblées sans bloquer la réponse HTTP (`after()`).
 * `delaysMs` sont des instants depuis le dépôt (5 s puis 30 s), pas des intervalles.
 */
export function schedulePostDepositIngest(
  run: () => Promise<void>,
  deps: {
    afterFn?: (task: () => void | Promise<void>) => void;
    sleepFn?: (ms: number) => Promise<void>;
    delaysMs?: readonly number[];
  } = {},
): void {
  const afterFn = deps.afterFn ?? after;
  const sleepFn = deps.sleepFn ?? sleep;
  const delays = deps.delaysMs ?? POST_DEPOSIT_INGEST_DELAYS_MS;
  try {
    afterFn(async () => {
      let elapsed = 0;
      for (const at of delays) {
        const wait = Math.max(0, at - elapsed);
        if (wait > 0) await sleepFn(wait);
        elapsed = at;
        try {
          await run();
        } catch {
          /* le cron 15 min reprend */
        }
      }
    });
  } catch {
    /* hors requête HTTP (tests, scripts) — le cron reprend */
  }
}
