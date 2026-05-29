"use client";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LEDGERS } from "@/lib/config";
import { buildTree, flattenOptions } from "@/lib/tree";
import { todayKey } from "@/lib/format";
import type { Category, Transaction } from "@/lib/types";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  ledger: z.enum(["blake", "amanda"]),
  txn_date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().nonnegative("Amount must be 0 or more"),
  category_id: z.string().optional(),
  payee: z.string().optional(),
  memo: z.string().optional(),
});

export type TransactionFormValues = z.output<typeof schema>;
type TransactionFormInput = z.input<typeof schema>;

export function TransactionForm({
  categories,
  initial,
  onSubmit,
  onCancel,
  pending,
}: {
  categories: Category[];
  initial?: Transaction | null;
  onSubmit: (values: TransactionFormValues) => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TransactionFormInput, unknown, TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initial?.type ?? "expense",
      ledger: initial?.ledger ?? "blake",
      txn_date: initial?.txn_date ?? todayKey(),
      amount: initial?.amount ?? undefined,
      category_id: initial?.category_id ?? "",
      payee: initial?.payee ?? "",
      memo: initial?.memo ?? "",
    },
  });

  const type = useWatch({ control, name: "type" }) ?? "expense";
  const options = useMemo(() => {
    const tree = buildTree(categories.filter((c) => c.type === type));
    return flattenOptions(tree);
  }, [categories, type]);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((v) => onSubmit(v))}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select {...register("type")}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
        </Field>
        <Field label="Ledger">
          <Select {...register("ledger")}>
            {LEDGERS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" {...register("txn_date")} />
        </Field>
        <Field label="Amount (USD)" error={errors.amount?.message}>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register("amount")}
          />
        </Field>
      </div>
      <Field label="Category">
        <Select {...register("category_id")}>
          <option value="">Uncategorized</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Payee">
        <Input placeholder="e.g. Kroger" {...register("payee")} />
      </Field>
      <Field label="Memo">
        <Input placeholder="Optional note" {...register("memo")} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {initial ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <span className="text-xs text-expense">{error}</span> : null}
    </div>
  );
}
