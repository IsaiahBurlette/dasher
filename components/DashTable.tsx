"use client";

import { useState } from "react";
import type { DashEntry } from "@/lib/types";
import { ratesFor } from "@/lib/calculations";
import { deleteEntry, updateEntry } from "@/lib/storage";
import { dayOfWeekName, formatFriendlyTime, formatMoney, formatRate } from "@/lib/time";

interface Props {
  entries: DashEntry[];
  onChange: (entries: DashEntry[]) => void;
}

export default function DashTable({ entries, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mileageDraft, setMileageDraft] = useState<string>("");

  const sorted = [...entries].sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));

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
        No dashes logged yet. Add one above to get started.
      </p>
    );
  }

  function MileageEditor({ entry }: { entry: DashEntry }) {
    return editingId === entry.id ? (
      <input
        autoFocus
        type="number"
        step="0.1"
        inputMode="decimal"
        value={mileageDraft}
        onChange={(e) => setMileageDraft(e.target.value)}
        onBlur={() => saveMileage(entry.id)}
        onKeyDown={(e) => e.key === "Enter" && saveMileage(entry.id)}
        className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
      />
    ) : (
      <button
        onClick={() => startEdit(entry)}
        className="rounded px-1 py-0.5 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        title="Tap to edit"
      >
        {entry.mileage != null ? `${entry.mileage} mi` : "add miles"}
      </button>
    );
  }

  return (
    <>
      {/* Card layout: mobile only */}
      <div className="space-y-3 md:hidden">
        {sorted.map((entry) => {
          const { activeRate, dashRate } = ratesFor(entry);
          return (
            <div
              key={entry.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">{entry.date}</div>
                  <div className="text-xs text-neutral-500">
                    {dayOfWeekName(entry.date)} &middot; {formatFriendlyTime(entry.startTime)} &ndash;{" "}
                    {formatFriendlyTime(entry.endTime)}
                  </div>
                </div>
                <button onClick={() => handleDelete(entry.id)} className="text-xs text-neutral-400 hover:text-red-600">
                  Delete
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-neutral-500">Earnings</div>
                  <div className="font-medium">{formatMoney(entry.earnings)}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Miles</div>
                  <MileageEditor entry={entry} />
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Active $/hr</div>
                  <div className="font-medium">{formatRate(activeRate)}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Dash $/hr</div>
                  <div className="font-medium">{formatRate(dashRate)}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Dash time</div>
                  <div>{(entry.dashTimeMinutes / 60).toFixed(1)}h</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Active time</div>
                  <div>{(entry.activeTimeMinutes / 60).toFixed(1)}h</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table layout: md and up */}
      <div className="hidden overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time frame</th>
              <th className="px-4 py-3">Dash time</th>
              <th className="px-4 py-3">Active time</th>
              <th className="px-4 py-3">Earnings</th>
              <th className="px-4 py-3">Active $/hr</th>
              <th className="px-4 py-3">Dash $/hr</th>
              <th className="px-4 py-3">Miles</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const { activeRate, dashRate } = ratesFor(entry);
              return (
                <tr key={entry.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{entry.date}</div>
                    <div className="text-xs text-neutral-500">{dayOfWeekName(entry.date)}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                    {formatFriendlyTime(entry.startTime)} &ndash; {formatFriendlyTime(entry.endTime)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{(entry.dashTimeMinutes / 60).toFixed(1)}h</td>
                  <td className="px-4 py-3 whitespace-nowrap">{(entry.activeTimeMinutes / 60).toFixed(1)}h</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{formatMoney(entry.earnings)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatRate(activeRate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatRate(dashRate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <MileageEditor entry={entry} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button onClick={() => handleDelete(entry.id)} className="text-xs text-neutral-400 hover:text-red-600">
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
