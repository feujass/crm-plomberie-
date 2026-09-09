import { describe, expect, it } from "vitest";

import { isSvrlBlocking, parseSvrlFailedAsserts } from "@/lib/facturation/france-rfe";

describe("France_RFE SVRL", () => {
  it("extrait les failed-assert et ignore les warnings", () => {
    const svrl = `<?xml version="1.0"?>
<svrl:schematron-output xmlns:svrl="http://purl.oclc.org/dsdl/svrl">
  <svrl:failed-assert test="string(\$endpointID)"
                      id="BR-FR-12_BT-49"
                      flag="fatal"
                      location="/*">
    <svrl:text>
      BR-FR-12/BT-49 : Le BT-49  est obligatoire.
    </svrl:text>
  </svrl:failed-assert>
  <svrl:failed-assert id="PEPPOL-EN16931-R008" flag="warning" location="/*">
    <svrl:text>empty element</svrl:text>
  </svrl:failed-assert>
  <failed-assert id="BR-52" location="/*">
    <text>no flag = blocking</text>
  </failed-assert>
</svrl:schematron-output>`;
    const all = parseSvrlFailedAsserts(svrl);
    expect(all.map((a) => a.id)).toEqual(["BR-FR-12_BT-49", "PEPPOL-EN16931-R008", "BR-52"]);
    expect(all[0]?.text).toContain("BT-49");
    expect(all.filter((a) => isSvrlBlocking(a.flag)).map((a) => a.id)).toEqual([
      "BR-FR-12_BT-49",
      "BR-52",
    ]);
  });
});
