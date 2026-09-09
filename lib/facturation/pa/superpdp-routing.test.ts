import { describe, expect, it } from "vitest";

import { buildFacturXXml } from "@/lib/facturation/build-facturx-xml";
import { fixtureMixteMultiTva } from "@/lib/facturation/facturx-fixtures";
import {
  applyDirectoryRoutingAddresses,
  SUPERPDP_SANDBOX_BUYER_COMPANY_ID,
  SUPERPDP_SANDBOX_SELLER_COMPANY_ID,
  superPdpPeppolAddress,
  withSandboxDirectoryRouting,
} from "@/lib/facturation/pa/superpdp-routing";

describe("routage Super PDP", () => {
  it("substitue BT-34/BT-49 sans toucher aux identifiants légaux", () => {
    const source = fixtureMixteMultiTva();
    const overlay = applyDirectoryRoutingAddresses(source, {
      seller: superPdpPeppolAddress(SUPERPDP_SANDBOX_SELLER_COMPANY_ID),
      buyer: superPdpPeppolAddress(SUPERPDP_SANDBOX_BUYER_COMPANY_ID),
    });
    expect(overlay.emetteur.siren).toBe(source.emetteur.siren);
    expect(overlay.client.siren).toBe(source.client.siren);
    expect(overlay.sellerElectronicAddress).toEqual({ schemeId: "0225", value: "315143296_97118" });
    expect(overlay.buyerElectronicAddress).toEqual({ schemeId: "0225", value: "315143296_97117" });

    const xml = buildFacturXXml(withSandboxDirectoryRouting(source));
    expect(xml).toContain('schemeID="0225">315143296_97118<');
    expect(xml).toContain('schemeID="0225">315143296_97117<');
    expect(xml).not.toContain('schemeID="0225">732829320<');
    expect(xml).not.toContain('schemeID="0225">443061841<');
    expect(xml).toContain("732829320");
    expect(xml).toContain("443061841");
  });
});
