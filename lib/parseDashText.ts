import type { ExtractedDashData } from "./types";

function to24Hour(hour12: number, minute: number, meridiem: string): string {
  let hour = hour12 % 12;
  if (/p/i.test(meridiem)) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Finds "3:45 PM - 8:12 PM" (or "to"/en-dash/em-dash separated) anywhere in the text. */
function findTimeRange(text: string): { start: string; end: string } | null {
  const re = /(\d{1,2}):(\d{2})\s*([AaPp]\.?[Mm]\.?)\s*(?:-|–|—|to|through)\s*(\d{1,2}):(\d{2})\s*([AaPp]\.?[Mm]\.?)/;
  const m = re.exec(text);
  if (m) {
    return {
      start: to24Hour(Number(m[1]), Number(m[2]), m[3]),
      end: to24Hour(Number(m[4]), Number(m[5]), m[6])
    };
  }

  // Fallback: some layouts print the two times separately, e.g. "Dashing since 11:02 AM"
  // / "Ended at 2:40 PM" rather than on one line. If exactly two clock times appear
  // anywhere in the text, assume the earlier one is the start and the later is the end.
  const single = /(\d{1,2}):(\d{2})\s*([AaPp]\.?[Mm]\.?)/g;
  const times: { minutesSinceMidnight: number; hhmm: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = single.exec(text))) {
    const hhmm = to24Hour(Number(match[1]), Number(match[2]), match[3]);
    const [h, mnt] = hhmm.split(":").map(Number);
    times.push({ minutesSinceMidnight: h * 60 + mnt, hhmm });
  }
  if (times.length === 2) {
    const [a, b] = times;
    return a.minutesSinceMidnight <= b.minutesSinceMidnight
      ? { start: a.hhmm, end: b.hhmm }
      : { start: b.hhmm, end: a.hhmm };
  }
  return null;
}

/**
 * Extracts a duration (in minutes) from a snippet like "4h 23m", "4 hr", or "45 min".
 * "Xh Ym" is checked first since that's DoorDash's own format and unambiguous; a bare
 * "H:MM" is deliberately NOT treated as a duration since it's indistinguishable from a
 * clock time (only "H:MM:SS", which clock times never show, is accepted as a fallback).
 */
function extractDurationMinutes(snippet: string): number | null {
  let m = /(\d{1,2})\s*h(?:r|rs|ours?)?\s*(\d{1,2})?\s*m/i.exec(snippet);
  if (m) return Number(m[1]) * 60 + Number(m[2] ?? 0);

  m = /(\d{1,2}):(\d{2}):(\d{2})/.exec(snippet);
  if (m) return Number(m[1]) * 60 + Number(m[2]);

  m = /(\d{1,2})\s*h(?:r|rs|ours?)?\b/i.exec(snippet);
  if (m) return Number(m[1]) * 60;

  m = /(\d{1,3})\s*m(?:in|ins|inutes?)?\b/i.exec(snippet);
  if (m) return Number(m[1]);

  return null;
}

function extractMoney(snippet: string): number | null {
  const m = /\$\s?(\d{1,4}(?:\.\d{2})?)/.exec(snippet);
  return m ? Number(m[1]) : null;
}

function extractInt(snippet: string): number | null {
  const m = /(\d{1,3})/.exec(snippet);
  return m ? Number(m[1]) : null;
}

function linesOf(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * Scans lines for one matching keywordRegex, then tries to extract a value from that
 * same line, then progressively further lines after and before it (closest first) —
 * since DoorDash screenshots put a stat's value on the same line as its label, or on
 * an adjacent line above/below it, but rarely further away than that.
 */
function valueNearKeyword<T>(lines: string[], keywordRegex: RegExp, extractor: (snippet: string) => T | null, maxDistance = 2): T | null {
  for (let i = 0; i < lines.length; i++) {
    if (!keywordRegex.test(lines[i])) continue;

    const sameLine = extractor(lines[i]);
    if (sameLine != null) return sameLine;

    for (let d = 1; d <= maxDistance; d++) {
      if (i + d < lines.length) {
        const after = extractor(lines[i + d]);
        if (after != null) return after;
      }
      if (i - d >= 0) {
        const before = extractor(lines[i - d]);
        if (before != null) return before;
      }
    }
  }
  return null;
}

function findFirstIndex(lines: string[], re: RegExp): number {
  return lines.findIndex((l) => re.test(l));
}

/** Like extractDurationMinutes, but returns every non-overlapping "Xh Ym" match in the string, in order. */
function extractAllDurations(snippet: string): number[] {
  const out: number[] = [];
  const re = /(\d{1,2})\s*h(?:r|rs|ours?)?\s*(\d{1,2})?\s*m/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(snippet))) {
    out.push(Number(m[1]) * 60 + Number(m[2] ?? 0));
  }
  return out;
}

