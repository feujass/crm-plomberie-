import { xmlAmountToCents } from "@/lib/facturation/cents";
import { vatCents } from "@/lib/facturation/cents";

export type BrCoFailure = { rule: string; message: string };

function tagAmounts(xml: string, tag: string): string[] {
  const re = new RegExp(`<ram:${tag}(?:\\s[^>]*)?>([^<]*)</ram:${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[1] != null) out.push(m[1]);
  }
  return out;
}

function centsList(xml: string, tag: string): number[] {
  return tagAmounts(xml, tag).map(xmlAmountToCents);
}

/**
 * BR-CO-10 à BR-CO-17 lus depuis le XML émis — pas depuis l'état interne du générateur.
 */
export function assertBrCoTotals(xml: string): BrCoFailure[] {
  const failures: BrCoFailure[] = [];
  const headerBlock =
    xml.match(
      /<ram:SpecifiedTradeSettlementHeaderMonetarySummation>[\s\S]*?<\/ram:SpecifiedTradeSettlementHeaderMonetarySummation>/,
    )?.[0] ?? "";

  const lineBlocks = [
    ...xml.matchAll(
      /<ram:SpecifiedTradeSettlementLineMonetarySummation>[\s\S]*?<\/ram:SpecifiedTradeSettlementLineMonetarySummation>/g,
    ),
  ].map((m) => m[0]);

  const lineNets = lineBlocks.flatMap((b) => centsList(b, "LineTotalAmount"));
  const sumLines = lineNets.reduce((a, b) => a + b, 0);
  const headerLineTotal = centsList(headerBlock, "LineTotalAmount")[0] ?? 0;
  if (sumLines !== headerLineTotal) {
    failures.push({
      rule: "BR-CO-10",
      message: `Σ lignes ${sumLines} ≠ LineTotalAmount ${headerLineTotal}`,
    });
  }

  const taxBlocks = [
    ...xml.matchAll(/<ram:ApplicableHeaderTradeSettlement>[\s\S]*?<\/ram:ApplicableHeaderTradeSettlement>/g),
  ];
  const settlement = taxBlocks[0]?.[0] ?? xml;
  const headerTaxBlocks = [
    ...settlement.matchAll(/<ram:ApplicableTradeTax>[\s\S]*?<\/ram:ApplicableTradeTax>/g),
  ].filter((m) => m[0].includes("<ram:BasisAmount>"));

  let sumVat = 0;
  let sumBasis = 0;
  for (const m of headerTaxBlocks) {
    const block = m[0];
    const basis = centsList(block, "BasisAmount")[0] ?? 0;
    const vat = centsList(block, "CalculatedAmount")[0] ?? 0;
    const rate = centsList(block, "RateApplicablePercent")[0] ?? 0;
    const cat = block.match(/<ram:CategoryCode>([^<]+)</)?.[1] ?? "S";
    sumVat += vat;
    sumBasis += basis;
    const expectedVat = cat === "E" || rate === 0 ? 0 : vatCents(basis, rate);
    if (expectedVat !== vat) {
      failures.push({
        rule: "BR-CO-17",
        message: `TVA ${vat} ≠ round(base ${basis} × ${rate}/100) = ${expectedVat}`,
      });
    }
  }

  const taxBasis = centsList(headerBlock, "TaxBasisTotalAmount")[0] ?? 0;
  if (taxBasis !== headerLineTotal) {
    failures.push({
      rule: "BR-CO-14",
      message: `TaxBasisTotalAmount ${taxBasis} ≠ LineTotalAmount ${headerLineTotal}`,
    });
  }
  if (sumBasis !== taxBasis) {
    failures.push({
      rule: "BR-CO-11",
      message: `Σ bases TVA ${sumBasis} ≠ TaxBasisTotalAmount ${taxBasis}`,
    });
  }

  const taxTotal = centsList(headerBlock, "TaxTotalAmount")[0] ?? 0;
  if (taxTotal !== sumVat) {
    failures.push({
      rule: "BR-CO-15",
      message: `TaxTotalAmount ${taxTotal} ≠ Σ TVA ${sumVat}`,
    });
  }

  const grand = centsList(headerBlock, "GrandTotalAmount")[0] ?? 0;
  if (grand !== taxBasis + taxTotal) {
    failures.push({
      rule: "BR-CO-16",
      message: `GrandTotal ${grand} ≠ HT ${taxBasis} + TVA ${taxTotal}`,
    });
  }

  const prepaid = centsList(headerBlock, "TotalPrepaidAmount")[0] ?? 0;
  const due = centsList(headerBlock, "DuePayableAmount")[0] ?? 0;
  if (due !== grand - prepaid) {
    failures.push({
      rule: "BR-CO-13",
      message: `DuePayable ${due} ≠ Grand ${grand} − prepaid ${prepaid}`,
    });
  }

  return failures;
}
