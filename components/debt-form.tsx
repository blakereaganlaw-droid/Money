"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DebtRow } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  balance: z.coerce.number().nonnegative(),
  apr: z.coerce.number().min(0).max(100),
  min_payment: z.coerce.number().nonnegative(),
});

export type DebtFormValues = z.output<typeof schema>;
type DebtFormInput = z.input<typeof schema>;

export function DebtForm({
  initial,
  onSubmit,
  onCancel,
  pending,
}: {
  initial?: DebtRow | null;
  onSubmit: (values: DebtFormValues) => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DebtFormInput, unknown, DebtFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      balance: initial?.balance ?? undefined,
      apr: initial?.apr ?? undefined,
      min_payment: initial?.min_payment ?? undefined,
    },
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-1.5">
        <Label>Debt name</Label>
        <Input placeholder="e.g. Visa, Car Loan" {...register("name")} />
        {errors.name ? (
          <span className="text-xs text-expense">{errors.name.message}</span>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Balance ($)</Label>
          <Input type="number" step="0.01" min="0" {...register("balance")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>APR (%)</Label>
          <Input type="number" step="0.001" min="0" {...register("apr")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Min payment ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register("min_payment")}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {initial ? "Save changes" : "Add debt"}
        </Button>
      </div>
    </form>
  );
}