function collectDurations(lines: string[], fromIdx: number, toIdx: number): number[] {
  const out: number[] = [];
  for (let i = fromIdx; i <= toIdx; i++) {
    if (i < 0 || i >= lines.length) continue;
    out.push(...extractAllDurations(lines[i]));
  }
  return out;
}

/**
 * Dash time and active time are commonly shown as two side-by-side stats (e.g.
 * "Time on Dash" / "Active Time" as adjacent columns, sometimes with both values
 * printed on one shared line, e.g. "4h 36m 3h 58m"). OCR reading order for a
 * 2-column layout comes out roughly as "label label value value" rather than
 * "label value label value" — sometimes even merging both labels (or both
 * values) onto a single text line — so a plain nearest-line search ends up
 * matching the same value to both labels. When the two labels are found on the
 * same or adjacent lines, this pairs values to labels by their relative
 * left-to-right / top-to-bottom order instead of by raw proximity.
 */
function resolveDashAndActiveMinutes(lines: string[], dashRe: RegExp, activeRe: RegExp): { dash: number | null; active: number | null } {
  const dashIdx = findFirstIndex(lines, dashRe);
  const activeIdx = findFirstIndex(lines, activeRe);

  if (dashIdx !== -1 && activeIdx !== -1 && Math.abs(dashIdx - activeIdx) <= 1) {
    let dashIsFirst: boolean;
    let blockStart: number;
    let blockEnd: number;

    if (dashIdx === activeIdx) {
      const line = lines[dashIdx];
      dashIsFirst = line.search(dashRe) <= line.search(activeRe);
      blockStart = blockEnd = dashIdx;
    } else {
      dashIsFirst = dashIdx < activeIdx;
      blockStart = Math.min(dashIdx, activeIdx);
      blockEnd = Math.max(dashIdx, activeIdx);
    }

    let twins = collectDurations(lines, blockStart, blockEnd);
    if (twins.length < 2) twins = collectDurations(lines, blockEnd + 1, blockEnd + 2);
    if (twins.length < 2) twins = collectDurations(lines, blockStart - 2, blockStart - 1);

    if (twins.length >= 2) {
      const [first, second] = twins;
      return dashIsFirst ? { dash: first, active: second } : { dash: second, active: first };
    }
  }

  return {
    dash: valueNearKeyword(lines, dashRe, extractDurationMinutes),
    active: valueNearKeyword(lines, activeRe, extractDurationMinutes)
  };
}

const MONTH_ABBR = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";

/**
 * DoorDash's weekly earnings overview (a date range like "Jul 20 - Jul 26", a
 * "Weekly goal" progress bar, and a list of individual dashes by date) shows
 * active/dash time and deliveries *totaled across the whole week*, not for one
 * dash, and has no per-dash clock time or "Total Pay" label at all. Detecting
 * it lets us tell the user to screenshot an individual dash instead of just
 * reporting a handful of fields as unreadable.
 */
function looksLikeWeeklySummary(text: string): boolean {
  if (/weekly goal/i.test(text)) return true;
  const dateRange = new RegExp(`\\b(${MONTH_ABBR})\\s+\\d{1,2}\\s*-\\s*(${MONTH_ABBR})?\\s*\\d{1,2}\\b`, "i");
  const hasClockTime = /\d{1,2}:\d{2}\s*[AaPp]\.?[Mm]\.?/.test(text);
  return dateRange.test(text) && !hasClockTime;
}

/**
 * Parses OCR text from a DoorDash dash-summary screenshot into structured fields.
 * This is a best-effort heuristic parser — the caller should always let the user
 * review and correct the results before saving, since OCR + layout differences
 * across app versions mean fields can be missed or misread.
 */
export function parseDashText(text: string): ExtractedDashData {
  const lines = linesOf(text);
  const timeRange = findTimeRange(text);

  const { dash: dashTimeMinutes, active: activeTimeMinutes } = resolveDashAndActiveMinutes(
    lines,
    /time on dash|dash time|total time|on[\s-]?dash/i,
    /active time|active/i
  );
  const earnings = valueNearKeyword(lines, /total pay|total earnings|earnings|you (?:made|earned)/i, extractMoney);
  const deliveries = valueNearKeyword(lines, /deliver(?:y|ies)|orders?/i, extractInt);

  const result: ExtractedDashData = {
    startTime: timeRange?.start ?? null,
    endTime: timeRange?.end ?? null,
    dashTimeMinutes,
    activeTimeMinutes,
    earnings,
    deliveries
  };

  if (looksLikeWeeklySummary(text)) {
    result.warning =
      "This looks like a weekly summary, not a single dash — its time/deliveries are totals for the whole week. " +
      "For accurate hourly rates, open an individual dash from the list and screenshot that instead.";
    return result;
  }

  const missing = (["startTime", "endTime", "dashTimeMinutes", "activeTimeMinutes", "earnings"] as const).filter(
    (key) => result[key] == null
  );
  if (missing.length > 0) {
    result.warning = `Couldn't read from the screenshot: ${missing.join(", ")}. Please fill these in manually.`;
  }

  return result;
}
