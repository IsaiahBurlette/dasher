"use client";

import { useState } from "react";
import type { DashEntry } from "@/lib/types";
import { ratesFor } from "@/lib/calculations";
import { groupByWeekThenDay } from "@/lib/grouping";
import { deleteEntry, updateEntry } from "@/lib/storage";
import { formatDuration, formatFriendlyTime, formatMoney, formatRate } from "@/lib/time";

interface Props {
  entries: DashEntry[];
  onChange: (entries: DashEntry[]) => void;
}

export default function HistoryView({ entries, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mileageDraft, setMileageDraft] = useState<string>("");

  function startEdit(entry: DashEntry) {
    setEditingId(entry.id);
    setMileageDraft(entry.mileage != null ? String(entry.mileage) : "");
  }

  function saveMileage(id: string) {
    const value = mileageDraft.trim() === "" ? null : Number(mileageDraft);
    const next = updateEntry(id, { mileage: Number.isFinite(value as number) ? value : null });
    onChange(next);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this dash? This can't be undone.")) return;
    const next = deleteEntry(id);
    onChange(next);
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        No dashes logged yet. Head to the Add tab to log your first one.
      </p>
    );
  }

  const weeks = groupByWeekThenDay(entries);

  return (
    <div className="space-y-3">
      {weeks.map((week, weekIdx) => (
        <details
          key={week.weekStart}
          open={weekIdx === 0}
          className="group rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 transition-transform group-open:rotate-90">›</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">Week of {week.label}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <span>
                {week.count} dash{week.count === 1 ? "" : "es"}
              </span>
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{formatMoney(week.totalEarnings)}</span>
              <span className="hidden sm:inline">{formatRate(week.avgActiveRate)} active avg</span>
            </div>
          </summary>

          <div className="space-y-4 border-t border-neutral-100 px-4 py-4 dark:border-neutral-800">
            {week.days.map((day) => (
              <div key={day.date}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {day.dayName}, {day.date}
                  </h4>
                  {day.entries.length > 1 && (
                    <span className="text-xs text-neutral-400">
                      {day.entries.length} dashes &middot; {formatMoney(day.totalEarnings)} total
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {day.entries.map((entry) => {
                    const { activeRate, dashRate } = ratesFor(entry);
                    return (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <span className="text-sm text-neutral-600 dark:text-neutral-300">
                            {formatFriendlyTime(entry.startTime)} &ndash; {formatFriendlyTime(entry.endTime)}
                          </span>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="shrink-0 text-xs text-neutral-400 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm sm:grid-cols-3">
                          <Stat label="Dash time" value={formatDuration(entry.dashTimeMinutes)} />
                          <Stat label="Active time" value={formatDuration(entry.activeTimeMinutes)} />
                          <Stat label="Earnings" value={formatMoney(entry.earnings)} />
                          <Stat label="Active $/hr" value={formatRate(activeRate)} />
                          <Stat label="Dash $/hr" value={formatRate(dashRate)} />
                          <div>
                            <div className="text-xs text-neutral-500">Miles</div>
                            {editingId === entry.id ? (
                              <input
                                autoFocus
                                type="number"
                                step="0.1"
                                inputMode="decimal"
                                value={mileageDraft}
                                onChange={(e) => setMileageDraft(e.target.value)}
                                onBlur={() => saveMileage(entry.id)}
                                onKeyDown={(e) => e.key === "Enter" && saveMileage(entry.id)}
                                className="w-20 rounded border border-neutral-300 px-2 py-0.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(entry)}
                                className="rounded px-1 -mx-1 font-medium text-neutral-700 hover:bg-neutral-200 dark:text-neutral-200 dark:hover:bg-neutral-700"
                              >
                                {entry.mileage != null ? `${entry.mileage} mi` : "add"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-medium text-neutral-900 dark:text-neutral-100">{value}</div>
    </div>
  );
}
