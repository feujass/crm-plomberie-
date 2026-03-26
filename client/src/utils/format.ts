export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));

export const formatPhone = (value: string) => {
  if (!value) return "-";
  const trimmed = String(value).trim();
  const isInternational = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "-";
  if (isInternational) {
    const country = digits.slice(0, 2);
    const rest = digits.slice(2).replace(/(\d{2})(?=\d)/g, "$1 ").trim();
    return `+${country} ${rest}`.trim();
  }
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
};
