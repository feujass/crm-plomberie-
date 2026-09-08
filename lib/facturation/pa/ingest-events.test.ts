import { describe, expect, it } from "vitest";

import { ingestLifecycleEvents } from "@/lib/facturation/pa/ingest-events";
import { MemoryCycleStore } from "@/lib/facturation/pa/memory-cycle-store";
import { mockHappyEvents, mockRejectedEvents } from "@/lib/facturation/pa/mock-fixtures";
import { pollAndIngestLifecycleEvents } from "@/lib/facturation/pa/poll-events";
import { MockProvider } from "@/lib/facturation/pa/mock-provider";
import { tokensForScenario } from "@/lib/facturation/pa/mock-fixtures";

describe("ingestLifecycleEvents — idempotence", () => {
  it("n’applique qu’une fois un événement rejoué", async () => {
    const store = new MemoryCycleStore();
    store.seed({
      id: "fa-1",
      userId: "user-1",
      statutCycleVie: "emise",
      providerInvoiceId: "mock-inv-fa-1",
    });
    const events = mockHappyEvents("mock-inv-fa-1");
    const first = await ingestLifecycleEvents(store, "mock", events);
    const second = await ingestLifecycleEvents(store, "mock", events);
    expect(first.applied).toBe(3);
    expect(first.duplicates).toBe(0);
    expect(second.applied).toBe(0);
    expect(second.duplicates).toBe(3);
    expect(store.factures.get("fa-1")?.statutCycleVie).toBe("encaissee");
    expect(first.transitions.map((t) => t.to)).toEqual(["deposee", "encaissee"]);
  });

  it("passe en rejetee sur fr:213", async () => {
    const store = new MemoryCycleStore();
    store.seed({
      id: "fa-2",
      userId: "user-1",
      statutCycleVie: "emise",
      providerInvoiceId: "mock-inv-fa-2",
    });
    const result = await ingestLifecycleEvents(store, "mock", mockRejectedEvents("mock-inv-fa-2"));
    expect(store.factures.get("fa-2")?.statutCycleVie).toBe("rejetee");
    expect(result.transitions.at(-1)?.statusCode).toBe("fr:213");
  });
});

describe("pollAndIngestLifecycleEvents", () => {
  it("délègue au même ingest que le webhook futur", async () => {
    const store = new MemoryCycleStore();
    store.seed({
      id: "fa-3",
      userId: "user-1",
      statutCycleVie: "emise",
      providerInvoiceId: "mock-inv-fa-3",
    });
    const provider = new MockProvider();
    const tokens = tokensForScenario("verified");
    const result = await pollAndIngestLifecycleEvents(provider, store, { userId: "user-1" }, tokens, {
      providerInvoiceId: "mock-inv-fa-3",
    });
    expect(result.applied).toBeGreaterThan(0);
    expect(store.factures.get("fa-3")?.statutCycleVie).toBe("encaissee");
  });
});
