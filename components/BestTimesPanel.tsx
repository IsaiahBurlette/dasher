import type { DashEntry } from "@/lib/types";
import { bestGroups, byDayOfWeek, byStartHour } from "@/lib/calculations";
import { formatRate } from "@/lib/time";

export default function BestTimesPanel({ entries }: { entries: DashEntry[] }) {
  const days = byDayOfWeek(entries);
  const hours = byStartHour(entries);
  const bestDays = bestGroups(days, "avgActiveRate");
  const bestHours = bestGroups(hours, "avgActiveRate");

  const hasEnoughData = bestDays.length > 0 || bestHours.length > 0;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Best times to dash</h3>
      <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
        Ranked by average active $/hr, based on your logged dashes (needs at least 2 dashes in a bucket to rank).
      </p>

      {!hasEnoughData && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Log a few more dashes on different days/times to unlock recommendations.
        </p>
      )}

      {hasEnoughData && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Best days</h4>
            <ol className="space-y-2">
              {bestDays.map((d, i) => (
                <li key={d.key} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800">
                  <span className="font-medium">
                    {i + 1}. {d.label}
                  </span>
                  <span className="text-neutral-500">
                    {formatRate(d.avgActiveRate)} &middot; {d.count} dashes
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Best start hours</h4>
            <ol className="space-y-2">
              {bestHours.map((h, i) => (
                <li key={h.key} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800">
                  <span className="font-medium">
                    {i + 1}. {h.label}
                  </span>
                  <span className="text-neutral-500">
                    {formatRate(h.avgActiveRate)} &middot; {h.count} dashes
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
