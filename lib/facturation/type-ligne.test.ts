import { describe, expect, it } from "vitest";

import {
  natureOperationFromLignes,
  suggestTypeLigne,
  typeLigneFromDevis,
} from "@/lib/facturation/type-ligne";

describe("typeLigneFromDevis", () => {
  it("mappe fourniture → bien et le reste → service", () => {
    expect(typeLigneFromDevis("fourniture")).toBe("bien");
    expect(typeLigneFromDevis("pose")).toBe("service");
    expect(typeLigneFromDevis("prestation")).toBe("service");
    expect(typeLigneFromDevis(null)).toBe("service");
  });
});

describe("natureOperationFromLignes", () => {
  it("dérive biens / services / mixte", () => {
    expect(natureOperationFromLignes(["service", "service"])).toBe("services");
    expect(natureOperationFromLignes(["bien", "bien"])).toBe("biens");
    expect(natureOperationFromLignes(["bien", "service"])).toBe("mixte");
  });
});

describe("suggestTypeLigne", () => {
  it("propose bien pour un matériel, service pour une pose", () => {
    expect(suggestTypeLigne("Fourniture mitigeur Grohe")).toBe("bien");
    expect(suggestTypeLigne("Pose du chauffe-eau")).toBe("service");
  });
});
