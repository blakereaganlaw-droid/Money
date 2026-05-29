"use client";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  BudgetActualRow,
  Budget,
  Category,
  DebtRow,
  Transaction,
} from "@/lib/types";

let _client: ReturnType<typeof createClient> | null = null;
function sb() {
  return (_client ??= createClient());
}

/* ----------------------------- Categories ----------------------------- */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await sb()
        .from("categories")
        .select("*")
        .order("type", { ascending: false })
        .order("depth")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const create = useMutation({
    mutationFn: async (input: {
      name: string;
      type: "income" | "expense";
      parent_id: string | null;
      sort_order?: number;
    }) => {
      const { error } = await sb().from("categories").insert({
        name: input.name,
        type: input.type,
        parent_id: input.parent_id,
        sort_order: input.sort_order ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await sb()
        .from("categories")
        .update({ name: input.name })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["budget-actuals"] });
    },
  });

  return { create, rename, remove };
}

/* ----------------------------- Transactions ---------------------------- */
export function useTransactions(filters: {
  month?: string;
  ledger?: string;
  type?: string;
}) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async (): Promise<Transaction[]> => {
      let q = sb()
        .from("transactions")
        .select("*")
        .order("txn_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (filters.month) {
        const start = filters.month;
        const end = nextMonth(filters.month);
        q = q.gte("txn_date", start).lt("txn_date", end);
      }
      if (filters.ledger && filters.ledger !== "all")
        q = q.eq("ledger", filters.ledger as "blake" | "amanda");
      if (filters.type && filters.type !== "all")
        q = q.eq("type", filters.type as "income" | "expense");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTransactionMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["budget-actuals"] });
  };

  const upsert = useMutation({
    mutationFn: async (input: Partial<Transaction> & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await sb()
          .from("transactions")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data: u } = await sb().auth.getUser();
        const { error } = await sb().from("transactions").insert({
          ledger: input.ledger!,
          category_id: input.category_id ?? null,
          txn_date: input.txn_date!,
          amount: input.amount!,
          type: input.type!,
          payee: input.payee ?? null,
          memo: input.memo ?? null,
          created_by: u.user?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb()
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { upsert, remove };
}

/* ------------------------------- Budgets -------------------------------- */
export function useBudgets(month: string) {
  return useQuery({
    queryKey: ["budgets", month],
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await sb()
        .from("budgets")
        .select("*")
        .eq("month", month);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBudgetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category_id: string;
      month: string;
      amount: number;
    }) => {
      const { error } = await sb()
        .from("budgets")
        .upsert(input, { onConflict: "category_id,month" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["budgets", v.month] });
      qc.invalidateQueries({ queryKey: ["budget-actuals"] });
    },
  });
}

/* -------------------------- Budget vs Actuals --------------------------- */
export function useBudgetActuals(month: string) {
  return useQuery({
    queryKey: ["budget-actuals", month],
    queryFn: async (): Promise<BudgetActualRow[]> => {
      const { data, error } = await sb().rpc("monthly_budget_actuals", {
        p_month: month,
      });
      if (error) throw error;
      return (data ?? []) as BudgetActualRow[];
    },
  });
}

/* --------------------------------- Debts -------------------------------- */
export function useDebts() {
  return useQuery({
    queryKey: ["debts"],
    queryFn: async (): Promise<DebtRow[]> => {
      const { data, error } = await sb()
        .from("debts")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDebtMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["debts"] });

  const upsert = useMutation({
    mutationFn: async (input: Partial<DebtRow> & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await sb().from("debts").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await sb().from("debts").insert({
          name: input.name!,
          balance: input.balance ?? 0,
          apr: input.apr ?? 0,
          min_payment: input.min_payment ?? 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("debts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { upsert, remove };
}

function nextMonth(monthKeyStr: string): string {
  const [y, m] = monthKeyStr.split("-").map(Number);
  const d = new Date(y, m, 1); // m is already +1 because month is 1-based start
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}
