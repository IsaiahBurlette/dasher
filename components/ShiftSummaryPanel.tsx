import type { DashEntry } from "@/lib/types";
import { bestGroups, byShift } from "@/lib/calculations";
import { formatRate } from "@/lib/time";

export default function ShiftSummaryPanel({ entries }: { entries: DashEntry[] }) {
  const shifts = byShift(entries);
  const [best] = bestGroups(shifts, "avgActiveRate", 1);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Best shift to dash</h3>
      <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
        Your dashes grouped into meal shifts by start time, averaged by active $/hr (needs at least 2 dashes in a
        shift to qualify).
      </p>

      {best ? (
        <p className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-neutral-800 dark:bg-brand-950 dark:text-neutral-100">
          <span className="font-semibold">{best.label}</span> ({shifts.find((s) => s.key === best.key)?.timeRange}) is
          your best shift, averaging <span className="font-semibold">{formatRate(best.avgActiveRate)}</span> active.
        </p>
      ) : (
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Log a couple more dashes in the same shift to unlock a recommendation.
        </p>
      )}

      <div className="space-y-2">
        {shifts.map((shift) => (
          <div
            key={shift.key}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              best?.key === shift.key
                ? "bg-brand-50 dark:bg-brand-950"
                : "bg-neutral-50 dark:bg-neutral-800"
            }`}
          >
            <div>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{shift.label}</span>
              <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">{shift.timeRange}</span>
              {best?.key === shift.key && (
                <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-medium uppercase text-white">
                  Best
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="font-medium text-neutral-900 dark:text-neutral-100">
                {shift.count > 0 ? formatRate(shift.avgActiveRate) : "--"}
              </div>
              <div className="text-xs text-neutral-400">
                {shift.count} dash{shift.count === 1 ? "" : "es"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
