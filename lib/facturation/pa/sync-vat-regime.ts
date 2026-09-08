import { EinvoicingError } from "@/lib/facturation/pa/errors";
import type { EInvoicingProvider } from "@/lib/facturation/pa/provider";
import { loadTokens, saveConnectionSnapshot, saveTokens } from "@/lib/facturation/pa/supabase-token-store";
import { mapRegimeTvaToSuperPdp } from "@/lib/facturation/pa/tva-mapping";
import type { TvaPeriodiciteDeclaration } from "@/lib/facturation/pa/tva-mapping";
import { withFreshTokens } from "@/lib/facturation/pa/with-fresh-tokens";
import { parseRegimeTva } from "@/lib/facturation/regime-tva";
import type { SupabaseClient } from "@supabase/supabase-js";

function tokensChanged(
  a: { accessToken: string; refreshToken: string | null; expiresAt: string },
  b: { accessToken: string; refreshToken: string | null; expiresAt: string },
): boolean {
  return a.accessToken !== b.accessToken || a.refreshToken !== b.refreshToken || a.expiresAt !== b.expiresAt;
}

export async function syncConnectedVatRegime(
  supabase: SupabaseClient,
  provider: EInvoicingProvider,
  userId: string,
): Promise<void> {
  const tokens = await loadTokens(supabase, userId, provider.id);
  if (!tokens) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("regime_tva, tva_periodicite_declaration")
    .eq("id", userId)
    .maybeSingle();
  const mapping = mapRegimeTvaToSuperPdp({
    regimeTva: parseRegimeTva(profile?.regime_tva),
    periodicite: (profile?.tva_periodicite_declaration as TvaPeriodiciteDeclaration | null) ?? null,
  });
  if (mapping.status !== "complete") return;

  const entity = { userId };
  try {
    const { result: snapshot, tokens: fresh } = await withFreshTokens(provider, entity, tokens, async (t) => {
      const status = await provider.getConnectionStatus(entity, t);
      if (status.status !== "verified") return status;
      await provider.syncCompanyVatRegime(entity, t, mapping);
      return provider.getConnectionStatus(entity, t);
    });
    if (tokensChanged(tokens, fresh)) {
      await saveTokens(supabase, userId, provider.id, fresh);
    }
    await saveConnectionSnapshot(supabase, userId, provider.id, snapshot);
  } catch (err) {
    if (err instanceof EinvoicingError) return;
    throw err;
  }
}
