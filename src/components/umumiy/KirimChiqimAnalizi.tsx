import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/lib/app-context";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";
import {
  MOCK_RECEIPTS,
  MOCK_DEBT_PAYMENTS,
  MOCK_WITHDRAWALS,
  MOCK_SUPPLIER_REPORTS,
  formatSom,
  type CashWithdrawal,
  type DebtPayment,
  type Receipt,
  type SupplierReport,
} from "@/lib/mock-data";

type Period = PeriodFilterValue;
type SliceKind = "sales" | "debt" | "withdrawal" | "supplier" | "demo-income" | "demo-expense";
type Slice = { name: string; value: number; kind?: SliceKind };
type Detail =
  | { slice: Slice; rows: Receipt[]; type: "sales" }
  | { slice: Slice; rows: DebtPayment[]; type: "debt" }
  | { slice: Slice; rows: CashWithdrawal[]; type: "withdrawal" }
  | { slice: Slice; rows: SupplierReport[]; type: "supplier" }
  | { slice: Slice; rows: DemoDetail[]; type: "demo" };
type DemoDetail = {
  date: string;
  person: string;
  amount: number;
  category: string;
  cashier: string;
};

const DEMO_INCOME: Slice[] = [
  { name: "Sotuvdan kirim", value: 18_450_000, kind: "demo-income" },
  { name: "Qarz so'ndirishdan kirim", value: 2_850_000, kind: "demo-income" },
];

const DEMO_EXPENSE: Slice[] = [
  { name: "Yetkazib beruvchilarga to'lov", value: 6_350_000, kind: "demo-expense" },
  { name: "Kommunal to'lovlar", value: 1_250_000, kind: "demo-expense" },
  { name: "Oylik maosh", value: 8_000_000, kind: "demo-expense" },
  { name: "Remont va ta'mir", value: 950_000, kind: "demo-expense" },
  { name: "Transport", value: 1_400_000, kind: "demo-expense" },
  { name: "Tushlik / ovqat", value: 720_000, kind: "demo-expense" },
  { name: "Ofis xarajatlari", value: 580_000, kind: "demo-expense" },
  { name: "Reklama", value: 430_000, kind: "demo-expense" },
  { name: "Internet / aloqa", value: 360_000, kind: "demo-expense" },
  { name: "Qadoqlash", value: 290_000, kind: "demo-expense" },
  { name: "Boshqa chiqim", value: 600_000, kind: "demo-expense" },
];

function mergeSlices(...groups: Slice[][]): Slice[] {
  const map = new Map<string, Slice>();
  groups.flat().forEach((item) => {
    if (!item.name) return;
    const current = map.get(item.name);
    map.set(item.name, {
      ...item,
      value: (current?.value ?? 0) + item.value,
      kind: current?.kind ?? item.kind,
    });
  });
  return Array.from(map.values());
}

const COLORS = [
  "#0836B0",
  "#16a34a",
  "#f97316",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#eab308",
  "#db2777",
  "#475569",
  "#65a30d",
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isInside(dateIso: string, period: Period, from: string, to: string) {
  const d = new Date(dateIso);
  const now = new Date();
  if (period === "all") return true;
  if (period === "today") return d >= startOfDay(now);
  if (period === "week") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return d >= start;
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return d >= start;
  }
  if (period === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return d >= start;
  }
  const fromDate = from ? startOfDay(new Date(from)) : new Date("1970-01-01");
  const toDate = to ? new Date(`${to}T23:59:59`) : new Date("2999-12-31");
  return d >= fromDate && d <= toDate;
}

function sum(values: Slice[]) {
  return values.reduce((acc, item) => acc + item.value, 0);
}

