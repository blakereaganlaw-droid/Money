"use client";
import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MonthPicker } from "@/components/month-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignedAmount } from "@/components/amount";
import { BudgetBarChart, type BarDatum } from "@/components/budget-bar-chart";
import { useBudgetActuals } from "@/lib/queries";
import { formatLongDate, formatUSD, monthKey } from "@/lib/format";
import type { BudgetActualRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type Node = BudgetActualRow & { children: Node[]; budgetRollup: number };

function buildActualTree(rows: BudgetActualRow[]) {
  const byId = new Map<string, Node>();
  rows.forEach((r) =>
    byId.set(r.category_id, { ...r, children: [], budgetRollup: 0 })
  );
  const roots: Node[] = [];
  byId.forEach((n) => {
    if (n.parent_id && byId.has(n.parent_id)) {
      byId.get(n.parent_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  });
  const rollup = (n: Node): number => {
    let total = Number(n.budget) || 0;
    for (const c of n.children) total += rollup(c);
    n.budgetRollup = total;
    return total;
  };
  roots.forEach(rollup);
  return roots;
}

export default function DashboardPage() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const { data: rows = [], isLoading } = useBudgetActuals(month);

  const { expense, income, totals, chart } = useMemo(() => {
    const roots = buildActualTree(rows);
    const expense = roots.filter((r) => r.type === "expense");
    const income = roots.filter((r) => r.type === "income");
    const sum = (ns: Node[], key: "budgetRollup" | "actual") =>
      ns.reduce((s, n) => s + (Number(n[key]) || 0), 0);
    const totals = {
      budgetExpense: sum(expense, "budgetRollup"),
      actualExpense: sum(expense, "actual"),
      budgetIncome: sum(income, "budgetRollup"),
      actualIncome: sum(income, "actual"),
    };
    const chart: BarDatum[] = expense
      .map((n) => ({
        name: n.name,
        budget: Number(n.budgetRollup) || 0,
        actual: Number(n.actual) || 0,
      }))
      .filter((d) => d.budget > 0 || d.actual > 0)
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 8);
    return { expense, income, totals, chart };
  }, [rows]);

  const plannedNet = totals.budgetIncome - totals.budgetExpense;
  const actualNet = totals.actualIncome - totals.actualExpense;
  const remaining = totals.budgetExpense - totals.actualExpense;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Budget Dashboard"
        description={`Combined view for Blake & Amanda — ${formatLongDate(
          month
        )}`}
        actions={<MonthPicker month={month} onChange={setMonth} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Actual Income"
          primary={<span className="text-income">{formatUSD(totals.actualIncome)}</span>}
          sub={`of ${formatUSD(totals.budgetIncome)} planned`}
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="Actual Expenses"
          primary={<span className="text-expense">-{formatUSD(totals.actualExpense)}</span>}
          sub={`of ${formatUSD(totals.budgetExpense)} budgeted`}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Net (Actual)"
          primary={<SignedAmount value={actualNet} />}
          sub={`planned ${plannedNet < 0 ? "-" : ""}${formatUSD(plannedNet)}`}
        />
        <StatCard
          icon={<PiggyBank className="h-5 w-5" />}
          label="Left to Spend"
          primary={<SignedAmount value={remaining} />}
          sub="budget minus actual"
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Budget vs Actual — Top Expense Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetBarChart data={chart} />
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-6">
          <BreakdownCard title="Expenses" nodes={expense} negative />
          <BreakdownCard title="Income" nodes={income} />
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  primary,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  primary: React.ReactNode;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs uppercase tracking-wide">{label}</span>
          {icon}
        </div>
        <p className="mt-2 text-xl font-semibold tabular-nums">{primary}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  nodes,
  negative,
}: {
  title: string;
  nodes: Node[];
  negative?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-3 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex-1">Category</span>
          <span className="w-24 text-right">Budget</span>
          <span className="w-24 text-right">Actual</span>
          <span className="w-24 text-right">Variance</span>
        </div>
        {nodes.length === 0 ? (
          <p className="px-1 py-4 text-sm text-muted-foreground">
            Nothing here yet.
          </p>
        ) : (
          nodes.map((n) => (
            <BreakdownRow key={n.category_id} node={n} negative={!!negative} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownRow({ node, negative }: { node: Node; negative: boolean }) {
  const budget = node.budgetRollup;
  const actual = Number(node.actual) || 0;
  // For expenses: positive variance = under budget (good).
  // For income: positive variance = over plan (good).
  const variance = negative ? budget - actual : actual - budget;
  const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0;
  const over = negative && actual > budget;

  return (
    <div>
      <div
        className="flex items-center gap-3 rounded-md px-1 py-1.5 hover:bg-muted/40"
        style={{ paddingLeft: `${(node.depth - 1) * 1 + 0.25}rem` }}
      >
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "truncate",
              node.depth === 1 ? "font-semibold" : "text-sm text-foreground/90"
            )}
          >
            {node.name}
          </div>
          {node.depth === 1 && budget > 0 ? (
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  over ? "bg-expense" : "bg-secondary"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : null}
        </div>
        <span className="w-24 text-right tabular-nums text-muted-foreground">
          {formatUSD(budget)}
        </span>
        <span
          className={cn(
            "w-24 text-right tabular-nums",
            negative ? "text-expense" : "text-income"
          )}
        >
          {negative ? `-${formatUSD(actual)}` : formatUSD(actual)}
        </span>
        <span className="w-24 text-right">
          <SignedAmount value={variance} />
        </span>
      </div>
      {node.children.map((c) => (
        <BreakdownRow key={c.category_id} node={c} negative={negative} />
      ))}
    </div>
  );
}
