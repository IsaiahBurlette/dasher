import type { DashEntry } from "./types";
import { DAY_NAMES, dayOfWeekIndex, minutesBetween, minutesToHours, parseHHMM } from "./time";

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

/** Monday..Sunday order (matching the work week), always returning all 7 (count may be 0). */
export const MONDAY_FIRST_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Stats bucketed by day of week, Monday..Sunday, always returning all 7 (count may be 0). */
export function byDayOfWeek(entries: DashEntry[]): GroupStat[] {
  return MONDAY_FIRST_ORDER.map((idx) => {
    const group = entries.filter((e) => dayOfWeekIndex(e.date) === idx);
    return summarizeGroup(String(idx), DAY_NAMES[idx], group);
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

/** A rough, purely descriptive time-of-day label — not a boundary definition. */
function descriptiveLabelForHour(hour: number): string {
  if (hour >= 5 && hour < 11) return "Morning";
  if (hour >= 11 && hour < 14) return "Midday";
  if (hour >= 14 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Late Night";
}

export interface TimeWindowStat extends GroupStat {
  timeRange: string;
  startHour: number;
  endHour: number;
}

/**
 * Finds the contiguous blocks of hours the user actually dashes in — e.g. if
 * someone logs dashes at 11am, noon, and 1pm but nothing at 2-4pm, then dashes
 * again at 5-8pm, that's two windows: 11am-2pm and 5-9pm. Unlike fixed meal
 * hours ("lunch is 10am-2pm"), this adapts to whatever times the data shows,
 * since peak hours vary a lot by market. Hours with zero logged dashes create
 * a break between windows; a window that reaches hour 23 and one that starts
 * at hour 0 are merged, since that's really one continuous block across
 * midnight.
 */
export function detectTimeWindows(entries: DashEntry[]): TimeWindowStat[] {
  const byHour = new Map<number, DashEntry[]>();
  for (const e of entries) {
    const minutes = parseHHMM(e.startTime);
    if (minutes === null) continue;
    const hour = Math.floor(minutes / 60);
    if (!byHour.has(hour)) byHour.set(hour, []);
    byHour.get(hour)!.push(e);
  }

  const hoursWithData = Array.from(byHour.keys()).sort((a, b) => a - b);
  if (hoursWithData.length === 0) return [];

  const runs: number[][] = [[hoursWithData[0]]];
  for (let i = 1; i < hoursWithData.length; i++) {
    if (hoursWithData[i] === hoursWithData[i - 1] + 1) {
      runs[runs.length - 1].push(hoursWithData[i]);
    } else {
      runs.push([hoursWithData[i]]);
    }
  }

  if (runs.length > 1) {
    const first = runs[0];
    const last = runs[runs.length - 1];
    if (first[0] === 0 && last[last.length - 1] === 23) {
      runs[0] = [...last, ...first];
      runs.pop();
    }
  }

  return runs
    .map((hours) => {
      const group = hours.flatMap((h) => byHour.get(h) ?? []);
      const startHour = hours[0];
      const endHour = (hours[hours.length - 1] + 1) % 24;
      const midHour = hours[Math.floor(hours.length / 2)];
      const timeRange = `${formatHourLabel(startHour)} – ${formatHourLabel(endHour)}`;
      return {
        ...summarizeGroup(`${startHour}-${endHour}`, descriptiveLabelForHour(midHour), group),
        timeRange,
        startHour,
        endHour
      };
    })
    .sort((a, b) => a.startHour - b.startHour);
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

/** Which hours (0-23) a clock window touches, walking forward from the start hour and wrapping past midnight. */
function hoursInWindow(startMinutes: number, endMinutes: number): number[] {
  const totalMinutes = endMinutes > startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
  const hourCount = Math.max(1, Math.ceil(totalMinutes / 60));
  const startHour = Math.floor(startMinutes / 60) % 24;
  const hours: number[] = [];
  let hour = startHour;
  for (let i = 0; i < hourCount; i++) {
    hours.push(hour);
    hour = (hour + 1) % 24;
  }
  return Array.from(new Set(hours));
}

export type EstimateConfidence = "day+hour" | "day" | "hour" | "overall" | "none";

export interface RateEstimate {
  activeRate: number;
  dashRate: number;
  sampleSize: number;
  confidence: EstimateConfidence;
}

/**
 * Estimates a $/hr rate for a given day-of-week + clock window, falling back
 * through progressively broader (and less specific) slices of history when
 * there isn't enough data for the exact combination:
 *   1. dashes on that weekday, starting within that window
 *   2. dashes on that weekday, any time
 *   3. dashes in that window, any day
 *   4. overall average across everything logged
 * `confidence` tells the caller which tier was actually used.
 */
export function estimateRateForDayAndWindow(
  entries: DashEntry[],
  dayIdx: number,
  startMinutes: number,
  endMinutes: number
): RateEstimate {
  const hours = hoursInWindow(startMinutes, endMinutes);
  const startHourOf = (e: DashEntry): number | null => {
    const minutes = parseHHMM(e.startTime);
    return minutes === null ? null : Math.floor(minutes / 60);
  };

  const dayAndHour = entries.filter((e) => dayOfWeekIndex(e.date) === dayIdx && hours.includes(startHourOf(e) ?? -1));
  if (dayAndHour.length > 0) {
    const s = overallSummary(dayAndHour);
    return { activeRate: s.avgActiveRate, dashRate: s.avgDashRate, sampleSize: dayAndHour.length, confidence: "day+hour" };
  }

  const dayOnly = entries.filter((e) => dayOfWeekIndex(e.date) === dayIdx);
  if (dayOnly.length > 0) {
    const s = overallSummary(dayOnly);
    return { activeRate: s.avgActiveRate, dashRate: s.avgDashRate, sampleSize: dayOnly.length, confidence: "day" };
  }

  const hourOnly = entries.filter((e) => hours.includes(startHourOf(e) ?? -1));
  if (hourOnly.length > 0) {
    const s = overallSummary(hourOnly);
    return { activeRate: s.avgActiveRate, dashRate: s.avgDashRate, sampleSize: hourOnly.length, confidence: "hour" };
  }

  if (entries.length > 0) {
    const s = overallSummary(entries);
    return { activeRate: s.avgActiveRate, dashRate: s.avgDashRate, sampleSize: entries.length, confidence: "overall" };
  }

  return { activeRate: NaN, dashRate: NaN, sampleSize: 0, confidence: "none" };
}

export interface TimeFrameEstimate {
  startTime: string;
  endTime: string;
  hours: number;
  estimatedEarnings: number;
  activeRate: number;
  dashRate: number;
  sampleSize: number;
  confidence: EstimateConfidence;
}

/** Projects earnings for a set of clock time frames on a given day of week, based on historical rates (see estimateRateForDayAndWindow). */
export function estimateDayEarnings(
  entries: DashEntry[],
  dayIdx: number,
  timeFrames: { startTime: string; endTime: string }[]
): TimeFrameEstimate[] {
  return timeFrames.map(({ startTime, endTime }) => {
    const startMinutes = parseHHMM(startTime);
    const endMinutes = parseHHMM(endTime);
    if (startMinutes === null || endMinutes === null) {
      return { startTime, endTime, hours: 0, estimatedEarnings: 0, activeRate: NaN, dashRate: NaN, sampleSize: 0, confidence: "none" };
    }
    const totalMinutes = minutesBetween(startTime, endTime) ?? 0;
    const hours = minutesToHours(totalMinutes);
    const est = estimateRateForDayAndWindow(entries, dayIdx, startMinutes, endMinutes);
    const estimatedEarnings = Number.isFinite(est.dashRate) ? est.dashRate * hours : 0;
    return {
      startTime,
      endTime,
      hours,
      estimatedEarnings,
      activeRate: est.activeRate,
      dashRate: est.dashRate,
      sampleSize: est.sampleSize,
      confidence: est.confidence
    };
  });
}
