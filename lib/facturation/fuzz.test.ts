import { describe, expect, it } from "vitest";

import { buildFacturXXml } from "@/lib/facturation/build-facturx-xml";
import {
  allFuzzClientProfiles,
  facturXSourceFromClientProfile,
  fuzzClientProfileKey,
  snapshotClientFromProfile,
} from "@/lib/facturation/fuzz";

describe("fuzz profils clients", () => {
  it("croise 4 × 2 × 3 × 3 × 3 = 216 combinaisons distinctes", () => {
    const profiles = allFuzzClientProfiles();
    expect(profiles).toHaveLength(216);
    const keys = new Set(profiles.map(fuzzClientProfileKey));
    expect(keys.size).toBe(216);
  });

  it("pose SIREN, TVA et livraison selon les axes", () => {
    const pro = snapshotClientFromProfile({
      kind: "pro_assujetti",
      vat: "sans_tva",
      ident: "siren",
      livraison: "absente",
      geo: "FR",
    });
    expect(pro.type_client).toBe("entreprise");
    expect(pro.siren).toBe("443061841");
    expect(pro.siret).toBeNull();
    expect(pro.tva_intracom).toBeNull();
    expect(pro.adresse_livraison).toBeNull();

    const ue = snapshotClientFromProfile({
      kind: "public",
      vat: "avec_tva",
      ident: "siret",
      livraison: "differente",
      geo: "UE",
    });
    expect(ue.type_client).toBe("public");
    expect(ue.siret).toBe("44306184100047");
    expect(ue.tva_intracom).toBe("DE136695976");
    expect(ue.adresse_facturation.pays).toBe("DE");
    expect(ue.adresse_livraison?.ville).toBe("Hamburg");
  });

  it("émet Delivery + date sur les 216 profils, ShipTo seulement si livraison distincte", () => {
    const emptyDelivery: string[] = [];
    const missingEvent: string[] = [];
    const unexpectedShipTo: string[] = [];
    const missingShipTo: string[] = [];
    for (const profile of allFuzzClientProfiles()) {
      const key = fuzzClientProfileKey(profile);
      const xml = buildFacturXXml(facturXSourceFromClientProfile(profile));
      if (!xml.includes("<ram:ApplicableHeaderTradeDelivery>")) emptyDelivery.push(key);
      if (!xml.includes("<ram:ActualDeliverySupplyChainEvent>")) missingEvent.push(key);
      if (/<ram:ApplicableHeaderTradeDelivery>\s*<\/ram:ApplicableHeaderTradeDelivery>/.test(xml)) {
        emptyDelivery.push(`${key}:vide`);
      }
      const hasShipTo = xml.includes("<ram:ShipToTradeParty>");
      if (profile.livraison === "differente" && !hasShipTo) missingShipTo.push(key);
      if (profile.livraison !== "differente" && hasShipTo) unexpectedShipTo.push(key);
    }
    expect(emptyDelivery, emptyDelivery.slice(0, 8).join(" | ")).toEqual([]);
    expect(missingEvent, missingEvent.slice(0, 8).join(" | ")).toEqual([]);
    expect(unexpectedShipTo, unexpectedShipTo.slice(0, 8).join(" | ")).toEqual([]);
    expect(missingShipTo, missingShipTo.slice(0, 8).join(" | ")).toEqual([]);
  });
});
