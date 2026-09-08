import { TokenExpiredError } from "@/lib/facturation/pa/errors";
import type { EInvoicingProvider } from "@/lib/facturation/pa/provider";
import { isAccessTokenExpired } from "@/lib/facturation/pa/tokens";
import type { FiscalEntityRef, OAuthTokenSet } from "@/lib/facturation/pa/types";

export async function withFreshTokens<T>(
  provider: EInvoicingProvider,
  entity: FiscalEntityRef,
  tokens: OAuthTokenSet,
  run: (tokens: OAuthTokenSet) => Promise<T>,
): Promise<{ result: T; tokens: OAuthTokenSet }> {
  let current = tokens;
  if (isAccessTokenExpired(current)) {
    current = await provider.refreshAccessToken(entity, current);
  }
  try {
    return { result: await run(current), tokens: current };
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      current = await provider.refreshAccessToken(entity, current);
      return { result: await run(current), tokens: current };
    }
    throw err;
  }
}
