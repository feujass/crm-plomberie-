import { describe, expect, it } from "vitest";

import {
  centsToXml,
  decimalFromDb,
  divRound,
  jsonNumberToDecimalString,
  lineHtCents,
  milliToXml,
  toCents,
  toMilli,
  toRateCenti,
  vatCents,
} from "@/lib/facturation/cents";

describe("parse via chaîne, pas n * 100", () => {
  it("convertit des montants JSON courants sans dérive", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents("19.99")).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toMilli(1.333)).toBe(1333);
    expect(toRateCenti(5.5)).toBe(550);
    expect(toRateCenti(20)).toBe(2000);
    expect(decimalFromDb("19.99")).toBe("19.99");
    expect(toCents(decimalFromDb("19.99"))).toBe(1999);
  });

  it("sérialise un number JSON sans notation scientifique", () => {
    expect(jsonNumberToDecimalString(19.99)).toBe("19.99");
    expect(jsonNumberToDecimalString(5.5)).toBe("5.5");
  });
});

describe("arrondis EN 16931", () => {
  it("calcule une ligne 1,333 × 19,99 € → 26,65 € (half-away-from-zero)", () => {
    expect(lineHtCents(1333, 1999)).toBe(2665);
    expect(centsToXml(2665)).toBe("26.65");
  });

  it("TVA 5,5 % et 20 % sur bases en centimes", () => {
    expect(vatCents(18000, 2000)).toBe(3600);
    expect(vatCents(13000, 1000)).toBe(1300);
    expect(vatCents(10000, 550)).toBe(550);
  });

  it("half-away-from-zero", () => {
    expect(divRound(5, 2)).toBe(3);
    expect(divRound(-5, 2)).toBe(-3);
  });

  it("quantité XML à 3 décimales", () => {
    expect(milliToXml(2000)).toBe("2.000");
    expect(milliToXml(-1000)).toBe("-1.000");
  });
});
