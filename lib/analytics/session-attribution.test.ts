import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SESSION_ATTRIBUTION_TTL_MS,
  captureSessionAttributionFromLocation,
  hasSentAttribution,
  markAttributionSent,
  readFirstTouchAttribution,
  readSessionAttribution,
  refreshSessionAttributionViewport,
} from "@/lib/analytics/session-attribution";

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

describe("session-attribution", () => {
  let sessionStorage: Storage;
  let localStorage: Storage;

  beforeEach(() => {
    sessionStorage = mockStorage();
    localStorage = mockStorage();
    vi.stubGlobal("sessionStorage", sessionStorage);
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("document", { referrer: "" });
    vi.stubGlobal("window", {
      innerWidth: 390,
      sessionStorage,
      localStorage,
    });
  });

  it("écrase l'attribution session quand l'URL contient utm_*", () => {
    captureSessionAttributionFromLocation("", "/");
    expect(readSessionAttribution().utm_source).toBeNull();

    captureSessionAttributionFromLocation(
      "?utm_source=instagram&utm_medium=bio&utm_campaign=test_claude",
      "/",
    );
    const attr = readSessionAttribution();
    expect(attr.utm_source).toBe("instagram");
    expect(attr.utm_medium).toBe("bio");
    expect(attr.utm_campaign).toBe("test_claude");
  });

  it("expire l'attribution session après 30 min d'inactivité (cookie 90 j conservé)", () => {
    vi.useFakeTimers();
    captureSessionAttributionFromLocation("?utm_source=facebook", "/");
    expect(readSessionAttribution().utm_source).toBe("facebook");

    vi.advanceTimersByTime(SESSION_ATTRIBUTION_TTL_MS + 1);
    expect(readSessionAttribution().utm_source).toBe("facebook");

    captureSessionAttributionFromLocation("", "/");
    expect(readSessionAttribution().utm_source).toBe("facebook");
    vi.useRealTimers();
  });

  it("conserve first_touch permanent séparément", () => {
    captureSessionAttributionFromLocation("?utm_source=instagram", "/");
    const first = readFirstTouchAttribution();
    expect(first?.utm_source).toBe("instagram");
    expect(first?.captured_at).toBeTruthy();

    captureSessionAttributionFromLocation("?utm_source=google", "/");
    expect(readFirstTouchAttribution()?.utm_source).toBe("instagram");
  });

  it("lit viewport_width après refresh client", () => {
    captureSessionAttributionFromLocation("?utm_source=instagram", "/");
    expect(readSessionAttribution().viewport_width).toBeNull();

    refreshSessionAttributionViewport();
    expect(readSessionAttribution().viewport_width).toBe(390);
  });

  it("ne marque _sent qu'après markAttributionSent explicite", () => {
    expect(hasSentAttribution()).toBe(false);
    markAttributionSent();
    expect(hasSentAttribution()).toBe(true);
  });
});
