import { NextResponse } from "next/server";

import { CONNECTION_STATUS_COPY } from "@/lib/facturation/pa/connection-copy";
import { getEInvoicingProvider } from "@/lib/facturation/pa/get-provider";
import {
  loadConnection,
  loadTokens,
  saveConnectionSnapshot,
  saveTokens,
} from "@/lib/facturation/pa/supabase-token-store";
import { withFreshTokens } from "@/lib/facturation/pa/with-fresh-tokens";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

  const provider = getEInvoicingProvider();
  try {
    const stored = await loadConnection(supabase, user.id, provider.id);
    const tokens = await loadTokens(supabase, user.id, provider.id);
    if (tokens && stored.snapshot.status !== "disconnected") {
      const entity = { userId: user.id };
      const { result: snapshot, tokens: fresh } = await withFreshTokens(provider, entity, tokens, (t) =>
        provider.getConnectionStatus(entity, t),
      );
      if (
        fresh.accessToken !== tokens.accessToken ||
        fresh.refreshToken !== tokens.refreshToken ||
        fresh.expiresAt !== tokens.expiresAt
      ) {
        await saveTokens(supabase, user.id, provider.id, fresh);
      }
      await saveConnectionSnapshot(supabase, user.id, provider.id, snapshot);
      return NextResponse.json({
        provider: provider.id,
        snapshot,
        copy: CONNECTION_STATUS_COPY[snapshot.status],
      });
    }
    return NextResponse.json({
      provider: provider.id,
      snapshot: stored.snapshot,
      copy: CONNECTION_STATUS_COPY[stored.snapshot.status],
    });
  } catch {
    return NextResponse.json({
      provider: provider.id,
      snapshot: {
        status: "disconnected",
        provider: provider.id,
        providerCompanyId: null,
        companyVerificationStatus: null,
        lastError: null,
        connectedAt: null,
        updatedAt: null,
      },
      copy: CONNECTION_STATUS_COPY.disconnected,
    });
  }
}
