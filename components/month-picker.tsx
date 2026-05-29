"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addMonths, formatMonth } from "@/lib/format";

export function MonthPicker({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(addMonths(month, -1))}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[9.5rem] text-center text-sm font-semibold">
        {formatMonth(month)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(addMonths(month, 1))}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
