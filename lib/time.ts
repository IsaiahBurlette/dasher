const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Parse "HH:MM" (24h) into total minutes since midnight. Returns null if invalid. */
export function parseHHMM(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Format minutes-since-midnight back into "HH:MM" (24h). */
export function formatHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Format a 24h "HH:MM" string as a friendly 12h time, e.g. "3:45 PM". */
export function formatFriendlyTime(hhmm: string): string {
  const minutes = parseHHMM(hhmm);
  if (minutes === null) return hhmm;
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Minutes elapsed between two "HH:MM" clock times, assuming the span may cross midnight. */
export function minutesBetween(start: string, end: string): number | null {
  const s = parseHHMM(start);
  const e = parseHHMM(end);
  if (s === null || e === null) return null;
  return e >= s ? e - s : 24 * 60 - s + e;
}

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatMoney(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return `${formatMoney(value)}/hr`;
}

/** Day-of-week name for a "YYYY-MM-DD" date string, parsed as a local calendar date. */
export function dayOfWeekName(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return DAY_NAMES[date.getDay()];
}

export function dayOfWeekIndex(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.getDay();
}

export function todayISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export { DAY_NAMES };
