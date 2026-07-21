"use client";

import { useRef, useState } from "react";
import type { DashEntry, ExtractedDashData, NewDashEntryInput } from "@/lib/types";
import { minutesBetween, todayISODate } from "@/lib/time";
import { addEntry } from "@/lib/storage";

interface DraftEntry {
  date: string;
  startTime: string;
  endTime: string;
  dashTimeMinutes: string;
  activeTimeMinutes: string;
  earnings: string;
  deliveries: string;
  mileage: string;
  notes: string;
}

const emptyDraft = (): DraftEntry => ({
  date: todayISODate(),
  startTime: "",
  endTime: "",
  dashTimeMinutes: "",
  activeTimeMinutes: "",
  earnings: "",
  deliveries: "",
  mileage: "",
  notes: ""
});

function extractedToDraft(data: ExtractedDashData): DraftEntry {
  const draft = emptyDraft();
  if (data.startTime) draft.startTime = data.startTime;
  if (data.endTime) draft.endTime = data.endTime;
  if (data.dashTimeMinutes != null) draft.dashTimeMinutes = String(Math.round(data.dashTimeMinutes));
  else if (data.startTime && data.endTime) {
    const computed = minutesBetween(data.startTime, data.endTime);
    if (computed != null) draft.dashTimeMinutes = String(computed);
  }
  if (data.activeTimeMinutes != null) draft.activeTimeMinutes = String(Math.round(data.activeTimeMinutes));
  if (data.earnings != null) draft.earnings = String(data.earnings);
  if (data.deliveries != null) draft.deliveries = String(data.deliveries);
  return draft;
}

export default function UploadFlow({ onSaved }: { onSaved: (entry: DashEntry) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "review" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEntry>(emptyDraft());
  const [justSaved, setJustSaved] = useState(false);

  async function handleFile(file: File) {
    setJustSaved(false);
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setStatus("loading");
    setErrorMessage(null);
    setWarning(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Extraction failed.");
        setDraft(emptyDraft());
        setStatus("error");
        return;
      }
      setDraft(extractedToDraft(data as ExtractedDashData));
      if ((data as ExtractedDashData).warning) setWarning((data as ExtractedDashData).warning!);
      setStatus("review");
    } catch {
      setErrorMessage("Network error while contacting the extraction API.");
      setStatus("error");
    }
  }

  function updateDraft<K extends keyof DraftEntry>(key: K, value: DraftEntry[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if ((key === "startTime" || key === "endTime") && next.startTime && next.endTime) {
        const computed = minutesBetween(next.startTime, next.endTime);
        if (computed != null) next.dashTimeMinutes = String(computed);
      }
      return next;
    });
  }

  function reset() {
    setStatus("idle");
    setPreview(null);
    setFileName(null);
    setErrorMessage(null);
    setWarning(null);
    setDraft(emptyDraft());
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function dismissCancel() {
    setJustSaved(false);
    reset();
  }

  function handleManualEntry() {
    setJustSaved(false);
    setPreview(null);
    setFileName(null);
    setErrorMessage(null);
    setWarning(null);
    setDraft(emptyDraft());
    setStatus("review");
  }

  function handleSave() {
    const earnings = Number(draft.earnings);
    const dashTimeMinutes = Number(draft.dashTimeMinutes);
    const activeTimeMinutes = Number(draft.activeTimeMinutes);
    if (!draft.startTime || !draft.endTime) {
      setErrorMessage("Start and end time are required.");
      return;
    }
    if (!Number.isFinite(earnings) || !Number.isFinite(dashTimeMinutes) || !Number.isFinite(activeTimeMinutes)) {
      setErrorMessage("Earnings, dash time, and active time must be numbers.");
      return;
    }
    const input: NewDashEntryInput = {
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      dashTimeMinutes,
      activeTimeMinutes,
      earnings,
      deliveries: draft.deliveries ? Number(draft.deliveries) : null,
      mileage: draft.mileage ? Number(draft.mileage) : null,
      notes: draft.notes,
      sourceFileName: fileName
    };
    const entry = addEntry(input);
    onSaved(entry);
    reset();
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 3000);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Add a dash</h2>

      {status === "idle" && (
        <div className="space-y-3">
          {justSaved && (
            <p className="rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
              ✓ Dash saved
            </p>
          )}
          <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-500 dark:border-neutral-700 dark:text-neutral-400 sm:p-10">
            <span className="text-2xl">📸</span>
            <span>Tap to take a photo or upload a screenshot of your dash summary</span>
            <span className="text-xs text-neutral-400">PNG or JPG, up to 10MB</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            or
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          </div>
          <button
            onClick={handleManualEntry}
            className="w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Enter a dash manually (no screenshot)
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-neutral-500">
          {preview && <img src={preview} alt="preview" className="max-h-48 rounded-lg border border-neutral-200" />}
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            Reading screenshot...
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-3">
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errorMessage}
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Try again
          </button>
        </div>
      )}

      {status === "review" && (
        <div className={`grid gap-5 ${preview ? "md:grid-cols-[220px_1fr]" : ""}`}>
          {preview && (
            <img src={preview} alt="preview" className="h-fit max-h-72 w-full rounded-lg border border-neutral-200 object-contain dark:border-neutral-800" />
          )}
          <div className="space-y-3">
            {warning && (
              <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {warning}
              </p>
            )}
            {errorMessage && (
              <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                {errorMessage}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Date">
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => updateDraft("date", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Start time">
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={(e) => updateDraft("startTime", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="End time">
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(e) => updateDraft("endTime", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Dash time (min)">
                <input
                  type="number"
                  value={draft.dashTimeMinutes}
                  onChange={(e) => updateDraft("dashTimeMinutes", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Active time (min)">
                <input
                  type="number"
                  value={draft.activeTimeMinutes}
                  onChange={(e) => updateDraft("activeTimeMinutes", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Earnings ($)">
                <input
                  type="number"
                  step="0.01"
                  value={draft.earnings}
                  onChange={(e) => updateDraft("earnings", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Deliveries">
                <input
                  type="number"
                  value={draft.deliveries}
                  onChange={(e) => updateDraft("deliveries", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Mileage (mi)">
                <input
                  type="number"
                  step="0.1"
                  value={draft.mileage}
                  onChange={(e) => updateDraft("mileage", e.target.value)}
                  className="input"
                  placeholder="enter miles driven"
                />
              </Field>
              <Field label="Notes" className="col-span-2 sm:col-span-3">
                <input
                  type="text"
                  value={draft.notes}
                  onChange={(e) => updateDraft("notes", e.target.value)}
                  className="input"
                  placeholder="optional"
                />
              </Field>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Save dash
              </button>
              <button
                onClick={dismissCancel}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400 ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}
