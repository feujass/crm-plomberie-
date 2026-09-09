import { describe, expect, it } from "vitest";

import { buildFacturXXml } from "@/lib/facturation/build-facturx-xml";
import {
  allFuzzClientProfiles,
  facturXSourceFromClientProfile,
  fuzzClientProfileKey,
  partitionFuzzEinvoicingMatrix,
  snapshotClientFromProfile,
} from "@/lib/facturation/fuzz";
import { withSandboxDirectoryRouting } from "@/lib/facturation/pa/superpdp-routing";

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

  it("classe la matrice e-invoicing : 54 particuliers + 54 sans SIREN exclus, 108 dans le périmètre", () => {
    const { excluded, inScope } = partitionFuzzEinvoicingMatrix();
    const particuliers = excluded.filter((c) => c.key.startsWith("particulier|"));
    const sansIdent = excluded.filter((c) => c.blockers.includes("siren_client"));
    expect(particuliers).toHaveLength(54);
    expect(particuliers.every((c) => c.blockers.length === 0)).toBe(true);
    expect(sansIdent).toHaveLength(54);
    expect(excluded).toHaveLength(108);
    expect(inScope).toHaveLength(108);
    expect(inScope.some((c) => c.key.startsWith("particulier|"))).toBe(false);
    expect(inScope.some((c) => c.key.includes("|aucun|"))).toBe(false);
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

  it("l’overlay sandbox remplace BT-34/BT-49 SIREN par Peppol", () => {
    const { inScope } = partitionFuzzEinvoicingMatrix();
    const xml = buildFacturXXml(withSandboxDirectoryRouting(inScope[0]!.source));
    expect(xml).toContain('schemeID="0225">315143296_97118<');
    expect(xml).toContain('schemeID="0225">315143296_97117<');
    expect(xml).not.toContain('schemeID="0225">443061841<');
    expect(xml).not.toContain('schemeID="0225">732829320<');
  });
});
