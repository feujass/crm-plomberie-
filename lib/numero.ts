export function formatDevisNumero(year: number, seq: number) {
  return `DEVIS-${year}-${String(seq).padStart(4, "0")}`;
}

export function formatFactureNumero(year: number, seq: number) {
  return `FACT-${year}-${String(seq).padStart(4, "0")}`;
}
