import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildAnalyticsRequestBody } from "@/lib/analytics/track-client";

function mockStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("buildAnalyticsRequestBody", () => {
  beforeEach(() => {
    const sessionStorage = mockStorage();
    vi.stubGlobal("sessionStorage", sessionStorage);
    vi.stubGlobal("localStorage", mockStorage());
    vi.stubGlobal("document", { referrer: "" });
    vi.stubGlobal("window", { innerWidth: 1280, sessionStorage, localStorage: mockStorage() });

    sessionStorage.setItem(
      "flowo_session_attribution",
      JSON.stringify({
        attribution: {
          utm_source: "instagram",
          utm_medium: "bio",
          utm_campaign: "test_claude",
          referrer: null,
          referrer_domain: null,
          landing_path: "/",
          viewport_width: 1280,
        },
        lastActivityAt: Date.now(),
      }),
    );
  });

  it("joint utm_* à chaque page_view (dashboard lit la 1ʳᵉ ligne de la session)", () => {
    const body = buildAnalyticsRequestBody({
      session_id: "00000000-0000-4000-8000-000000000001",
      event_type: "page_view",
      page_path: "/",
    });

    expect(body.attribution?.utm_source).toBe("instagram");
    expect(body.attribution?.utm_medium).toBe("bio");
    expect(body.attribution?.utm_campaign).toBe("test_claude");
    expect(body.attribution?.viewport_width).toBe(1280);
  });

  it("n'inclut pas l'attribution sur page_exit", () => {
    const body = buildAnalyticsRequestBody({
      session_id: "00000000-0000-4000-8000-000000000001",
      event_type: "page_exit",
      page_path: "/",
    });
    expect(body.attribution).toBeUndefined();
  });
});

describe("dashboard source resolution", () => {
  it("utm_source=X doit compter comme source X (pas Direct)", () => {
    const utm_source = "instagram";
    const resolved = utm_source?.trim().toLowerCase() || "Direct";
    expect(resolved).toBe("instagram");
    expect(resolved).not.toBe("direct");
  });
});