function fmtDate(value: string) {
  return new Date(value).toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function withdrawalTotal(row: CashWithdrawal) {
  return row.cash + row.cardAmount + row.currencies.reduce((s, c) => s + c.amount, 0);
}

function demoRows(slice: Slice): DemoDetail[] {
  return [
    {
      date: new Date("2026-05-07T10:20:00").toISOString(),
      person: slice.kind === "demo-expense" ? "Demo oluvchi" : "Demo mijoz",
      amount: Math.round(slice.value * 0.6),
      category: slice.name,
      cashier: "Admin",
    },
    {
      date: new Date("2026-05-06T15:45:00").toISOString(),
      person: slice.kind === "demo-expense" ? "Demo oluvchi 2" : "Demo mijoz 2",
      amount: slice.value - Math.round(slice.value * 0.6),
      category: slice.name,
      cashier: "Sardor",
    },
  ].filter((row) => row.amount > 0);
}

function ChartCard({
  title,
  icon: Icon,
  data,
  onSelect,
}: {
  title: string;
  icon: React.ElementType;
  data: Slice[];
  onSelect: (slice: Slice) => void;
}) {
  const total = sum(data);
  const visible = data.filter((item) => item.value > 0);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="rounded-full bg-muted px-3 py-1 text-sm font-bold tabular-nums">
          {formatSom(total)}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Ma'lumot yo'q
        </div>
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={visible}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={92}
                  paddingAngle={4}
                  onClick={(entry) => onSelect(entry as Slice)}
                  className="cursor-pointer"
                >
                  {visible.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatSom(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {visible.map((item, index) => (
              <button
                key={item.name}
                type="button"
                onClick={() => onSelect(item)}
                className="grid min-h-16 gap-1.5 rounded-lg border bg-muted/20 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="min-w-0 break-words leading-snug">{item.name}</span>
                </div>
                <span className="justify-self-end whitespace-nowrap text-right font-semibold tabular-nums">
                  {formatSom(item.value)} · {Math.round((item.value / total) * 100)}%
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function KirimChiqimAnalizi() {
  const { t } = useApp();
  const [period, setPeriod] = React.useState<Period>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [netOpen, setNetOpen] = React.useState(false);

  const filteredReceipts = MOCK_RECEIPTS.filter((r) => isInside(r.date, period, from, to));
  const filteredDebtPayments = MOCK_DEBT_PAYMENTS.filter((p) => isInside(p.date, period, from, to));
  const filteredWithdrawals = MOCK_WITHDRAWALS.filter((w) => isInside(w.date, period, from, to));
  const filteredSupplierReports = MOCK_SUPPLIER_REPORTS.filter((r) =>
    isInside(r.date, period, from, to),
  );

  const receiptSales = filteredReceipts.reduce((s, r) => s + r.total, 0);
  const debtPayments = filteredDebtPayments.reduce((s, p) => s + p.amount, 0);

  const extraIncome = period === "all" ? DEMO_INCOME : [];
  const income: Slice[] = mergeSlices(
    [
      { name: t("sales_income"), value: receiptSales, kind: "sales" },
      { name: t("debt_payment_income"), value: debtPayments, kind: "debt" },
    ],
    extraIncome,
  );

  const expenseMap = new Map<string, number>();
  filteredWithdrawals.forEach((w) => {
    expenseMap.set(w.category, (expenseMap.get(w.category) ?? 0) + withdrawalTotal(w));
  });

  const supplierPayments = filteredSupplierReports.reduce((s, r) => s + r.paidAmount, 0);
  if (supplierPayments > 0) expenseMap.set(t("supplier_payment_expense"), supplierPayments);

  const realExpenses: Slice[] = Array.from(expenseMap.entries()).map(([name, value]) => ({
    name,
    value,
    kind: name === t("supplier_payment_expense") ? "supplier" : "withdrawal",
  }));
  const expenses: Slice[] = mergeSlices(realExpenses, period === "all" ? DEMO_EXPENSE : []);
  const totalIncome = sum(income);
  const totalExpenses = sum(expenses);
  const netProfit = totalIncome - totalExpenses;

  const openDetail = (slice: Slice) => {
    if (slice.kind === "sales") setDetail({ slice, rows: filteredReceipts, type: "sales" });
    else if (slice.kind === "debt") setDetail({ slice, rows: filteredDebtPayments, type: "debt" });
    else if (slice.kind === "supplier")
      setDetail({
        slice,
        rows: filteredSupplierReports.filter((row) => row.paidAmount > 0),
        type: "supplier",
      });
    else if (slice.kind === "withdrawal")
      setDetail({
        slice,
        rows: filteredWithdrawals.filter((row) => row.category === slice.name),
        type: "withdrawal",
      });
    else setDetail({ slice, rows: demoRows(slice), type: "demo" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <PeriodFilter
          value={period}
          onValueChange={setPeriod}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
        <Button
          type="button"
          size="sm"
          className="h-7 gap-2 px-3 text-xs"
          onClick={() => setNetOpen(true)}
        >
          Sof foyda
          <span className="font-bold tabular-nums">{formatSom(netProfit)}</span>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("income")} icon={TrendingUp} data={income} onSelect={openDetail} />
        <ChartCard title={t("expense")} icon={TrendingDown} data={expenses} onSelect={openDetail} />
      </div>
      <SegmentDetailDialog detail={detail} onClose={() => setDetail(null)} />
      <NetProfitDialog
        open={netOpen}
        onClose={() => setNetOpen(false)}
        income={income}
        expenses={expenses}
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        netProfit={netProfit}
      />
    </div>
  );
}

function NetProfitDialog({
  open,
  onClose,
  income,
  expenses,
  totalIncome,
  totalExpenses,
  netProfit,
}: {
  open: boolean;
  onClose: () => void;
  income: Slice[];
  expenses: Slice[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sof foyda</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-3">
          <Summary label="Kirim jami" value={formatSom(totalIncome)} />
          <Summary label="Chiqim jami" value={formatSom(totalExpenses)} />
          <Summary
            label="Sof foyda"
            value={formatSom(netProfit)}
            accent={netProfit >= 0}
            danger={netProfit < 0}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Breakdown title="Kirimlar" rows={income} />
          <Breakdown title="Chiqimlar" rows={expenses} />
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Summary({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-lg font-bold tabular-nums ${accent ? "text-primary" : ""} ${danger ? "text-destructive" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Slice[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b bg-muted/50 px-3 py-2 text-sm font-semibold">{title}</div>
      <div className="max-h-72 overflow-auto">
        {rows
          .filter((row) => row.value > 0)
          .map((row) => (
            <div
              key={`${title}-${row.name}`}
              className="grid gap-1 border-b px-3 py-2 text-sm last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3"
            >
              <span className="min-w-0 break-words leading-snug">{row.name}</span>
              <span className="justify-self-end whitespace-nowrap text-right font-semibold tabular-nums">
                {formatSom(row.value)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

function SegmentDetailDialog({ detail, onClose }: { detail: Detail | null; onClose: () => void }) {
  return (
    <Dialog open={!!detail} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="h-4 w-4" /> {detail?.slice.name}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[68vh] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/95 text-xs uppercase text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2 text-left">Qachon</th>
                <th className="px-3 py-2 text-left">
                  {detail?.type === "sales" || detail?.type === "debt" ? "Kimdan" : "Kimga/kimlar"}
                </th>
                <th className="px-3 py-2 text-left">Kategoriya</th>
                <th className="px-3 py-2 text-left">
                  {detail?.type === "withdrawal" ? "Tasdiqlagan/cashier" : "Qabul qilgan"}
                </th>
                <th className="px-3 py-2 text-right">Qancha</th>
                <th className="px-3 py-2 text-left">Chek/detail</th>
              </tr>
            </thead>
            <tbody>
              {detail && renderRows(detail)}
              {detail && detail.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Ma'lumot yo'q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function renderRows(detail: Detail) {
  if (detail.type === "sales") {
    return detail.rows.map((row) => (
      <tr key={row.id} className="border-b align-top last:border-0">
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmtDate(row.date)}</td>
        <td className="px-3 py-2 font-semibold">{row.customerName || "Oddiy mijoz"}</td>
        <td className="px-3 py-2">Kirim</td>
        <td className="px-3 py-2">{row.cashier}</td>
        <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatSom(row.total)}</td>
        <td className="px-3 py-2">
          <Badge variant="outline">{row.id}</Badge>
          <div className="mt-1 text-xs text-muted-foreground">
            {row.items.map((item) => `${item.name} (${item.qty} ${item.unit})`).join(", ")}
          </div>
        </td>
      </tr>
    ));
  }
  if (detail.type === "debt") {
    return detail.rows.map((row) => (
      <tr key={row.id} className="border-b align-top last:border-0">
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmtDate(row.date)}</td>
        <td className="px-3 py-2 font-semibold">{row.customerName}</td>
        <td className="px-3 py-2">Qarz so'ndirish</td>
        <td className="px-3 py-2">{row.cashier}</td>
        <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatSom(row.amount)}</td>
        <td className="px-3 py-2">
          <Badge variant="outline">{row.id}</Badge>
          {row.note && <div className="mt-1 text-xs text-muted-foreground">{row.note}</div>}
        </td>
      </tr>
    ));
  }
  if (detail.type === "withdrawal") {
    return detail.rows.map((row) => (
      <tr key={row.id} className="border-b align-top last:border-0">
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmtDate(row.date)}</td>
        <td className="px-3 py-2 font-semibold">{row.supplierId || row.note || row.category}</td>
        <td className="px-3 py-2">{row.category}</td>
        <td className="px-3 py-2">{row.cashier}</td>
        <td className="px-3 py-2 text-right font-semibold tabular-nums">
          {formatSom(withdrawalTotal(row))}
        </td>
        <td className="px-3 py-2">
          <Badge variant="outline">{row.id}</Badge>
          {row.note && <div className="mt-1 text-xs text-muted-foreground">{row.note}</div>}
        </td>
      </tr>
    ));
  }
  if (detail.type === "supplier") {
    return detail.rows.map((row) => (
      <tr key={row.id} className="border-b align-top last:border-0">
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmtDate(row.date)}</td>
        <td className="px-3 py-2 font-semibold">
          {row.supplierName}
          <div className="text-xs font-normal text-muted-foreground">{row.supplierId}</div>
        </td>
        <td className="px-3 py-2">Yetkazib beruvchilarga to'lov</td>
        <td className="px-3 py-2">{row.addedBy}</td>
        <td className="px-3 py-2 text-right font-semibold tabular-nums">
          {formatSom(row.paidAmount)}
        </td>
        <td className="px-3 py-2">
          <Badge variant="outline">{row.id}</Badge>
          <div className="mt-1 text-xs text-muted-foreground">
            Qolgan: {formatSom(row.remainingDebt)}
          </div>
        </td>
      </tr>
    ));
  }
  return detail.rows.map((row, index) => (
    <tr key={index} className="border-b align-top last:border-0">
      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmtDate(row.date)}</td>
      <td className="px-3 py-2 font-semibold">{row.person}</td>
      <td className="px-3 py-2">{row.category}</td>
      <td className="px-3 py-2">{row.cashier}</td>
      <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatSom(row.amount)}</td>
      <td className="px-3 py-2">
        <Badge variant="outline">DEMO-{index + 1}</Badge>
      </td>
    </tr>
  ));
}
