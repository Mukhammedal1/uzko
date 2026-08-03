import * as React from "react";
import type { DateRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PeriodFilterValue = "all" | "today" | "yesterday" | "week" | "month" | "year" | "custom";

type Props = {
  value: PeriodFilterValue;
  onValueChange: (value: PeriodFilterValue) => void;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
  hideAllOption?: boolean;
  hideSelect?: boolean;
  /** Bitta kun bosilishi bilanoq (ikkinchi kunni kutmasdan) filtr qo'llansin. */
  instantSingleDay?: boolean;
  /** "Kecha" tanlovini ham qo'shadi (faqat shuni qo'llab-quvvatlaydigan sahifalarda). */
  showYesterdayOption?: boolean;
};

const OPTIONS: { value: PeriodFilterValue; label: string }[] = [
  { value: "all", label: "Barcha davr" },
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "week", label: "Bu hafta" },
  { value: "month", label: "Bu oy" },
  { value: "year", label: "Bu yil" },
  { value: "custom", label: "Istalgan davr" },
];

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string) {
  return value ? new Date(`${value}T12:00:00`) : undefined;
}

export function PeriodFilter({
  value,
  onValueChange,
  from,
  to,
  onFromChange,
  onToChange,
  className,
  hideAllOption,
  hideSelect,
  instantSingleDay,
  showYesterdayOption,
}: Props) {
  const selectedRange = React.useMemo<DateRange | undefined>(() => {
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    return fromDate || toDate ? { from: fromDate, to: toDate } : undefined;
  }, [from, to]);

  const options = OPTIONS.filter((option) => {
    if (option.value === "all" && hideAllOption) return false;
    if (option.value === "yesterday" && !showYesterdayOption) return false;
    return true;
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {!hideSelect && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Davr:</span>
          <Select
            value={value}
            onValueChange={(next) => {
              if (next === "custom") return;
              onValueChange(next as PeriodFilterValue);
              onFromChange("");
              onToChange("");
            }}
          >
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={value === "custom" ? "default" : "outline"}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            <CalendarDays className="h-4 w-4" />
            Istalgan davr
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={(range) => {
              onFromChange(range?.from ? toDateInput(range.from) : "");
              onToChange(range?.to ? toDateInput(range.to) : "");
              if (instantSingleDay ? range?.from : range?.from && range?.to) {
                onValueChange("custom");
              }
            }}
            numberOfMonths={2}
            className={cn("pointer-events-auto p-3")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
