import { describe, expect, it } from "vitest";

import { schedulePostDepositIngest } from "@/lib/facturation/pa/post-deposit-ingest";

describe("schedulePostDepositIngest", () => {
  it("appelle l’ingestion à 5 s puis 30 s sans bloquer l’appelant", async () => {
    const waits: number[] = [];
    const runs: number[] = [];
    let queued: (() => void | Promise<void>) | null = null;

    schedulePostDepositIngest(
      async () => {
        runs.push(Date.now());
      },
      {
        afterFn: (task) => {
          queued = task;
        },
        sleepFn: async (ms) => {
          waits.push(ms);
        },
        delaysMs: [5_000, 30_000],
      },
    );

    expect(queued).not.toBeNull();
    expect(runs).toEqual([]);
    await queued!();
    expect(waits).toEqual([5_000, 25_000]);
    expect(runs).toHaveLength(2);
  });
});
