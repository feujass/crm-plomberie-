import { describe, expect, it } from "vitest";

import {
  assertSirenOrSiretForPro,
  isValidSiren,
  isValidSiret,
  luhnValid,
  sirenFromSiret,
} from "@/lib/legal/siren";

describe("luhnValid", () => {
  it("accepte un SIREN INSEE connu (La Poste 356000000)", () => {
    expect(isValidSiren("356000000")).toBe(true);
    expect(luhnValid("356000000")).toBe(true);
  });

  it("refuse un SIREN au mauvais checksum", () => {
    expect(isValidSiren("356000001")).toBe(false);
  });

  it("refuse un SIREN trop court ou avec lettres", () => {
    expect(isValidSiren("12345678")).toBe(false);
    expect(isValidSiren("35600000A")).toBe(false);
    expect(isValidSiren("")).toBe(false);
  });
});

describe("isValidSiret", () => {
  it("accepte un SIRET Luhn valide (La Poste siège)", () => {
    expect(isValidSiret("35600000000048")).toBe(true);
  });

  it("refuse un SIRET de 14 chiffres invalide", () => {
    expect(isValidSiret("35600000000049")).toBe(false);
  });
});

describe("sirenFromSiret", () => {
  it("extrait le SIREN", () => {
    expect(sirenFromSiret("35600000000048")).toBe("356000000");
  });
});

describe("assertSirenOrSiretForPro", () => {
  it("laisse passer un particulier sans identifiant", () => {
    expect(assertSirenOrSiretForPro({ typeClient: "particulier" }).ok).toBe(true);
  });

  it("exige SIREN ou SIRET pour une entreprise", () => {
    const r = assertSirenOrSiretForPro({ typeClient: "entreprise" });
    expect(r.ok).toBe(false);
  });

  it("accepte un SIREN valide pour un client public", () => {
    expect(assertSirenOrSiretForPro({ typeClient: "public", siren: "356000000" }).ok).toBe(true);
  });

  it("refuse un numéro sandbox hors scheme sandbox", () => {
    const prev = process.env.SUPERPDP_COMPANY_NUMBER_SCHEME;
    delete process.env.SUPERPDP_COMPANY_NUMBER_SCHEME;
    try {
      expect(assertSirenOrSiretForPro({ typeClient: "entreprise", siren: "000000001" }).ok).toBe(false);
    } finally {
      if (prev == null) delete process.env.SUPERPDP_COMPANY_NUMBER_SCHEME;
      else process.env.SUPERPDP_COMPANY_NUMBER_SCHEME = prev;
    }
  });

  it("accepte un numéro sandbox Super PDP quand le scheme est sandbox", () => {
    const prev = process.env.SUPERPDP_COMPANY_NUMBER_SCHEME;
    process.env.SUPERPDP_COMPANY_NUMBER_SCHEME = "sandbox";
    try {
      expect(assertSirenOrSiretForPro({ typeClient: "entreprise", siren: "000000001" }).ok).toBe(true);
      expect(assertSirenOrSiretForPro({ typeClient: "entreprise", siren: "000000002" }).ok).toBe(true);
    } finally {
      if (prev == null) delete process.env.SUPERPDP_COMPANY_NUMBER_SCHEME;
      else process.env.SUPERPDP_COMPANY_NUMBER_SCHEME = prev;
    }
  });
});
