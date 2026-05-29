export type CategoryType = "income" | "expense";
export type LedgerId = "blake" | "amanda";

export type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  type: CategoryType;
  depth: number;
  sort_order: number;
  created_at: string;
};

export type Budget = {
  id: string;
  category_id: string;
  month: string; // YYYY-MM-DD (first of month)
  amount: number;
  created_at: string;
};

export type Transaction = {
  id: string;
  ledger: LedgerId;
  category_id: string | null;
  txn_date: string; // YYYY-MM-DD
  amount: number;
  type: CategoryType;
  payee: string | null;
  memo: string | null;
  created_by: string | null;
  created_at: string;
};

export type DebtRow = {
  id: string;
  name: string;
  balance: number;
  apr: number;
  min_payment: number;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
};

export type BudgetActualRow = {
  category_id: string;
  name: string;
  parent_id: string | null;
  depth: number;
  type: CategoryType;
  budget: number;
  actual: number;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile>, Partial<Profile>>;
      categories: Table<
        Category,
        Omit<Category, "id" | "depth" | "created_at"> & {
          id?: string;
          depth?: number;
        },
        Partial<Category>
      >;
      budgets: Table<
        Budget,
        Omit<Budget, "id" | "created_at"> & { id?: string },
        Partial<Budget>
      >;
      transactions: Table<
        Transaction,
        Omit<Transaction, "id" | "created_at"> & { id?: string },
        Partial<Transaction>
      >;
      debts: Table<
        DebtRow,
        Omit<DebtRow, "id" | "created_at"> & { id?: string },
        Partial<DebtRow>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      monthly_budget_actuals: {
        Args: { p_month: string };
        Returns: BudgetActualRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
