import type { DashEntry } from "@/lib/types";
import { overallSummary } from "@/lib/calculations";
import { formatMoney, formatRate } from "@/lib/time";

export default function StatsSummary({ entries }: { entries: DashEntry[] }) {
  const s = overallSummary(entries);

  const cards: { label: string; value: string }[] = [
    { label: "Total earnings", value: formatMoney(s.totalEarnings) },
    { label: "Dashes logged", value: String(s.count) },
    { label: "Avg active $/hr", value: formatRate(s.avgActiveRate) },
    { label: "Avg dash $/hr", value: formatRate(s.avgDashRate) },
    { label: "Total miles", value: s.totalMiles > 0 ? s.totalMiles.toFixed(1) : "--" },
    { label: "$/mile", value: Number.isFinite(s.earningsPerMile) ? formatMoney(s.earningsPerMile) : "--" }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{c.label}</p>
          <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
