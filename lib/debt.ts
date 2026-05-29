export type Debt = {
  id: string;
  name: string;
  balance: number;
  apr: number; // annual percentage rate, e.g. 19.99
  min_payment: number;
};

export type Strategy = "avalanche" | "snowball";

export type PayoffMonth = {
  monthIndex: number; // 0-based from start
  totalBalance: number;
  totalInterest: number; // interest accrued this month across all debts
  totalPaid: number; // paid this month
  perDebt: Record<string, number>; // remaining balance per debt id
};

export type DebtResult = {
  name: string;
  payoffMonthIndex: number; // months until this debt hits zero
  interestPaid: number;
  totalPaid: number;
};

export type SimulationResult = {
  strategy: Strategy;
  months: number; // total months to debt-free
  totalInterest: number;
  totalPaid: number;
  timeline: PayoffMonth[];
  perDebt: DebtResult[];
  order: string[]; // debt ids in the order they are targeted
  payoffDate: Date | null;
};

const MAX_MONTHS = 1200; // safety cap (100 years)

function orderDebts(debts: Debt[], strategy: Strategy): Debt[] {
  const copy = [...debts];
  copy.sort((a, b) => {
    if (strategy === "avalanche") {
      if (b.apr !== a.apr) return b.apr - a.apr; // highest APR first
      return a.balance - b.balance;
    }
    if (a.balance !== b.balance) return a.balance - b.balance; // smallest first
    return b.apr - a.apr;
  });
  return copy;
}

/**
 * Debt payoff simulation. `extra` is the additional monthly amount applied,
 * on top of all minimum payments, to the current target debt.
 */
export function simulate(
  inputDebts: Debt[],
  strategy: Strategy,
  extra: number
): SimulationResult {
  const active = inputDebts
    .filter((d) => d.balance > 0)
    .map((d) => ({ ...d }));

  const ordered = orderDebts(active, strategy);
  const order = ordered.map((d) => d.id);

  const balances: Record<string, number> = {};
  const interestById: Record<string, number> = {};
  const paidById: Record<string, number> = {};
  const payoffMonthById: Record<string, number> = {};
  for (const d of active) {
    balances[d.id] = d.balance;
    interestById[d.id] = 0;
    paidById[d.id] = 0;
    payoffMonthById[d.id] = -1;
  }

  const timeline: PayoffMonth[] = [];
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  const remaining = () =>
    active.reduce((s, d) => s + Math.max(0, balances[d.id]), 0);

  while (remaining() > 0.005 && month < MAX_MONTHS) {
    let monthInterest = 0;
    let monthPaid = 0;

    // 1) Accrue interest.
    for (const d of active) {
      if (balances[d.id] <= 0) continue;
      const i = balances[d.id] * (d.apr / 100 / 12);
      balances[d.id] += i;
      interestById[d.id] += i;
      monthInterest += i;
    }

    // 2) Determine this month's payment pool: minimums + extra.
    let pool = extra;
    for (const d of active) {
      if (balances[d.id] > 0) pool += d.min_payment;
    }

    // 3) Pay minimums first (capped at balance).
    for (const d of active) {
      if (balances[d.id] <= 0) continue;
      const pay = Math.min(d.min_payment, balances[d.id], pool);
      balances[d.id] -= pay;
      paidById[d.id] += pay;
      pool -= pay;
      monthPaid += pay;
    }

    // 4) Throw the rest at the highest-priority remaining debt, cascading.
    for (const d of ordered) {
      if (pool <= 0) break;
      if (balances[d.id] <= 0) continue;
      const pay = Math.min(balances[d.id], pool);
      balances[d.id] -= pay;
      paidById[d.id] += pay;
      pool -= pay;
      monthPaid += pay;
    }

    // 5) Record payoff month for any debt that just cleared.
    for (const d of active) {
      if (payoffMonthById[d.id] === -1 && balances[d.id] <= 0.005) {
        balances[d.id] = 0;
        payoffMonthById[d.id] = month;
      }
    }

    totalInterest += monthInterest;
    totalPaid += monthPaid;

    const perDebt: Record<string, number> = {};
    for (const d of active) perDebt[d.id] = Math.max(0, balances[d.id]);

    timeline.push({
      monthIndex: month,
      totalBalance: remaining(),
      totalInterest: monthInterest,
      totalPaid: monthPaid,
      perDebt,
    });

    month += 1;

    // Guard against under-funded plans (minimums never cover interest).
    if (monthPaid <= monthInterest + 0.001 && extra <= 0) {
      break;
    }
  }

  const perDebt: DebtResult[] = active.map((d) => ({
    name: d.name,
    payoffMonthIndex: payoffMonthById[d.id],
    interestPaid: interestById[d.id],
    totalPaid: paidById[d.id],
  }));

  const start = new Date();
  const payoffDate =
    remaining() <= 0.005
      ? new Date(start.getFullYear(), start.getMonth() + month, 1)
      : null;

  return {
    strategy,
    months: month,
    totalInterest,
    totalPaid,
    timeline,
    perDebt,
    order,
    payoffDate,
  };
}

export type DebtMetrics = {
  totalDebt: number;
  totalMinimums: number;
  weightedApr: number;
  dti: number | null; // debt-to-income ratio (minimums / monthly income)
};

export function debtMetrics(
  debts: Debt[],
  monthlyIncome: number
): DebtMetrics {
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinimums = debts.reduce((s, d) => s + d.min_payment, 0);
  const weightedApr =
    totalDebt > 0
      ? debts.reduce((s, d) => s + d.apr * d.balance, 0) / totalDebt
      : 0;
  const dti = monthlyIncome > 0 ? totalMinimums / monthlyIncome : null;
  return { totalDebt, totalMinimums, weightedApr, dti };
}
