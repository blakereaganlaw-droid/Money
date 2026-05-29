"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUSD } from "@/lib/format";

export type BarDatum = {
  name: string;
  budget: number;
  actual: number;
};

export function BudgetBarChart({ data }: { data: BarDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No data to chart yet.
      </div>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dde6df" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#5a6b62" }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#5a6b62" }}
            tickFormatter={(v) => `$${Math.round(Number(v) / 1).toLocaleString()}`}
            width={70}
          />
          <Tooltip
            formatter={(value) => formatUSD(Number(value))}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #d3ded6",
              fontSize: 12,
            }}
          />
          <Bar dataKey="budget" name="Budget" fill="#3a6f8f" radius={[4, 4, 0, 0]} />
          <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.actual > d.budget ? "#b3261e" : "#4f7d5b"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
