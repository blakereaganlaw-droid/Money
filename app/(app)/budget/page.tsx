"use client";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { MonthPicker } from "@/components/month-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SignedAmount } from "@/components/amount";
import { useBudgets, useBudgetMutation, useCategories } from "@/lib/queries";
import { buildTree, type CategoryNode } from "@/lib/tree";
import { formatUSD, monthKey } from "@/lib/format";

export default function BudgetPage() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets(month);
  const save = useBudgetMutation();

  const ownById = useMemo(() => {
    const m = new Map<string, number>();
    budgets.forEach((b) => m.set(b.category_id, Number(b.amount)));
    return m;
  }, [budgets]);

  const tree = useMemo(() => buildTree(categories), [categories]);
  const expense = tree.filter((t) => t.type === "expense");
  const income = tree.filter((t) => t.type === "income");

  const rollup = useMemo(() => {
    const m = new Map<string, number>();
    const walk = (n: CategoryNode): number => {
      let total = ownById.get(n.id) ?? 0;
      for (const c of n.children) total += walk(c);
      m.set(n.id, total);
      return total;
    };
    [...expense, ...income].forEach(walk);
    return m;
  }, [expense, income, ownById]);

  const expenseTotal = expense.reduce((s, n) => s + (rollup.get(n.id) ?? 0), 0);
  const incomeTotal = income.reduce((s, n) => s + (rollup.get(n.id) ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Monthly Budget"
        description="Set what you plan to spend and earn in each category. Enter amounts at the most detailed level."
        actions={<MonthPicker month={month} onChange={setMonth} />}
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <TotalCard label="Budgeted Income" value={incomeTotal} kind="income" />
        <TotalCard label="Budgeted Expenses" value={expenseTotal} kind="expense" />
        <TotalCard
          label="Planned Net"
          value={incomeTotal - expenseTotal}
          kind="net"
        />
      </div>

      <div className="grid gap-6">
        <BudgetCard
          title="Expenses"
          nodes={expense}
          month={month}
          ownById={ownById}
          rollup={rollup}
          onSave={(category_id, amount) =>
            save.mutate({ category_id, month, amount })
          }
        />
        <BudgetCard
          title="Income"
          nodes={income}
          month={month}
          ownById={ownById}
          rollup={rollup}
          onSave={(category_id, amount) =>
            save.mutate({ category_id, month, amount })
          }
        />
      </div>
    </div>
  );
}

function TotalCard({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: "income" | "expense" | "net";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-lg">
          {kind === "net" ? (
            <SignedAmount value={value} />
          ) : (
            <span
              className={
                kind === "expense"
                  ? "font-medium text-expense"
                  : "font-medium text-income"
              }
            >
              {kind === "expense" ? `-${formatUSD(value)}` : formatUSD(value)}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function BudgetCard({
  title,
  nodes,
  ownById,
  rollup,
  onSave,
}: {
  title: string;
  nodes: CategoryNode[];
  month: string;
  ownById: Map<string, number>;
  rollup: Map<string, number>;
  onSave: (categoryId: string, amount: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col">
        {nodes.map((n) => (
          <BudgetRow
            key={n.id}
            node={n}
            ownById={ownById}
            rollup={rollup}
            onSave={onSave}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function BudgetRow({
  node,
  ownById,
  rollup,
  onSave,
}: {
  node: CategoryNode;
  ownById: Map<string, number>;
  rollup: Map<string, number>;
  onSave: (categoryId: string, amount: number) => void;
}) {
  const hasChildren = node.children.length > 0;
  const own = ownById.get(node.id) ?? 0;
  const [value, setValue] = useState(own ? String(own) : "");
  // Re-sync the input when the saved value changes (e.g. after a save or
  // month switch) without an effect, per React's derived-state pattern.
  const [prevOwn, setPrevOwn] = useState(own);
  if (own !== prevOwn) {
    setPrevOwn(own);
    setValue(own ? String(own) : "");
  }

  function commit() {
    const num = parseFloat(value);
    const amount = Number.isFinite(num) ? num : 0;
    if (amount !== own) onSave(node.id, amount);
  }

  return (
    <div>
      <div
        className="flex items-center gap-3 border-b border-border/60 py-2"
        style={{ paddingLeft: `${(node.depth - 1) * 1.25}rem` }}
      >
        <span
          className={
            node.depth === 1
              ? "font-semibold"
              : "text-sm text-foreground/90"
          }
        >
          {node.name}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {hasChildren ? (
            <span className="text-xs text-muted-foreground">
              subtotal {formatUSD(rollup.get(node.id) ?? 0)}
            </span>
          ) : null}
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={value}
              placeholder="0.00"
              onChange={(e) => setValue(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="h-9 w-32 pl-6 text-right"
            />
          </div>
        </div>
      </div>
      {node.children.map((c) => (
        <BudgetRow
          key={c.id}
          node={c}
          ownById={ownById}
          rollup={rollup}
          onSave={onSave}
        />
      ))}
    </div>
  );
}
