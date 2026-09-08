import { NextRequest, NextResponse } from "next/server";

import { CONNECTION_STATUS_COPY } from "@/lib/facturation/pa/connection-copy";
import {
  EINVOICING_OAUTH_STATE_COOKIE,
  einvoicingOAuthCookieOptions,
  einvoicingRedirectUri,
  newEinvoicingOAuthState,
} from "@/lib/facturation/pa/einvoicing-oauth-state";
import { getEInvoicingProvider } from "@/lib/facturation/pa/get-provider";
import { MOCK_CODES, type MockScenario } from "@/lib/facturation/pa/mock-fixtures";
import { superPdpCompanyPrefill } from "@/lib/facturation/pa/superpdp-company-prefill";
import { saveConnectionAndTokens } from "@/lib/facturation/pa/supabase-token-store";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SCENARIOS = new Set<MockScenario>([
  "verified",
  "pending_verification",
  "needs_review",
  "failed",
  "token_expired",
  "invoice_rejected",
]);

/** Démarre le raccordement OAuth Super PDP (redirection). Le mock reste en POST. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?redirect=/compte/e-facturation", request.url));
  }

  const provider = getEInvoicingProvider();
  if (provider.id !== "superpdp") {
    return NextResponse.json(
      { message: "Le raccordement réel est désactivé (EINVOICING_PROVIDER=mock). Utilisez le simulateur." },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("siret, siren, email_facturation")
    .eq("id", user.id)
    .maybeSingle();
  const prefill = superPdpCompanyPrefill({
    siret: profile?.siret as string | null,
    siren: profile?.siren as string | null,
  });
  const state = newEinvoicingOAuthState();
  const redirectUri = einvoicingRedirectUri(request.nextUrl.origin);
  const { url } = await provider.getAuthorizationUrl(
    { userId: user.id },
    {
      redirectUri,
      state,
      loginHint: user.email ?? (profile?.email_facturation as string | undefined),
      ...prefill,
    },
  );

  const res = NextResponse.redirect(url);
  res.cookies.set(EINVOICING_OAUTH_STATE_COOKIE, state, einvoicingOAuthCookieOptions());
  return res;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

  const provider = getEInvoicingProvider();
  if (provider.id !== "mock") {
    return NextResponse.json(
      { message: "Raccordement Super PDP : ouvrez GET /api/compte/e-facturation/connect." },
      { status: 400 },
    );
  }

  let scenario: MockScenario = "verified";
  try {
    const body = (await request.json()) as { scenario?: string };
    if (body.scenario && SCENARIOS.has(body.scenario as MockScenario)) {
      scenario = body.scenario as MockScenario;
    }
  } catch {
    /* corps vide = verified */
  }

  const { tokens, snapshot } = await provider.exchangeAuthorizationCode(
    { userId: user.id },
    { code: MOCK_CODES[scenario], redirectUri: "https://flowo.local/compte/e-facturation/callback" },
  );

  try {
    await saveConnectionAndTokens(supabase, user.id, provider.id, snapshot, tokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enregistrement impossible";
    if (message.includes("EINVOICING_TOKEN_ENCRYPTION_KEY")) {
      return NextResponse.json(
        { message: "Clé de chiffrement des jetons manquante (EINVOICING_TOKEN_ENCRYPTION_KEY)." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        provider: provider.id,
        snapshot,
        copy: CONNECTION_STATUS_COPY[snapshot.status],
        persisted: false,
        detail: "Tables PA absentes ou erreur base — état mock non persisté.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    provider: provider.id,
    snapshot,
    copy: CONNECTION_STATUS_COPY[snapshot.status],
    persisted: true,
  });
}
