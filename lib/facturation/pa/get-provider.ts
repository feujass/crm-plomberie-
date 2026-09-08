import { MockProvider } from "@/lib/facturation/pa/mock-provider";
import type { EInvoicingProvider } from "@/lib/facturation/pa/provider";

/**
 * Adaptateur réel Super PDP : plus tard.
 * Aujourd’hui le mock est forcé — aucun appel réseau.
 */
export function getEInvoicingProvider(): EInvoicingProvider {
  return new MockProvider();
}
