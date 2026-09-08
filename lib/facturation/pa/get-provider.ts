import { MockProvider } from "@/lib/facturation/pa/mock-provider";
import type { EInvoicingProvider } from "@/lib/facturation/pa/provider";
import { einvoicingProviderFromEnv } from "@/lib/facturation/pa/superpdp-config";
import { SuperPdpProvider } from "@/lib/facturation/pa/superpdp-provider";
import type { ProviderId } from "@/lib/facturation/pa/types";

/**
 * `EINVOICING_PROVIDER=mock` (défaut) : aucun appel réseau.
 * `EINVOICING_PROVIDER=superpdp` : sandbox / prod Super PDP.
 */
export function getEInvoicingProviderId(): ProviderId {
  return einvoicingProviderFromEnv();
}

export function getEInvoicingProvider(): EInvoicingProvider {
  if (getEInvoicingProviderId() === "superpdp") {
    return new SuperPdpProvider();
  }
  return new MockProvider();
}
