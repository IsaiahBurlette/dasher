import type { DashEntry } from "./types";
import { overallSummary } from "./calculations";
import { dayOfWeekName, todayISODate } from "./time";

export interface DayGroup {
  date: string;
  dayName: string;
  entries: DashEntry[];
  totalEarnings: number;
  totalMiles: number;
  totalDashHours: number;
  totalActiveHours: number;
  avgActiveRate: number;
  avgDashRate: number;
}

export interface WeekGroup {
  weekStart: string;
  weekEnd: string;
  label: string;
  days: DayGroup[];
  totalEarnings: number;
  totalMiles: number;
  totalDashHours: number;
  totalActiveHours: number;
  avgActiveRate: number;
  avgDashRate: number;
  count: number;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday-start week containing the given date, as an ISO date string. */
function weekStartFor(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return toISODate(date);
}

function weekEndFor(weekStart: string): string {
  const date = parseLocalDate(weekStart);
  date.setDate(date.getDate() + 6);
  return toISODate(date);
}

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = parseLocalDate(weekStart);
  const end = parseLocalDate(weekEnd);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const yearSuffix = start.getFullYear() !== new Date().getFullYear() ? `, ${start.getFullYear()}` : "";
  return `${fmt(start)} – ${fmt(end)}${yearSuffix}`;
}

/** Buckets entries into Monday-start weeks (most recent first), then by day within each week (most recent first). */
export function groupByWeekThenDay(entries: DashEntry[]): WeekGroup[] {
  const byWeek = new Map<string, DashEntry[]>();
  for (const entry of entries) {
    const weekStart = weekStartFor(entry.date);
    if (!byWeek.has(weekStart)) byWeek.set(weekStart, []);
    byWeek.get(weekStart)!.push(entry);
  }

  const weeks: WeekGroup[] = Array.from(byWeek.entries()).map(([weekStart, weekEntries]) => {
    const byDay = new Map<string, DashEntry[]>();
    for (const entry of weekEntries) {
      if (!byDay.has(entry.date)) byDay.set(entry.date, []);
      byDay.get(entry.date)!.push(entry);
    }

    const days: DayGroup[] = Array.from(byDay.entries())
      .map(([date, dayEntries]) => {
        const s = overallSummary(dayEntries);
        return {
          date,
          dayName: dayOfWeekName(date),
          entries: [...dayEntries].sort((a, b) => b.startTime.localeCompare(a.startTime)),
          totalEarnings: s.totalEarnings,
          totalMiles: s.totalMiles,
          totalDashHours: s.totalDashHours,
          totalActiveHours: s.totalActiveHours,
          avgActiveRate: s.avgActiveRate,
          avgDashRate: s.avgDashRate
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const weekEnd = weekEndFor(weekStart);
    const s = overallSummary(weekEntries);
    return {
      weekStart,
      weekEnd,
      label: formatWeekLabel(weekStart, weekEnd),
      days,
      totalEarnings: s.totalEarnings,
      totalMiles: s.totalMiles,
      totalDashHours: s.totalDashHours,
      totalActiveHours: s.totalActiveHours,
      avgActiveRate: s.avgActiveRate,
      avgDashRate: s.avgDashRate,
      count: weekEntries.length
    };
  });

  return weeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export interface CurrentWeekProgress {
  weekStart: string;
  weekEnd: string;
  label: string;
  totalEarnings: number;
}

/** Total earnings so far in the current Monday-Sunday week (0 if nothing logged yet this week). */
export function currentWeekProgress(entries: DashEntry[]): CurrentWeekProgress {
  const weekStart = weekStartFor(todayISODate());
  const weekEnd = weekEndFor(weekStart);
  const totalEarnings = entries
    .filter((e) => e.date >= weekStart && e.date <= weekEnd)
    .reduce((sum, e) => sum + e.earnings, 0);
  return { weekStart, weekEnd, label: formatWeekLabel(weekStart, weekEnd), totalEarnings };
}
