"use client";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MonthPicker } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Amount } from "@/components/amount";
import {
  TransactionForm,
  type TransactionFormValues,
} from "@/components/transaction-form";
import {
  useCategories,
  useTransactions,
  useTransactionMutations,
} from "@/lib/queries";
import { categoryPath } from "@/lib/tree";
import { formatLongDate, monthKey } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [ledger, setLedger] = useState("all");
  const [type, setType] = useState("all");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: txns = [], isLoading } = useTransactions({
    month,
    ledger,
    type,
  });
  const { upsert, remove } = useTransactionMutations();

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of txns) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [txns]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(t: Transaction) {
    setEditing(t);
    setOpen(true);
  }

  async function submit(v: TransactionFormValues) {
    await upsert.mutateAsync({
      id: editing?.id,
      type: v.type,
      ledger: v.ledger,
      txn_date: v.txn_date,
      amount: v.amount,
      category_id: v.category_id || null,
      payee: v.payee || null,
      memo: v.memo || null,
    });
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Transactions"
        description="Every actual income and expense, tagged to Blake or Amanda."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <MonthPicker month={month} onChange={setMonth} />
        <Select
          className="w-36"
          value={ledger}
          onChange={(e) => setLedger(e.target.value)}
        >
          <option value="all">Both ledgers</option>
          <option value="blake">Blake</option>
          <option value="amanda">Amanda</option>
        </Select>
        <Select
          className="w-36"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </Select>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <SummaryCard label="Income" value={<Amount value={totals.income} kind="income" />} />
        <SummaryCard label="Expenses" value={<Amount value={totals.expense} kind="expense" />} />
        <SummaryCard
          label="Net"
          value={
            <Amount
              value={totals.net}
              kind={totals.net < 0 ? "expense" : "income"}
            />
          }
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Payee</TH>
                <TH>Category</TH>
                <TH>Ledger</TH>
                <TH className="text-right">Amount</TH>
                <TH className="w-20" />
              </TR>
            </THead>
            <TBody>
              {isLoading ? (
                <TR>
                  <TD colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TD>
                </TR>
              ) : txns.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="py-8 text-center text-muted-foreground">
                    No transactions this month.
                  </TD>
                </TR>
              ) : (
                txns.map((t) => (
                  <TR key={t.id}>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {formatLongDate(t.txn_date)}
                    </TD>
                    <TD className="font-medium">{t.payee || "—"}</TD>
                    <TD className="text-muted-foreground">
                      {categoryPath(categories, t.category_id)}
                    </TD>
                    <TD className="capitalize">{t.ledger}</TD>
                    <TD className="text-right">
                      <Amount value={t.amount} kind={t.type} />
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-expense"
                          onClick={() =>
                            confirm("Delete this transaction?") &&
                            remove.mutate(t.id)
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit transaction" : "Add transaction"}
      >
        <TransactionForm
          categories={categories}
          initial={editing}
          onSubmit={submit}
          onCancel={() => setOpen(false)}
          pending={upsert.isPending}
        />
      </Modal>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-lg">{value}</p>
      </CardContent>
    </Card>
  );
}
