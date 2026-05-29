"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUSD } from "@/lib/format";
import type { SimulationResult } from "@/lib/debt";

export function DebtTimelineChart({
  avalanche,
  snowball,
}: {
  avalanche: SimulationResult;
  snowball: SimulationResult;
}) {
  const max = Math.max(avalanche.months, snowball.months);
  if (max === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Add debts to see a payoff timeline.
      </div>
    );
  }

  const data = Array.from({ length: max }, (_, i) => ({
    month: i + 1,
    Avalanche: avalanche.timeline[i]?.totalBalance ?? 0,
    Snowball: snowball.timeline[i]?.totalBalance ?? 0,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dde6df" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#5a6b62" }}
            tickFormatter={(v) => `M${v}`}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#5a6b62" }}
            tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
            width={56}
          />
          <Tooltip
            formatter={(value) => formatUSD(Number(value))}
            labelFormatter={(l) => `Month ${l}`}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #d3ded6",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="Avalanche"
            stroke="#3a6f8f"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Snowball"
            stroke="#4f7d5b"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
