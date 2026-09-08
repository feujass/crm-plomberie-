import { describe, expect, it } from "vitest";

import {
  adressesEquivalentes,
  isAdresseComplete,
  proposerAdresseDepuisBlob,
} from "@/lib/facturation/adresse";

describe("adressesEquivalentes", () => {
  it("ignore casse et espaces", () => {
    expect(
      adressesEquivalentes(
        { ligne1: "12 Rue de Lyon", ligne2: "", cp: "69003", ville: "Lyon", pays: "fr" },
        { ligne1: "12  rue de lyon", ligne2: "", cp: "69003", ville: "LYON", pays: "FR" },
      ),
    ).toBe(true);
  });

  it("détecte une livraison distincte", () => {
    expect(
      adressesEquivalentes(
        { ligne1: "12 Rue de Lyon", ligne2: "", cp: "69003", ville: "Lyon", pays: "FR" },
        { ligne1: "Chantier 4 av. République", ligne2: "", cp: "69003", ville: "Lyon", pays: "FR" },
      ),
    ).toBe(false);
  });
});

describe("proposerAdresseDepuisBlob", () => {
  it("extrait CP + ville en fin de blob sans remplir les colonnes métier", () => {
    const p = proposerAdresseDepuisBlob("12 rue de la République, 69003 Lyon");
    expect(p?.cp).toBe("69003");
    expect(p?.ville).toBe("Lyon");
    expect(p?.ligne1).toContain("République");
    expect(p?.source).toBe("parse");
  });

  it("ne devine pas un CP absent", () => {
    const p = proposerAdresseDepuisBlob("Chez M. Dupont à Caluire");
    expect(p?.cp).toBe("");
    expect(p?.ligne1).toContain("Caluire");
  });
});

describe("isAdresseComplete", () => {
  it("exige ligne1, cp, ville, pays", () => {
    expect(isAdresseComplete({ ligne1: "12 rue", ligne2: "", cp: "69003", ville: "Lyon", pays: "FR" })).toBe(true);
    expect(isAdresseComplete({ ligne1: "12 rue", ligne2: "", cp: "", ville: "Lyon", pays: "FR" })).toBe(false);
  });
});
