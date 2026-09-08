import { NextResponse } from "next/server";

import { CONNECTION_STATUS_COPY } from "@/lib/facturation/pa/connection-copy";
import { getEInvoicingProvider } from "@/lib/facturation/pa/get-provider";
import { loadConnection } from "@/lib/facturation/pa/supabase-token-store";
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
