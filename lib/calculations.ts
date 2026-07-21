import type { DashEntry } from "./types";
import { DAY_NAMES, dayOfWeekIndex, minutesToHours, parseHHMM } from "./time";

export interface EntryRates {
  activeRate: number;
  dashRate: number;
}

/** Hourly rate is earnings divided by hours; 0 hours yields NaN (callers should guard/display "--"). */
export function ratesFor(entry: Pick<DashEntry, "earnings" | "dashTimeMinutes" | "activeTimeMinutes">): EntryRates {
  return {
    activeRate: entry.activeTimeMinutes > 0 ? entry.earnings / minutesToHours(entry.activeTimeMinutes) : NaN,
    dashRate: entry.dashTimeMinutes > 0 ? entry.earnings / minutesToHours(entry.dashTimeMinutes) : NaN
  };
}

export interface OverallSummary {
  count: number;
  totalEarnings: number;
  totalDashHours: number;
  totalActiveHours: number;
  totalMiles: number;
  avgActiveRate: number;
  avgDashRate: number;
  earningsPerMile: number;
}

export function overallSummary(entries: DashEntry[]): OverallSummary {
  const totalEarnings = entries.reduce((sum, e) => sum + e.earnings, 0);
  const totalDashMinutes = entries.reduce((sum, e) => sum + e.dashTimeMinutes, 0);
  const totalActiveMinutes = entries.reduce((sum, e) => sum + e.activeTimeMinutes, 0);
  const totalMiles = entries.reduce((sum, e) => sum + (e.mileage ?? 0), 0);
  const totalDashHours = minutesToHours(totalDashMinutes);
  const totalActiveHours = minutesToHours(totalActiveMinutes);
  return {
    count: entries.length,
    totalEarnings,
    totalDashHours,
    totalActiveHours,
    totalMiles,
    avgActiveRate: totalActiveHours > 0 ? totalEarnings / totalActiveHours : NaN,
    avgDashRate: totalDashHours > 0 ? totalEarnings / totalDashHours : NaN,
    earningsPerMile: totalMiles > 0 ? totalEarnings / totalMiles : NaN
  };
}

export interface GroupStat {
  key: string;
  label: string;
  count: number;
  totalEarnings: number;
  avgActiveRate: number;
  avgDashRate: number;
}

function summarizeGroup(key: string, label: string, group: DashEntry[]): GroupStat {
  const s = overallSummary(group);
  return {
    key,
    label,
    count: group.length,
    totalEarnings: s.totalEarnings,
    avgActiveRate: s.avgActiveRate,
    avgDashRate: s.avgDashRate
  };
}

/** Stats bucketed by day of week, Sunday..Saturday, always returning all 7 (count may be 0). */
export function byDayOfWeek(entries: DashEntry[]): GroupStat[] {
  return DAY_NAMES.map((name, idx) => {
    const group = entries.filter((e) => dayOfWeekIndex(e.date) === idx);
    return summarizeGroup(String(idx), name, group);
  });
}

/** Stats bucketed by the hour the dash started (0-23), only returning hours with data. */
export function byStartHour(entries: DashEntry[]): GroupStat[] {
  const buckets = new Map<number, DashEntry[]>();
  for (const e of entries) {
    const minutes = parseHHMM(e.startTime);
    if (minutes === null) continue;
    const hour = Math.floor(minutes / 60);
    if (!buckets.has(hour)) buckets.set(hour, []);
    buckets.get(hour)!.push(e);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, group]) => summarizeGroup(String(hour), formatHourLabel(hour), group));
}

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

/** Groups with at least this many dashes are eligible for "best" recommendations. */
const MIN_SAMPLE_SIZE = 2;

export function bestGroups(groups: GroupStat[], metric: "avgActiveRate" | "avgDashRate", topN = 3): GroupStat[] {
  return groups
    .filter((g) => g.count >= MIN_SAMPLE_SIZE && Number.isFinite(g[metric]))
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, topN);
}

export interface TimeSeriesPoint {
  date: string;
  earnings: number;
  activeRate: number;
  dashRate: number;
}

export function timeSeries(entries: DashEntry[]): TimeSeriesPoint[] {
  return [...entries]
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .map((e) => {
      const { activeRate, dashRate } = ratesFor(e);
      return { date: e.date, earnings: e.earnings, activeRate, dashRate };
    });
}
