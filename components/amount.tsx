import { cn } from "@/lib/utils";
import { amountColorClass, formatSigned, formatUSD } from "@/lib/format";

/**
 * Renders money per the family rules:
 *  - expense: red, leading minus -> -$1,234.56
 *  - income:  near-black -> $1,234.56
 */
export function Amount({
  value,
  kind,
  className,
}: {
  value: number;
  kind: "income" | "expense";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        amountColorClass(kind),
        className
      )}
    >
      {formatSigned(value, kind)}
    </span>
  );
}

/**
 * Signed number where the sign is driven by the value itself (e.g. a budget
 * variance). Negative -> red with "-$"; zero/positive -> near-black "$".
 */
export function SignedAmount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const negative = value < -0.005;
  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        negative ? "text-expense" : "text-income",
        className
      )}
    >
      {negative ? `-${formatUSD(value)}` : formatUSD(value)}
    </span>
  );
}
