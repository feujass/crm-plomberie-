import { NextRequest, NextResponse } from "next/server";

import {
  EINVOICING_OAUTH_STATE_COOKIE,
  einvoicingRedirectUri,
  oauthStatesEqual,
} from "@/lib/facturation/pa/einvoicing-oauth-state";
import { EinvoicingError } from "@/lib/facturation/pa/errors";
import { getEInvoicingProvider } from "@/lib/facturation/pa/get-provider";
import { saveConnectionAndTokens } from "@/lib/facturation/pa/supabase-token-store";
import { syncConnectedVatRegime } from "@/lib/facturation/pa/sync-vat-regime";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function redirectCompte(request: NextRequest, error?: string) {
  const url = new URL("/compte/e-facturation", request.url);
  if (error) url.searchParams.set("error", error);
  const res = NextResponse.redirect(url);
  res.cookies.delete(EINVOICING_OAUTH_STATE_COOKIE);
  return res;
}

export async function GET(request: NextRequest) {
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    const desc = request.nextUrl.searchParams.get("error_description") ?? oauthError;
    return redirectCompte(request, desc);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const expected = request.cookies.get(EINVOICING_OAUTH_STATE_COOKIE)?.value;
  if (!code) return redirectCompte(request, "Code d’autorisation manquant.");
  if (!oauthStatesEqual(expected, state)) {
    return redirectCompte(request, "Session de raccordement expirée. Recommencez.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?redirect=/compte/e-facturation", request.url));
  }

  const provider = getEInvoicingProvider();
  const redirectUri = einvoicingRedirectUri(request.nextUrl.origin);
  try {
    const { tokens, snapshot } = await provider.exchangeAuthorizationCode(
      { userId: user.id },
      { code, redirectUri, state },
    );
    await saveConnectionAndTokens(supabase, user.id, provider.id, snapshot, tokens);
  } catch (err) {
    if (err instanceof EinvoicingError) {
      return redirectCompte(request, err.message);
    }
    const message = err instanceof Error ? err.message : "Raccordement impossible.";
    if (message.includes("EINVOICING_TOKEN_ENCRYPTION_KEY")) {
      return redirectCompte(request, "Clé de chiffrement des jetons manquante.");
    }
    return redirectCompte(request, message);
  }

  try {
    await syncConnectedVatRegime(supabase, provider, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[e-facturation/callback] sync TVA après raccordement", message);
  }

  return redirectCompte(request);
}
