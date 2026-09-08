/**
 * Montants Factur-X en unités entières — jamais de float IEEE entre la source et le XML.
 *
 * - euros → centimes (2 décimales)
 * - quantités → milli-unités (3 décimales)
 * - taux de TVA → centi-pourcent (5,50 % → 550)
 */

export function parseDecimalToInt(value: unknown, scale: number): number {
  if (typeof value === "string") {
    return parseDecimalString(value.trim(), scale);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return parseDecimalString(jsonNumberToDecimalString(value), scale);
  }
  if (value == null || value === "") return 0;
  throw new Error(`Valeur numérique invalide : ${String(value)}`);
}

export function toCents(value: unknown): number {
  return parseDecimalToInt(value, 2);
}

export function toMilli(value: unknown): number {
  return parseDecimalToInt(value, 3);
}

/** 20 % → 2000, 5,5 % → 550, 10 % → 1000. */
export function toRateCenti(value: unknown): number {
  return parseDecimalToInt(value, 2);
}

/** Conserve la représentation décimale Postgres (string) ; number JSON en dernier recours. */
export function decimalFromDb(value: unknown, fallback = "0"): string {
  if (value == null || value === "") return fallback;
  if (typeof value === "string") {
    const s = value.trim().replace(",", ".");
    return s || fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return jsonNumberToDecimalString(value);
  }
  return String(value);
}

/**
 * Un nombre JSON n'est pas une source de vérité décimale.
 * On le re-sérialise puis on parse la chaîne (pas `n * 10^scale`).
 */
export function jsonNumberToDecimalString(n: number): string {
  if (!Number.isFinite(n)) throw new Error("Nombre non fini.");
  const s = n.toFixed(12);
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "") || "0";
}

function parseDecimalString(raw: string, scale: number): number {
  const s = raw.replace(",", ".").replace(/\s/g, "");
  if (!s || s === "-" || s === "+") throw new Error(`Décimal invalide : ${raw}`);
  const m = /^([+-])?(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) throw new Error(`Décimal invalide : ${raw}`);
  const neg = m[1] === "-";
  const intPart = m[2] ?? "0";
  const frac = m[3] ?? "";
  const fracPadded = (frac + "0".repeat(scale)).slice(0, scale);
  const leftover = frac.slice(scale);
  let units = Number.parseInt(intPart, 10) * 10 ** scale + Number.parseInt(fracPadded || "0", 10);
  if (leftover.length > 0 && leftover[0] !== undefined && leftover[0] >= "5") {
    units += 1;
  }
  return neg ? -units : units;
}

/** Arrondi half-away-from-zero (commercial). */
export function divRound(numerator: number, denominator: number): number {
  if (denominator === 0) throw new Error("Division par zéro.");
  const neg = numerator < 0 !== denominator < 0;
  const a = Math.abs(numerator);
  const d = Math.abs(denominator);
  const q = Math.trunc(a / d);
  const r = a % d;
  const rounded = q + (r * 2 >= d ? 1 : 0);
  return neg ? -rounded : rounded;
}

/** Ligne HT = quantité × prix unitaire net, arrondi au centime. */
export function lineHtCents(qtyMilli: number, netUnitCents: number): number {
  return divRound(qtyMilli * netUnitCents, 1000);
}

/** TVA = base × taux / 100, arrondi au centime. */
export function vatCents(basisCents: number, rateCenti: number): number {
  return divRound(basisCents * rateCenti, 10_000);
}

export function centsToXml(cents: number): string {
  const neg = cents < 0;
  const a = Math.abs(cents);
  return `${neg ? "-" : ""}${Math.trunc(a / 100)}.${String(a % 100).padStart(2, "0")}`;
}

export function milliToXml(milli: number): string {
  const neg = milli < 0;
  const a = Math.abs(milli);
  return `${neg ? "-" : ""}${Math.trunc(a / 1000)}.${String(a % 1000).padStart(3, "0")}`;
}

export function xmlAmountToCents(raw: string): number {
  return toCents(raw.trim());
}
