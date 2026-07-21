"use client";

import { useMemo, useState } from "react";
import type { DashEntry } from "@/lib/types";
import { MONDAY_FIRST_ORDER, estimateDayEarnings, type EstimateConfidence } from "@/lib/calculations";
import { currentWeekProgress } from "@/lib/grouping";
import { DAY_NAMES, formatDuration, formatFriendlyTime, formatMoney, formatRate } from "@/lib/time";

interface TimeFrameInput {
  id: string;
  startTime: string;
  endTime: string;
}

let frameIdCounter = 0;
const emptyFrame = (): TimeFrameInput => ({ id: String((frameIdCounter += 1)), startTime: "", endTime: "" });

function confidenceNote(confidence: EstimateConfidence, dayName: string, sampleSize: number): string {
  switch (confidence) {
    case "day+hour":
      return `Based on ${sampleSize} ${dayName} dash${sampleSize === 1 ? "" : "es"} you've logged around this time.`;
    case "day":
      return `No ${dayName} dashes in this exact time range yet — based on ${sampleSize} ${dayName} dash${sampleSize === 1 ? "" : "es"} overall.`;
    case "hour":
      return `No ${dayName} data yet — based on ${sampleSize} dash${sampleSize === 1 ? "" : "es"} around this time on other days.`;
    case "overall":
      return `Not enough matching data yet — based on your overall average across ${sampleSize} dash${sampleSize === 1 ? "" : "es"}.`;
    case "none":
      return "No dash history yet — log a few dashes for an estimate.";
  }
}

export default function CalculatorPanel({ entries, weeklyGoal }: { entries: DashEntry[]; weeklyGoal: number | null }) {
  const [dayIdx, setDayIdx] = useState<number>(1); // Monday
  const [frames, setFrames] = useState<TimeFrameInput[]>([emptyFrame()]);

  const dayName = DAY_NAMES[dayIdx];

  const validFrames = useMemo(() => frames.filter((f) => f.startTime && f.endTime), [frames]);

  const estimates = useMemo(
    () => estimateDayEarnings(entries, dayIdx, validFrames),
    [entries, dayIdx, validFrames]
  );

  const total = estimates.reduce((sum, e) => sum + e.estimatedEarnings, 0);
  const totalHours = estimates.reduce((sum, e) => sum + e.hours, 0);
  const weekSoFar = currentWeekProgress(entries).totalEarnings;
  const projectedWeekTotal = weekSoFar + total;

  function updateFrame(id: string, patch: Partial<TimeFrameInput>) {
    setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFrame(id: string) {
    setFrames((prev) => prev.filter((f) => f.id !== id));
  }

  function addFrame() {
    setFrames((prev) => [...prev, emptyFrame()]);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Earnings calculator</h2>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Pick a day and the time frames you plan to work, and this projects what you'd make based on your own
          logged history for that day and those times.
        </p>

        <div className="mb-5">
          <div className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">Day</div>
          <div className="flex flex-wrap gap-1.5">
            {MONDAY_FIRST_ORDER.map((idx) => (
              <button
                key={idx}
                onClick={() => setDayIdx(idx)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  dayIdx === idx
                    ? "bg-brand-500 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                }`}
              >
                {DAY_NAMES[idx].slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Time frames</div>
          {frames.length === 0 && (
            <p className="text-sm text-neutral-400">No time frames yet — add one below.</p>
          )}
          {frames.map((frame) => (
            <div key={frame.id} className="flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Start
                <input
                  type="time"
                  value={frame.startTime}
                  onChange={(e) => updateFrame(frame.id, { startTime: e.target.value })}
                  className="input"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                End
                <input
                  type="time"
                  value={frame.endTime}
                  onChange={(e) => updateFrame(frame.id, { endTime: e.target.value })}
                  className="input"
                />
              </label>
              <button
                onClick={() => removeFrame(frame.id)}
                aria-label="Remove time frame"
                className="mb-0.5 shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addFrame}
            className="w-full rounded-lg border border-dashed border-neutral-300 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            + Add another time frame
          </button>
        </div>
      </div>

      {estimates.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Projection for {dayName}
          </h3>
          <div className="space-y-3">
            {estimates.map((est, i) => (
              <div key={i} className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {formatFriendlyTime(est.startTime)} &ndash; {formatFriendlyTime(est.endTime)}{" "}
                    <span className="font-normal text-neutral-400">({formatDuration(est.hours * 60)})</span>
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatMoney(est.estimatedEarnings)}
                  </span>
                </div>
                <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
                  ~{formatRate(est.dashRate)} avg dash rate
                </div>
                <div className="text-xs text-neutral-400">{confidenceNote(est.confidence, dayName, est.sampleSize)}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-brand-50 p-4 dark:bg-brand-950">
            <div className="text-sm text-neutral-700 dark:text-neutral-200">
              Projected total for {dayName} &middot; {formatDuration(totalHours * 60)}
            </div>
            <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{formatMoney(total)}</div>
          </div>

          {weeklyGoal != null && (
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              You've made {formatMoney(weekSoFar)} this week. Add this shift and you'd be at{" "}
              <span className="font-medium text-neutral-700 dark:text-neutral-200">{formatMoney(projectedWeekTotal)}</span> of
              your {formatMoney(weeklyGoal)} weekly goal
              {projectedWeekTotal >= weeklyGoal ? " — enough to hit it! 🎉" : "."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
