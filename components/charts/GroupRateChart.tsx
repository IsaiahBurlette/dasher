"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GroupStat } from "@/lib/calculations";

export default function GroupRateChart({ title, groups }: { title: string; groups: GroupStat[] }) {
  const data = groups.map((g) => ({
    label: g.label,
    activeRate: Number.isFinite(g.avgActiveRate) ? Number(g.avgActiveRate.toFixed(2)) : 0,
    dashRate: Number.isFinite(g.avgDashRate) ? Number(g.avgDashRate.toFixed(2)) : 0,
    count: g.count
  }));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            formatter={(value: number, name: string) => [`$${value}/hr`, name]}
            labelFormatter={(label) => {
              const point = data.find((d) => d.label === label);
              return `${label}${point ? ` (${point.count} dash${point.count === 1 ? "" : "es"})` : ""}`;
            }}
          />
          <Legend />
          <Bar dataKey="activeRate" name="Active $/hr" fill="#eb1700" radius={[4, 4, 0, 0]} />
          <Bar dataKey="dashRate" name="Dash $/hr" fill="#ffc199" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
