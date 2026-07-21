import { v4 as uuidv4 } from "uuid";
import type { DashEntry, NewDashEntryInput } from "./types";

const STORAGE_KEY = "dasher.entries.v1";
const WEEKLY_GOAL_KEY = "dasher.weeklyGoal.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadWeeklyGoal(): number | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(WEEKLY_GOAL_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function saveWeeklyGoal(value: number | null): void {
  if (!isBrowser()) return;
  if (value == null) {
    window.localStorage.removeItem(WEEKLY_GOAL_KEY);
  } else {
    window.localStorage.setItem(WEEKLY_GOAL_KEY, String(value));
  }
}

export function loadEntries(): DashEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveEntries(entries: DashEntry[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addEntry(input: NewDashEntryInput): DashEntry {
  const entry: DashEntry = {
    ...input,
    id: uuidv4(),
    createdAt: new Date().toISOString()
  };
  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);
  return entry;
}

export function updateEntry(id: string, patch: Partial<NewDashEntryInput>): DashEntry[] {
  const entries = loadEntries().map((e) => (e.id === id ? { ...e, ...patch } : e));
  saveEntries(entries);
  return entries;
}

export function deleteEntry(id: string): DashEntry[] {
  const entries = loadEntries().filter((e) => e.id !== id);
  saveEntries(entries);
  return entries;
}

export function replaceAllEntries(entries: DashEntry[]): void {
  saveEntries(entries);
}

export function exportEntriesAsJSON(entries: DashEntry[]): string {
  return JSON.stringify(entries, null, 2);
}
