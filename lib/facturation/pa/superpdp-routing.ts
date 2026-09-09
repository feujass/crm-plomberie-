import type { FacturXSource } from "@/lib/facturation/build-facturx-xml";
import { digitsOnly } from "@/lib/legal/siren";
import { getEInvoicingProvider } from "@/lib/facturation/pa/get-provider";
import { SuperPdpProvider } from "@/lib/facturation/pa/superpdp-provider";
import { loadConnection } from "@/lib/facturation/pa/supabase-token-store";
import { supabaseStoredTokenGate, withFreshStoredTokens } from "@/lib/facturation/pa/with-fresh-stored-tokens";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SUPERPDP_EAS_SCHEME_ID = "0225";

/** Identifiants Peppol constatés en sandbox (vendeur Burger Queen / acheteur Tricatel). */
export const SUPERPDP_SANDBOX_SELLER_COMPANY_ID = "97118";
export const SUPERPDP_SANDBOX_BUYER_COMPANY_ID = "97117";

export function superPdpPeppolAddress(companyId: string): { schemeId: string; value: string } {
  return { schemeId: SUPERPDP_EAS_SCHEME_ID, value: `315143296_${companyId}` };
}

export function applyDirectoryRoutingAddresses(
  source: FacturXSource,
  routing: {
    seller?: { schemeId: string; value: string } | null;
    buyer?: { schemeId: string; value: string } | null;
  },
): FacturXSource {
  return {
    ...source,
    sellerElectronicAddress: routing.seller ?? source.sellerElectronicAddress ?? null,
    buyerElectronicAddress: routing.buyer ?? source.buyerElectronicAddress ?? null,
  };
}

/** Même substitution que le lookup annuaire, sans HTTP — XML final CI / tests. */
export function withSandboxDirectoryRouting(source: FacturXSource): FacturXSource {
  return applyDirectoryRoutingAddresses(source, {
    seller: superPdpPeppolAddress(SUPERPDP_SANDBOX_SELLER_COMPANY_ID),
    buyer: superPdpPeppolAddress(SUPERPDP_SANDBOX_BUYER_COMPANY_ID),
  });
}

function partyNumber(siren: string | null, siret: string | null): string | null {
  const fromSiren = digitsOnly(String(siren ?? ""));
  if (fromSiren.length === 9) return fromSiren;
  const fromSiret = digitsOnly(String(siret ?? ""));
  return fromSiret.length >= 9 ? fromSiret.slice(0, 9) : null;
}

/**
 * Remplace 0225+SIREN par l’identifiant Peppol Super PDP (`315143296_{id}`)
 * quand l’annuaire le connaît. Échec de lookup : on garde le fallback SIREN.
 */
export async function attachSuperPdpRoutingAddresses(
  supabase: SupabaseClient,
  userId: string,
  source: FacturXSource,
): Promise<FacturXSource> {
  const provider = getEInvoicingProvider();
  if (!(provider instanceof SuperPdpProvider)) return source;

  const sellerNumber = partyNumber(source.emetteur.siren, source.emetteur.siret);
  const buyerNumber = partyNumber(source.client.siren, source.client.siret);
  if (!sellerNumber && !buyerNumber) return source;

  const connection = await loadConnection(supabase, userId, provider.id);
  const preferredCompanyId = connection.snapshot.providerCompanyId;

  try {
    const { result } = await withFreshStoredTokens(
      provider,
      userId,
      supabaseStoredTokenGate(supabase, userId, provider.id),
      async (tokens) => {
        const [seller, buyer] = await Promise.all([
          sellerNumber
            ? provider.lookupRoutingAddress(tokens, { companyNumber: sellerNumber, preferredCompanyId })
            : Promise.resolve(null),
          buyerNumber ? provider.lookupRoutingAddress(tokens, { companyNumber: buyerNumber }) : Promise.resolve(null),
        ]);
        return { seller, buyer };
      },
    );
    return applyDirectoryRoutingAddresses(source, result);
  } catch {
    return source;
  }
}
