"use client";

import { useEffect, useRef, useState } from "react";
import type { DashEntry } from "@/lib/types";
import { loadEntries, exportEntriesAsJSON, replaceAllEntries } from "@/lib/storage";
import { byDayOfWeek, byStartHour } from "@/lib/calculations";
import UploadFlow from "@/components/UploadFlow";
import StatsSummary from "@/components/StatsSummary";
import DashTable from "@/components/DashTable";
import BestTimesPanel from "@/components/BestTimesPanel";
import EarningsRateChart from "@/components/charts/EarningsRateChart";
import EarningsOverTimeChart from "@/components/charts/EarningsOverTimeChart";
import GroupRateChart from "@/components/charts/GroupRateChart";

export default function Home() {
  const [entries, setEntries] = useState<DashEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEntries(loadEntries());
    setLoaded(true);
  }, []);

  function handleExport() {
    const blob = new Blob([exportEntriesAsJSON(entries)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dasher-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      replaceAllEntries(parsed);
      setEntries(parsed);
    } catch {
      alert("That file doesn't look like a valid Dasher backup.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Dasher</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Upload dash screenshots to track pay rates, mileage, and your best times to dash.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={entries.length === 0}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Export backup
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Import backup
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
        </div>
      </header>

      {!loaded ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : (
        <div className="space-y-6">
          <UploadFlow onSaved={(entry) => setEntries((prev) => [...prev, entry])} />

          <StatsSummary entries={entries} />

          <BestTimesPanel entries={entries} />

          <div className="grid gap-6 lg:grid-cols-2">
            <EarningsRateChart entries={entries} />
            <EarningsOverTimeChart entries={entries} />
            <GroupRateChart title="Avg $/hr by day of week" groups={byDayOfWeek(entries)} />
            <GroupRateChart title="Avg $/hr by start hour" groups={byStartHour(entries)} />
          </div>

          <DashTable entries={entries} onChange={setEntries} />

          <p className="pb-6 text-center text-xs text-neutral-400">
            Data is stored only in this browser (localStorage). Use "Export backup" to save a copy.
          </p>
        </div>
      )}
    </main>
  );
}
