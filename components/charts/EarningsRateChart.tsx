"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DashEntry } from "@/lib/types";
import { timeSeries } from "@/lib/calculations";

export default function EarningsRateChart({ entries }: { entries: DashEntry[] }) {
  const data = timeSeries(entries).map((p, i) => ({ ...p, label: `${p.date}` , idx: i }));

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Hourly rate over time</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={20} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            formatter={(value: number, name: string) => [`$${Number(value).toFixed(2)}/hr`, name]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line type="monotone" dataKey="activeRate" name="Active $/hr" stroke="#eb1700" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="dashRate" name="Dash $/hr" stroke="#7a0b00" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
