export function formatCurrencyEUR(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

export function formatDateFr(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(d);
}
