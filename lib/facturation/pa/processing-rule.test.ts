import { describe, expect, it } from "vitest";

import { processingRuleForTypeClient } from "@/lib/facturation/pa/processing-rule";

describe("processingRuleForTypeClient", () => {
  it("B2C pour un particulier, B2B sinon", () => {
    expect(processingRuleForTypeClient("particulier")).toBe("B2C");
    expect(processingRuleForTypeClient("entreprise")).toBe("B2B");
    expect(processingRuleForTypeClient("public")).toBe("B2B");
  });
});
