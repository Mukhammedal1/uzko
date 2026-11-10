import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MOCK_RECEIPTS,
  MOCK_CREDIT_CUSTOMERS,
  MOCK_DEBT_PAYMENTS,
  formatSom,
  type Receipt,
} from "@/lib/mock-data";
import { CalendarDays, Printer, Search, X } from "lucide-react";
import { toast } from "sonner";

type Period = "all" | "today" | "week" | "month" | "custom";

type NasiyaSaleRow = Receipt & {
  debtPaidAmount: number;
  debtStatus: "paid" | "unpaid" | "partial";
  customerPhone?: string;
};

const today = new Date("2026-05-07T12:00:00");

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function inPeriod(date: Date, period: Period, from: string, to: string) {
  if (period === "all") return true;
  if (period === "today") return date >= startOfDay(today) && date <= endOfDay(today);
  if (period === "week") {
    const start = startOfDay(new Date(today));
    start.setDate(today.getDate() - 6);
    return date >= start && date <= endOfDay(today);
  }
  if (period === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return date >= start && date <= endOfDay(today);
  }
  if (period === "custom") {
    if (from && date < startOfDay(new Date(from))) return false;
    if (to && date > endOfDay(new Date(to))) return false;
  }
  return true;
}

function normalizePhone(value?: string) {
  return (value ?? "").replace(/\D/g, "");
}

function customerForReceipt(receipt: Receipt) {
  const name = (receipt.customerName ?? "").toLowerCase();
  return MOCK_CREDIT_CUSTOMERS.find((c) => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    return fullName === name || fullName.includes(name) || name.includes(fullName);
  });
}

function makeRows(): NasiyaSaleRow[] {
  return MOCK_RECEIPTS.filter((receipt) => receipt.customerType === "nasiya").map((receipt) => {
    const customer = customerForReceipt(receipt);
    const paid = MOCK_DEBT_PAYMENTS.filter(
      (p) => p.customerId === customer?.id || p.customerName === receipt.customerName,
    ).reduce((sum, payment) => sum + payment.amount, 0);
    const debtPaidAmount = Math.min(receipt.total, paid);
    const debtStatus =
      debtPaidAmount >= receipt.total ? "paid" : debtPaidAmount > 0 ? "partial" : "unpaid";
    return {
      ...receipt,
      customerName:
        receipt.customerName ??
        (customer ? `${customer.firstName} ${customer.lastName}` : "Noma'lum nasiyachi"),
      customerPhone: customer?.phone,
      debtPaidAmount,
      debtStatus,
    };
  });
}

function statusLabel(status: NasiyaSaleRow["debtStatus"]) {
  if (status === "paid") return "To'langan";
  if (status === "partial") return "Qisman to'langan";
  return "To'lanmagan";
}

function statusClass(status: NasiyaSaleRow["debtStatus"]) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export function NasiyaSavdolar() {
  const [query, setQuery] = React.useState("");
  const [period, setPeriod] = React.useState<Period>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const rows = React.useMemo(() => makeRows(), []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const phoneQ = normalizePhone(query);
    return rows.filter((row) => {
      const date = new Date(row.date);
      if (!inPeriod(date, period, from, to)) return false;
      if (!q) return true;
      const text = [
        row.id,
        row.cashier,
        row.customerName,
        row.customerPhone,
        statusLabel(row.debtStatus),
      ]
        .join(" ")
        .toLowerCase();
      const phoneMatch = phoneQ.length > 0 && normalizePhone(row.customerPhone).includes(phoneQ);
      return text.includes(q) || phoneMatch;
    });
  }, [from, period, query, rows, to]);

  const total = filtered.reduce((sum, row) => sum + row.total, 0);
  const unpaid = filtered.reduce(
    (sum, row) => sum + Math.max(0, row.total - row.debtPaidAmount),
    0,
  );

  const reset = () => {
    setQuery("");
    setPeriod("all");
    setFrom("");
    setTo("");
  };

  const printRow = (row: NasiyaSaleRow) => {
    toast.success(`${row.id} nasiya cheki chop etildi`);
  };

  return (
    <div className="nasiya-savdolar-page flex h-full min-h-0 flex-col">
      <div className="nasiya-filter-panel border-b bg-card p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chek raqami, nasiyachi ismi yoki telefon orqali qidirish..."
              className="h-10 pl-9"
            />
          </div>

          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Davr
            <select
              className="h-10 min-w-[150px] rounded-md border bg-background px-3 text-sm text-foreground"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
            >
              <option value="all">Barcha davr</option>
              <option value="today">Bugun</option>
              <option value="week">Oxirgi 7 kun</option>
              <option value="month">Bu oy</option>
              <option value="custom">Istalgan davr</option>
            </select>
          </label>

          {period === "custom" && (
            <>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Boshlanish
                <input
                  type="date"
                  className="h-10 rounded-md border bg-background px-3 text-sm text-foreground"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Tugash
                <input
                  type="date"
                  className="h-10 rounded-md border bg-background px-3 text-sm text-foreground"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </>
          )}

          <Button variant="outline" className="gap-2" onClick={reset}>
            <X className="h-4 w-4" />
            Tozalash
          </Button>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Nasiya savdolar soni</div>
            <div className="text-xl font-bold">{filtered.length} ta</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Umumiy summa</div>
            <div className="text-xl font-bold text-primary">{formatSom(total)}</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">To'lanmagan qoldiq</div>
            <div className="text-xl font-bold text-destructive">{formatSom(unpaid)}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="overflow-auto rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Chek raqami</th>
                <th className="px-3 py-2 text-left font-semibold">Sana</th>
                <th className="px-3 py-2 text-left font-semibold">Sotuvchi</th>
                <th className="px-3 py-2 text-left font-semibold">Nasiyachi</th>
                <th className="px-3 py-2 text-left font-semibold">Telefon</th>
                <th className="px-3 py-2 text-right font-semibold">Summa</th>
                <th className="px-3 py-2 text-center font-semibold">Holati</th>
                <th className="px-3 py-2 text-center font-semibold">Print</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/40">
                  <td className="px-3 py-2 font-mono text-xs font-semibold">{row.id}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(row.date).toLocaleString("uz-UZ")}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium">{row.cashier}</td>
                  <td className="px-3 py-2 font-medium">{row.customerName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.customerPhone ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {formatSom(row.total)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant="outline" className={statusClass(row.debtStatus)}>
                      {statusLabel(row.debtStatus)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => printRow(row)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nasiya savdolar topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
