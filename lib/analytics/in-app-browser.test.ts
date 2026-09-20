import { describe, expect, it } from "vitest";

import { detectInAppBrowser, isInAppBrowser } from "@/lib/analytics/in-app-browser";

const UA = {
  tiktokIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_32.6.0",
  tiktokAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 trill_2023400000 BytedanceWebview/1.0",
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.0.0",
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.43 Mobile Safari/537.36 Instagram 302.0.0.0.0",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/10.0.0;]",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/10.0.0;]",
  messengerIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/10.0.0;]",
  snapchatIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.0.0",
  linkedinIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkedInApp/9.28.0",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  chromeIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  firefoxAndroid: "Mozilla/5.0 (Android 13; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  chromeDesktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

describe("detectInAppBrowser", () => {
  it("détecte TikTok iOS et Android", () => {
    expect(detectInAppBrowser(UA.tiktokIos)).toEqual({
      isInApp: true,
      app: "tiktok",
      appName: "TikTok",
      os: "ios",
    });
    expect(detectInAppBrowser(UA.tiktokAndroid)).toEqual({
      isInApp: true,
      app: "tiktok",
      appName: "TikTok",
      os: "android",
    });
  });

  it("détecte Instagram, Facebook, Messenger, Snapchat, LinkedIn", () => {
    expect(detectInAppBrowser(UA.instagramIos).appName).toBe("Instagram");
    expect(detectInAppBrowser(UA.instagramAndroid).os).toBe("android");
    expect(detectInAppBrowser(UA.facebookIos).appName).toBe("Facebook");
    expect(detectInAppBrowser(UA.facebookAndroid).appName).toBe("Facebook");
    expect(detectInAppBrowser(UA.messengerIos).appName).toBe("Messenger");
    expect(detectInAppBrowser(UA.snapchatIos).appName).toBe("Snapchat");
    expect(detectInAppBrowser(UA.linkedinIos).appName).toBe("LinkedIn");
  });

  it("ne déclenche pas Safari, Chrome ni Firefox", () => {
    for (const ua of [
      UA.safariIos,
      UA.chromeIos,
      UA.chromeAndroid,
      UA.firefoxAndroid,
      UA.safariMac,
      UA.chromeDesktop,
    ]) {
      expect(detectInAppBrowser(ua).isInApp).toBe(false);
      expect(isInAppBrowser(ua)).toEqual({ isInApp: false });
    }
  });

  it("retourne other / isInApp false si UA vide", () => {
    expect(detectInAppBrowser("")).toEqual({
      isInApp: false,
      app: null,
      appName: null,
      os: "other",
    });
  });
});
