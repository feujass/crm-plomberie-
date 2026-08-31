import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { initOAuthGoogleProfile } from "@/lib/auth/init-oauth-profile";
import { attachReferralFromCookie } from "@/lib/affiliate/server";
import { PRIVACY_POLICY_VERSION } from "@/lib/legal/constants";
import {
  PENDING_CHECKOUT_COOKIE,
  parsePendingCheckout,
  type PendingCheckout,
} from "@/lib/auth/pending-checkout";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import { isFlowoBilling, isFlowoPlanId } from "@/lib/stripe/plans";
import { supabaseAnonKey, supabasePublicUrl } from "@/lib/supabase/env";

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

      const response = NextResponse.redirect(new URL(redirectPath, url.origin));
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
  }

  return NextResponse.redirect(new URL("/login?auth_error=callback", url.origin));
}
