"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useDashEntries } from "@/hooks/useDashEntries";
import { exportEntriesAsJSON } from "@/lib/storage";
import { byDayOfWeek, byStartHour } from "@/lib/calculations";
import UploadFlow from "@/components/UploadFlow";
import StatsSummary from "@/components/StatsSummary";
import HistoryView from "@/components/HistoryView";
import BestTimesPanel from "@/components/BestTimesPanel";
import EarningsRateChart from "@/components/charts/EarningsRateChart";
import EarningsOverTimeChart from "@/components/charts/EarningsOverTimeChart";
import GroupRateChart from "@/components/charts/GroupRateChart";

type Tab = "add" | "history" | "insights";

const TABS: { id: Tab; label: string }[] = [
  { id: "add", label: "Add" },
  { id: "history", label: "History" },
  { id: "insights", label: "Insights" }
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("add");
  const [authError, setAuthError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { user, authLoading, isCloudAvailable, signInWithGoogle, signOutUser } = useAuth();
  const {
    entries,
    loaded,
    addEntry,
    updateEntry,
    deleteEntry,
    importBackup,
    isSignedIn,
    localBackupAvailable,
    importing,
    importLocalToCloud,
    dismissLocalImportPrompt
  } = useDashEntries();

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
      await importBackup(parsed);
    } catch {
      alert("That file doesn't look like a valid Dasher backup.");
    }
  }

  async function handleSignIn() {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch {
      setAuthError("Couldn't sign in with Google. Please try again.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Dasher</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Track pay rates, mileage, and your best times to dash.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          {isCloudAvailable && !authLoading && (
            <>
              {isSignedIn ? (
                <button
                  onClick={signOutUser}
                  className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  {user?.photoURL && <img src={user.photoURL} alt="" className="h-4 w-4 rounded-full" />}
                  Sign out
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
                >
                  Sign in with Google
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {authError && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{authError}</p>
      )}

      {isSignedIn && localBackupAvailable && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-800 dark:bg-brand-950">
          <p className="text-neutral-700 dark:text-neutral-200">
            You have dashes saved on this device from before signing in. Copy them into your account so they sync everywhere?
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={importLocalToCloud}
              disabled={importing}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {importing ? "Importing..." : "Import to my account"}
            </button>
            <button
              onClick={dismissLocalImportPrompt}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <nav className="mb-6 flex gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-brand-500 text-white"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {!loaded ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : (
        <div className="space-y-6">
          {tab === "add" && <UploadFlow onSave={addEntry} />}

          {tab === "history" && <HistoryView entries={entries} onUpdate={updateEntry} onDelete={deleteEntry} />}

          {tab === "insights" && (
            <div className="space-y-6">
              <StatsSummary entries={entries} />
              <BestTimesPanel entries={entries} />
              <div className="grid gap-6 lg:grid-cols-2">
                <EarningsRateChart entries={entries} />
                <EarningsOverTimeChart entries={entries} />
                <GroupRateChart title="Avg $/hr by day of week" groups={byDayOfWeek(entries)} />
                <GroupRateChart title="Avg $/hr by start hour" groups={byStartHour(entries)} />
              </div>
            </div>
          )}

          <p className="pb-6 text-center text-xs text-neutral-400">
            {isSignedIn
              ? `Synced to your Google account (${user?.email}). Data lives in the cloud and updates across every device you sign into.`
              : "Data is stored only in this browser (localStorage). Use \"Export backup\" to save a copy, or sign in with Google to sync across devices."}
          </p>
        </div>
      )}
    </main>
  );
}
