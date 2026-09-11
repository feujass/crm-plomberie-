/** Parse durée saisie (ex: 1h30, 45min, 1,5) en heures décimales */
export function parseHours(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const minutesMatch = raw.match(/^(\d+)\s*(min|m)$/i);
  if (minutesMatch) {
    const minutes = Number(minutesMatch[1]);
    if (Number.isFinite(minutes) && minutes >= 0) return minutes / 60;
  }
  if (raw.includes("h")) {
    const [hoursPart, minutesPart] = raw.split("h");
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && minutes >= 0 && minutes <= 59) {
      return hours + minutes / 60;
    }
  }
  if (raw.includes(":")) {
    const [hoursPart, minutesPart] = raw.split(":");
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && minutes >= 0 && minutes <= 59) {
      return hours + minutes / 60;
    }
  }
  if (raw.includes(",")) {
    const [hoursPart, minutesPart] = raw.split(",");
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && minutes >= 0 && minutes <= 59) {
      return hours + minutes / 60;
    }
    const fallback = Number(raw.replace(",", "."));
    return Number.isFinite(fallback) ? fallback : 0;
  }
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
