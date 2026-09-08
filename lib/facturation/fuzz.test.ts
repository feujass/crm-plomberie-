import { describe, expect, it } from "vitest";

import {
  allFuzzClientProfiles,
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
});
