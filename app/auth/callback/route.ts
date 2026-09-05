import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { initOAuthGoogleProfile } from "@/lib/auth/init-oauth-profile";
import { attachReferralFromCookie } from "@/lib/affiliate/server";
import { linkDemoQuoteToUser } from "@/lib/demo/link-to-account";
import { demoDevisCookieOptions, DEMO_DEVIS_COOKIE } from "@/lib/demo/cookie";
import { PRIVACY_POLICY_VERSION } from "@/lib/legal/constants";
import {
  PENDING_CHECKOUT_COOKIE,
  type PendingCheckout,
} from "@/lib/auth/pending-checkout";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import { isFlowoBilling, isFlowoPlanId } from "@/lib/stripe/plans";
import { supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";

function redirectWithGoogleOAuthSuccess(redirectPath: string, origin: string): URL {
  const dest = new URL(redirectPath, origin);
  dest.searchParams.set("google_oauth", "success");
  return dest;
}

function readPendingCheckoutFromUrl(url: URL): PendingCheckout | null {
  const plan = url.searchParams.get("plan")?.trim() ?? "";
  const billing = url.searchParams.get("billing")?.trim() ?? "";
  if (!isFlowoPlanId(plan) || !isFlowoBilling(billing)) return null;
  return { plan, billing };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");
  const isSignup = url.searchParams.get("signup") === "1";
  const pendingCheckout = readPendingCheckoutFromUrl(url);

  const cookieStore = await cookies();

  const supabase = createServerClient(supabasePublicUrl() ?? "", supabaseAnonKey() ?? "", {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
        });
      },
    },
  });

  if (code || (tokenHash && type === "recovery")) {
    const authResult = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash! });

    if (!authResult.error && authResult.data.user) {
      const user = authResult.data.user;
      const isGoogle =
        user.app_metadata?.provider === "google" ||
        (Array.isArray(user.identities) && user.identities.some((i) => i.provider === "google"));

      if (isGoogle) {
        await initOAuthGoogleProfile(user);
        await attachReferralFromCookie(user.id);
        if (url.searchParams.get("signup") === "1") {
          const { createAdminClient } = await import("@/lib/supabase/admin");
          try {
            const admin = createAdminClient();
            await admin
              .from("profiles")
              .update({
                privacy_accepted_at: new Date().toISOString(),
                privacy_policy_version: PRIVACY_POLICY_VERSION,
              })
              .eq("id", user.id)
              .is("privacy_accepted_at", null);
          } catch {
            /* colonnes absentes si migration non appliquée */
          }
        }
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_steps_completed")
        .eq("id", user.id)
        .maybeSingle();

      let redirectPath = "/accueil";
      if (next === "/reset-password" || type === "recovery") {
        redirectPath = "/reset-password";
      } else {
        redirectPath = resolvePostAuthRedirect({
          onboardingStepsCompleted: Number(profile?.onboarding_steps_completed ?? 0),
          next,
          pendingCheckout: profile && Number(profile.onboarding_steps_completed ?? 0) >= 3 ? pendingCheckout : null,
        });
      }

      let demoDevisId: string | null = null;
      if (isSignup || url.searchParams.get("from") === "demo") {
        try {
          const demoCookie = cookieStore.get("flowo_demo_id")?.value;
          const linked = await linkDemoQuoteToUser(user.id, demoCookie);
          if (linked.devisId) {
            demoDevisId = linked.devisId;
            redirectPath = `/devis/${linked.devisId}?view=preview&from=demo`;
          }
        } catch {
          /* demo link best-effort */
        }
      }

      const redirectTarget =
        isSignup && isGoogle
          ? redirectWithGoogleOAuthSuccess(redirectPath, url.origin)
          : new URL(redirectPath, url.origin);

      const response = NextResponse.redirect(redirectTarget);
      if (demoDevisId) {
        response.cookies.set(DEMO_DEVIS_COOKIE, demoDevisId, demoDevisCookieOptions());
      }
      cookieStore.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value);
      });

      if (pendingCheckout && Number(profile?.onboarding_steps_completed ?? 0) < 3) {
        response.cookies.set(PENDING_CHECKOUT_COOKIE, JSON.stringify(pendingCheckout), {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60,
        });
      }

      return response;
    }

    console.warn("[auth/callback]", authResult.error?.message);
    const errorParams = new URLSearchParams({
      auth_error: "callback",
      oauth_error_code: authResult.error?.code ?? authResult.error?.name ?? "callback",
      oauth_error_message: authResult.error?.message ?? "Échec de la connexion Google",
    });
    return NextResponse.redirect(new URL(`/login?${errorParams.toString()}`, url.origin));
  }

  const errorParams = new URLSearchParams({
    auth_error: "callback",
    oauth_error_code: "missing_code",
    oauth_error_message: "Code OAuth manquant ou invalide",
  });
  return NextResponse.redirect(new URL(`/login?${errorParams.toString()}`, url.origin));
}
