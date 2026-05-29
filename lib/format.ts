const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

/** Plain USD string, always positive magnitude: "$1,234.56". */
export function formatUSD(value: number): string {
  return currency.format(Math.abs(value ?? 0));
}

/**
 * Signed display used everywhere money is shown.
 * Expenses: leading minus before the dollar sign, e.g. "-$1,234.56".
 * Income / positive: plain "$1,234.56".
 */
export function formatSigned(value: number, kind: "income" | "expense"): string {
  const base = formatUSD(value);
  return kind === "expense" ? `-${base}` : base;
}

/** Tailwind text color: red for expenses, near-black for income. */
export function amountColorClass(kind: "income" | "expense"): string {
  return kind === "expense" ? "text-expense" : "text-income";
}

/** "Monday, June 1, 2026" */
export function formatLongDate(date: Date | string): string {
  const d = typeof date === "string" ? parseDateOnly(date) : date;
  return longDate.format(d);
}

/** "June 2026" */
export function formatMonth(date: Date | string): string {
  const d = typeof date === "string" ? parseDateOnly(date) : date;
  return monthLabel.format(d);
}

/** Parse a YYYY-MM-DD string as a local date (avoids UTC off-by-one). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** First day of the month as YYYY-MM-DD. */
export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** Today as YYYY-MM-DD (local). */
export function todayKey(): string {
  return toDateKey(new Date());
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addMonths(monthKeyStr: string, delta: number): string {
  const d = parseDateOnly(monthKeyStr);
  d.setMonth(d.getMonth() + delta);
  return monthKey(d);
}
