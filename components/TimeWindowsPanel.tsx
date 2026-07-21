import type { DashEntry } from "@/lib/types";
import { bestGroups, detectTimeWindows } from "@/lib/calculations";
import { formatRate } from "@/lib/time";

export default function TimeWindowsPanel({ entries }: { entries: DashEntry[] }) {
  const windows = detectTimeWindows(entries);
  const [best] = bestGroups(windows, "avgActiveRate", 1);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Best time window to dash</h3>
      <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
        Detected from when you've actually dashed — not fixed meal hours, since peak times vary by market. A gap of
        an hour or more with no logged dashes splits one window from the next (needs at least 2 dashes in a window
        to qualify as "best").
      </p>

      {windows.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Log a few dashes at different times of day to see your windows here.
        </p>
      )}

      {windows.length > 0 && !best && (
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Log a couple more dashes in the same time window to unlock a recommendation.
        </p>
      )}

      {best && (
        <p className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-neutral-800 dark:bg-brand-950 dark:text-neutral-100">
          <span className="font-semibold">{windows.find((w) => w.key === best.key)?.timeRange}</span> is your best
          window, averaging <span className="font-semibold">{formatRate(best.avgActiveRate)}</span> active.
        </p>
      )}

      {windows.length > 0 && (
        <div className="space-y-2">
          {windows.map((window) => (
            <div
              key={window.key}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                best?.key === window.key ? "bg-brand-50 dark:bg-brand-950" : "bg-neutral-50 dark:bg-neutral-800"
              }`}
            >
              <div>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{window.timeRange}</span>
                <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">{window.label}</span>
                {best?.key === window.key && (
                  <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-medium uppercase text-white">
                    Best
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{formatRate(window.avgActiveRate)}</div>
                <div className="text-xs text-neutral-400">
                  {window.count} dash{window.count === 1 ? "" : "es"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
