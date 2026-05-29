"use client";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DebtForm, type DebtFormValues } from "@/components/debt-form";
import { DebtTimelineChart } from "@/components/debt-timeline-chart";
import { useDebts, useDebtMutations } from "@/lib/queries";
import { simulate, debtMetrics, type Debt } from "@/lib/debt";
import { formatLongDate, formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DebtRow } from "@/lib/types";

export default function DebtsPage() {
  const { data: debts = [] } = useDebts();
  const { upsert, remove } = useDebtMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DebtRow | null>(null);
  const [extra, setExtra] = useState("0");
  const [income, setIncome] = useState("");

  const debtInputs: Debt[] = useMemo(
    () =>
      debts.map((d) => ({
        id: d.id,
        name: d.name,
        balance: Number(d.balance),
        apr: Number(d.apr),
        min_payment: Number(d.min_payment),
      })),
    [debts]
  );

  const extraNum = Math.max(0, parseFloat(extra) || 0);
  const incomeNum = Math.max(0, parseFloat(income) || 0);

  const metrics = useMemo(
    () => debtMetrics(debtInputs, incomeNum),
    [debtInputs, incomeNum]
  );
  const avalanche = useMemo(
    () => simulate(debtInputs, "avalanche", extraNum),
    [debtInputs, extraNum]
  );
  const snowball = useMemo(
    () => simulate(debtInputs, "snowball", extraNum),
    [debtInputs, extraNum]
  );

  const recommended =
    avalanche.totalInterest <= snowball.totalInterest ? avalanche : snowball;
  const firstTarget = debtInputs.find((d) => d.id === recommended.order[0]);
  const interestSaved = Math.abs(
    avalanche.totalInterest - snowball.totalInterest
  );

  async function submit(v: DebtFormValues) {
    await upsert.mutateAsync({ id: editing?.id, ...v });
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Debt Planner"
        description="Compare payoff strategies, see timelines, and know which debt to attack first."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add debt
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total Debt" value={`-${formatUSD(metrics.totalDebt)}`} expense />
        <Metric label="Monthly Minimums" value={`-${formatUSD(metrics.totalMinimums)}`} expense />
        <Metric label="Weighted APR" value={`${metrics.weightedApr.toFixed(2)}%`} />
        <Metric
          label="Debt-to-Income"
          value={metrics.dti === null ? "—" : `${(metrics.dti * 100).toFixed(1)}%`}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Debts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH className="text-right">Balance</TH>
                <TH className="text-right">APR</TH>
                <TH className="text-right">Min Payment</TH>
                <TH className="w-20" />
              </TR>
            </THead>
            <TBody>
              {debts.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                    No debts added. Add one to start planning.
                  </TD>
                </TR>
              ) : (
                debts.map((d) => (
                  <TR key={d.id}>
                    <TD className="font-medium">{d.name}</TD>
                    <TD className="text-right tabular-nums text-expense">
                      -{formatUSD(Number(d.balance))}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {Number(d.apr).toFixed(2)}%
                    </TD>
                    <TD className="text-right tabular-nums">
                      {formatUSD(Number(d.min_payment))}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditing(d);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-expense"
                          onClick={() =>
                            confirm(`Delete ${d.name}?`) && remove.mutate(d.id)
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-[20rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Payoff Inputs</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Extra monthly payment ($)</Label>
              <Input
                type="number"
                min="0"
                step="10"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">
                Applied on top of all minimums toward the target debt.
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Monthly take-home income ($)</Label>
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="optional"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">
                Used for the debt-to-income ratio.
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <StrategyCard
            title="Avalanche"
            subtitle="Highest APR first — least interest"
            result={avalanche}
            best={recommended.strategy === "avalanche"}
          />
          <StrategyCard
            title="Snowball"
            subtitle="Smallest balance first — fastest wins"
            result={snowball}
            best={recommended.strategy === "snowball"}
          />
        </div>
      </div>

      {firstTarget ? (
        <Card className="mb-6 border-secondary/40 bg-secondary/5">
          <CardContent className="flex items-start gap-3 p-5">
            <Trophy className="mt-0.5 h-5 w-5 text-secondary" />
            <div className="text-sm">
              <p className="font-semibold">
                Recommended: {recommended.strategy === "avalanche" ? "Avalanche" : "Snowball"} method
              </p>
              <p className="mt-1 text-muted-foreground">
                Put your extra payment toward{" "}
                <span className="font-medium text-foreground">
                  {firstTarget.name}
                </span>{" "}
                first. This plan clears all debt in{" "}
                <span className="font-medium text-foreground">
                  {recommended.months} months
                </span>
                {recommended.payoffDate
                  ? ` (by ${formatLongDate(recommended.payoffDate)})`
                  : ""}
                {interestSaved > 1
                  ? `, saving about ${formatUSD(interestSaved)} in interest versus the other method.`
                  : "."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Balance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <DebtTimelineChart avalanche={avalanche} snowball={snowball} />
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit debt" : "Add debt"}
      >
        <DebtForm
          initial={editing}
          onSubmit={submit}
          onCancel={() => setOpen(false)}
          pending={upsert.isPending}
        />
      </Modal>
    </div>
  );
}

function Metric({
  label,
  value,
  expense,
}: {
  label: string;
  value: string;
  expense?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-lg font-semibold tabular-nums",
            expense ? "text-expense" : "text-income"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function StrategyCard({
  title,
  subtitle,
  result,
  best,
}: {
  title: string;
  subtitle: string;
  result: ReturnType<typeof simulate>;
  best: boolean;
}) {
  return (
    <Card className={cn(best && "ring-2 ring-secondary")}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{title}</p>
          {best ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              Recommended
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        <dl className="mt-3 space-y-1.5 text-sm">
          <Row label="Months to debt-free" value={result.months ? `${result.months}` : "—"} />
          <Row
            label="Payoff date"
            value={result.payoffDate ? formatLongDate(result.payoffDate) : "—"}
          />
          <Row
            label="Total interest"
            value={
              <span className="text-expense">-{formatUSD(result.totalInterest)}</span>
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums font-medium">{value}</dd>
    </div>
  );
}
