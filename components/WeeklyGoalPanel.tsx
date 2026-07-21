"use client";

import { useState } from "react";
import type { DashEntry } from "@/lib/types";
import { currentWeekProgress } from "@/lib/grouping";
import { formatMoney } from "@/lib/time";

interface Props {
  entries: DashEntry[];
  weeklyGoal: number | null;
  onSetGoal: (goal: number | null) => Promise<void>;
}

export default function WeeklyGoalPanel({ entries, weeklyGoal, onSetGoal }: Props) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(weeklyGoal != null ? String(weeklyGoal) : "");
  const [saving, setSaving] = useState(false);

  const progress = currentWeekProgress(entries);

  function startEdit() {
    setInputValue(weeklyGoal != null ? String(weeklyGoal) : "");
    setEditing(true);
  }

  async function handleSave() {
    const value = Number(inputValue);
    if (!Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    try {
      await onSetGoal(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await onSetGoal(null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (weeklyGoal == null && !editing) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Set a weekly goal to track your progress right here.
          </p>
          <button
            onClick={startEdit}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
          >
            Set a weekly goal
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Weekly goal ($)
            <input
              type="number"
              min={1}
              step="1"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="input"
              placeholder="e.g. 800"
            />
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          {weeklyGoal != null && (
            <button
              onClick={handleRemove}
              disabled={saving}
              className="rounded-lg px-3 py-2 text-xs text-neutral-400 hover:text-red-600 disabled:opacity-60"
            >
              Remove goal
            </button>
          )}
        </div>
      </div>
    );
  }

  const goal = weeklyGoal as number;
  const percent = Math.min(100, Math.round((progress.totalEarnings / goal) * 100));
  const metGoal = progress.totalEarnings >= goal;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Weekly goal</span>
          <span className="ml-2 text-xs text-neutral-400">{progress.label}</span>
        </div>
        <button onClick={startEdit} className="text-xs text-neutral-400 hover:text-brand-500">
          Edit
        </button>
      </div>
      <div className="mb-1.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all ${metGoal ? "bg-green-500" : "bg-brand-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {formatMoney(progress.totalEarnings)} <span className="font-normal text-neutral-400">/ {formatMoney(goal)}</span>
        </span>
        <span className={metGoal ? "font-medium text-green-600 dark:text-green-400" : "text-neutral-500 dark:text-neutral-400"}>
          {metGoal ? "Goal met! 🎉" : `${percent}%`}
        </span>
      </div>
    </div>
  );
}
