export const METIER_OPTIONS = [
  { value: "artisan_btp", label: "Artisan BTP" },
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "maconnerie", label: "Maçonnerie" },
  { value: "carrelage", label: "Carrelage" },
  { value: "peinture", label: "Peinture" },
  { value: "menuiserie", label: "Menuiserie" },
  { value: "autre", label: "Autre" },
] as const;

export function siretDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function sirenFromSiret(siret: string) {
  const digits = siretDigits(siret);
  return digits.length >= 9 ? digits.slice(0, 9) : "";
}
