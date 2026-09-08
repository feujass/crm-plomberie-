import { describe, expect, it } from "vitest";

import { InvoiceRejectedError, SessionNotVerifiedError, TokenExpiredError } from "@/lib/facturation/pa/errors";
import { MOCK_CODES, tokensForScenario } from "@/lib/facturation/pa/mock-fixtures";
import { MockProvider } from "@/lib/facturation/pa/mock-provider";
import { withFreshTokens } from "@/lib/facturation/pa/with-fresh-tokens";

const entity = { userId: "user-1" };

describe("MockProvider — cas d’échec", () => {
  const provider = new MockProvider();

  it("refuse une session non verified (403)", async () => {
    const { tokens } = await provider.exchangeAuthorizationCode(entity, { code: MOCK_CODES.pending_verification });
    await expect(
      provider.submitInvoice(entity, tokens, {
        factureId: "f1",
        xml: "<xml/>",
        processingRule: "B2B",
        externalId: "f1",
      }),
    ).rejects.toBeInstanceOf(SessionNotVerifiedError);
  });

  it("rejette la facture sur le scénario invoice_rejected", async () => {
    const { tokens } = await provider.exchangeAuthorizationCode(entity, { code: MOCK_CODES.invoice_rejected });
    await expect(
      provider.submitInvoice(entity, tokens, {
        factureId: "f1",
        xml: "<xml/>",
        processingRule: "B2C",
        externalId: "f1",
      }),
    ).rejects.toBeInstanceOf(InvoiceRejectedError);
  });

  it("signale un jeton expiré puis le rafraîchit", async () => {
    const expired = tokensForScenario("token_expired");
    await expect(provider.getConnectionStatus(entity, expired)).resolves.toMatchObject({ status: "token_expired" });
    await expect(provider.listIncomingInvoices(entity, expired)).rejects.toBeInstanceOf(TokenExpiredError);
    const { result, tokens } = await withFreshTokens(provider, entity, expired, (fresh) =>
      provider.listIncomingInvoices(entity, fresh),
    );
    expect(result.invoices.length).toBe(1);
    expect(tokens.accessToken).toContain("verified");
  });

  it("dépose B2B et B2C quand la session est verified", async () => {
    const { tokens } = await provider.exchangeAuthorizationCode(entity, { code: MOCK_CODES.verified });
    const b2b = await provider.submitInvoice(entity, tokens, {
      factureId: "f-b2b",
      xml: "<xml/>",
      processingRule: "B2B",
      externalId: "f-b2b",
    });
    const b2c = await provider.submitInvoice(entity, tokens, {
      factureId: "f-b2c",
      xml: "<xml/>",
      processingRule: "B2C",
      externalId: "f-b2c",
    });
    expect(b2b.processingRule).toBe("B2B");
    expect(b2c.processingRule).toBe("B2C");
  });
});
