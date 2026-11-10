import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Clock,
  GitCompareArrows,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Warehouse,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";
import { MOCK_PRODUCTS, MOCK_RECEIPTS, formatSom, type Receipt } from "@/lib/mock-data";
import {
  filterOnlineOrders,
  onlineOrderTotal,
  onlineOrdersSummary,
  type OnlineOrderPeriod,
} from "@/lib/online-sales";

type Period = PeriodFilterValue;
type BucketMode = "hour" | "day" | "month";
type SalesView = "analysis" | "compare" | "online";
type SalesBucket = {
  key: string;
  label: string;
  total: number;
  count: number;
  change: number;
};
type ComparePoint = {
  label: string;
  aLabel?: string;
  bLabel?: string;
  aTotal: number | null;
  bTotal: number | null;
};

const ALL_WAREHOUSES = "all";
const WEEKDAY_FORMAT = new Intl.DateTimeFormat("uz-UZ", { weekday: "short", day: "2-digit" });
const DAY_FORMAT = new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit" });
const MONTH_FORMAT = new Intl.DateTimeFormat("uz-UZ", { month: "short" });

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function inputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseInputDate(value: string) {
  return value ? startOfDay(new Date(`${value}T12:00:00`)) : null;
}

function normalizedInputRange(from: string, to: string) {
  const fromDate = parseInputDate(from);
  const toDate = parseInputDate(to);
  if (!fromDate && !toDate) return null;
  const start = fromDate ?? toDate;
  const end = toDate ?? fromDate;
  if (!start || !end) return null;
  return start <= end
    ? { start: startOfDay(start), end: endOfDay(end) }
    : { start: startOfDay(end), end: endOfDay(start) };
}

function daysInRange(from: string, to: string) {
  const range = normalizedInputRange(from, to);
  if (!range) return 0;
  return (
    Math.floor((startOfDay(range.end).getTime() - startOfDay(range.start).getTime()) / 86400000) + 1
  );
}

function latestReceiptDate(receipts: Receipt[]) {
  if (receipts.length === 0) return new Date();
  return receipts.slice(1).reduce((latest, receipt) => {
    const date = new Date(receipt.date);
    return date > latest ? date : latest;
  }, new Date(receipts[0].date));
}

const productById = new Map(MOCK_PRODUCTS.map((product) => [product.id, product]));
const warehouses = Array.from(
  new Set(MOCK_PRODUCTS.map((product) => product.warehouse).filter(Boolean)),
).sort();

function receiptAmount(receipt: Receipt, warehouse: string) {
  if (warehouse === ALL_WAREHOUSES) return receipt.total;
  return receipt.items.reduce((sum, item) => {
    const product = productById.get(item.productId);
    return product?.warehouse === warehouse ? sum + item.price * item.qty : sum;
  }, 0);
}

function periodRange(period: Period, from: string, to: string, anchor: Date) {
  if (period === "today") return { start: startOfDay(anchor), end: endOfDay(anchor) };
  if (period === "week") return { start: startOfDay(addDays(anchor, -6)), end: endOfDay(anchor) };
  if (period === "month")
    return { start: new Date(anchor.getFullYear(), anchor.getMonth(), 1), end: endOfDay(anchor) };
  if (period === "year")
    return {
      start: new Date(anchor.getFullYear(), 0, 1),
      end: new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  if (period === "custom") {
    return {
      start: from ? startOfDay(new Date(`${from}T12:00:00`)) : new Date("1970-01-01"),
      end: to ? endOfDay(new Date(`${to}T12:00:00`)) : new Date("2999-12-31"),
    };
  }
  return { start: new Date("1970-01-01"), end: new Date("2999-12-31") };
}

function isInside(receipt: Receipt, period: Period, from: string, to: string, anchor: Date) {
  const date = new Date(receipt.date);
  const range = periodRange(period, from, to, anchor);
  return date >= range.start && date <= range.end;
}

function filteredReceipts(
  period: Period,
  from: string,
  to: string,
  anchor: Date,
  warehouse: string,
) {
  return MOCK_RECEIPTS.map((receipt) => ({
    receipt,
    amount: receiptAmount(receipt, warehouse),
  })).filter((row) => row.amount > 0 && isInside(row.receipt, period, from, to, anchor));
}

function getMode(period: Period, from: string, to: string): BucketMode {
  if (period === "today") return "hour";
  if (period === "year") return "month";
  if (period === "custom" && from && to) {
    const days =
      Math.ceil(
        (startOfDay(new Date(`${to}T12:00:00`)).getTime() -
          startOfDay(new Date(`${from}T12:00:00`)).getTime()) /
          86400000,
      ) + 1;
    return days > 62 ? "month" : "day";
  }
  return "day";
}

function buildKeys(
  period: Period,
  from: string,
  to: string,
  anchor: Date,
  mode: BucketMode,
  rows: { receipt: Receipt; amount: number }[],
) {
  if (mode === "hour") {
    return Array.from({ length: 13 }, (_, index) => {
      const hour = index + 8;
      return { key: String(hour), label: `${String(hour).padStart(2, "0")}:00` };
    });
  }
  if (period === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(anchor, index - 6);
      return { key: dateKey(day), label: WEEKDAY_FORMAT.format(day) };
    });
  }
  if (period === "month") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const days = Math.ceil((startOfDay(anchor).getTime() - start.getTime()) / 86400000) + 1;
    return Array.from({ length: days }, (_, index) => {
      const day = addDays(start, index);
      return { key: dateKey(day), label: DAY_FORMAT.format(day) };
    });
  }
  if (mode === "month") {
    const year = anchor.getFullYear();
    return Array.from({ length: 12 }, (_, index) => {
      const month = new Date(year, index, 1);
      return { key: monthKey(month), label: MONTH_FORMAT.format(month) };
    });
  }
  if (period === "custom" && from && to) {
    const start = new Date(`${from}T12:00:00`);
    const end = new Date(`${to}T12:00:00`);
    const days = Math.min(
      92,
      Math.ceil((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1,
    );
    return Array.from({ length: days }, (_, index) => {
      const day = addDays(start, index);
      return { key: dateKey(day), label: DAY_FORMAT.format(day) };
    });
  }
  return Array.from(new Set(rows.map((row) => monthKey(new Date(row.receipt.date)))))
    .sort()
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      const date = new Date(year, month - 1, 1);
      return { key, label: `${MONTH_FORMAT.format(date)} ${year}` };
    });
}

function buildBuckets(
  period: Period,
  from: string,
  to: string,
  anchor: Date,
  rows: { receipt: Receipt; amount: number }[],
) {
  const mode = getMode(period, from, to);
  const totals = new Map<string, { total: number; count: number }>();
  rows.forEach((row) => {
    const date = new Date(row.receipt.date);
    const key =
      mode === "hour" ? String(date.getHours()) : mode === "month" ? monthKey(date) : dateKey(date);
    const current = totals.get(key) ?? { total: 0, count: 0 };
    totals.set(key, { total: current.total + row.amount, count: current.count + 1 });
  });

  let previous = 0;
  return buildKeys(period, from, to, anchor, mode, rows).map((item) => {
    const current = totals.get(item.key) ?? { total: 0, count: 0 };
    const change = current.total - previous;
    previous = current.total;
    return { ...item, ...current, change };
  });
}

function getCompareMode(aFrom: string, aTo: string, bFrom: string, bTo: string): BucketMode {
  const aDays = daysInRange(aFrom, aTo);
  const bDays = daysInRange(bFrom, bTo);
  if (aDays <= 1 && bDays <= 1) return "hour";
  if (Math.max(aDays, bDays) > 62) return "month";
  return "day";
}

function buildCompareSeries(from: string, to: string, warehouse: string, mode: BucketMode) {
  const range = normalizedInputRange(from, to);
  if (!range) return [];

  const totals = new Map<string, { total: number; count: number }>();
  MOCK_RECEIPTS.map((receipt) => ({ receipt, amount: receiptAmount(receipt, warehouse) }))
    .filter((row) => {
      const date = new Date(row.receipt.date);
      return row.amount > 0 && date >= range.start && date <= range.end;
    })
    .forEach((row) => {
      const date = new Date(row.receipt.date);
      const key =
        mode === "hour"
          ? String(date.getHours())
          : mode === "month"
            ? monthKey(date)
            : dateKey(date);
      const current = totals.get(key) ?? { total: 0, count: 0 };
      totals.set(key, { total: current.total + row.amount, count: current.count + 1 });
    });

  if (mode === "hour") {
    return Array.from({ length: 13 }, (_, index) => {
      const hour = index + 8;
      const key = String(hour);
      const current = totals.get(key) ?? { total: 0, count: 0 };
      return { key, label: `${String(hour).padStart(2, "0")}:00`, ...current };
    });
  }

  if (mode === "month") {
    const months: { key: string; label: string }[] = [];
    const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    const end = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
    while (cursor <= end && months.length < 36) {
      months.push({
        key: monthKey(cursor),
        label: `${MONTH_FORMAT.format(cursor)} ${cursor.getFullYear()}`,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months.map((item) => {
      const current = totals.get(item.key) ?? { total: 0, count: 0 };
      return { ...item, ...current };
    });
  }

  const days = Math.min(120, daysInRange(from, to));
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(range.start, index);
    const key = dateKey(day);
    const current = totals.get(key) ?? { total: 0, count: 0 };
    return { key, label: DAY_FORMAT.format(day), ...current };
  });
}

function buildComparePoints(
  aFrom: string,
  aTo: string,
  bFrom: string,
  bTo: string,
  warehouse: string,
) {
  const mode = getCompareMode(aFrom, aTo, bFrom, bTo);
  const aSeries = buildCompareSeries(aFrom, aTo, warehouse, mode);
  const bSeries = buildCompareSeries(bFrom, bTo, warehouse, mode);
  const length = Math.max(aSeries.length, bSeries.length);
  const unit = mode === "hour" ? "soat" : mode === "month" ? "oy" : "kun";
  const points: ComparePoint[] = Array.from({ length }, (_, index) => {
    const a = aSeries[index];
    const b = bSeries[index];
    return {
      label: mode === "hour" ? (a?.label ?? b?.label ?? `${index + 1}`) : `${index + 1}-${unit}`,
      aLabel: a?.label,
      bLabel: b?.label,
      aTotal: a ? a.total : null,
      bTotal: b ? b.total : null,
    };
  });
  return { mode, points };
}

function trendLabel(value: number) {
  if (value > 0) return `+${formatSom(value)}`;
  if (value < 0) return `-${formatSom(Math.abs(value))}`;
  return formatSom(0);
}

function percentLabel(diff: number, base: number) {
  if (base === 0) return diff === 0 ? "0%" : "+100%";
  const value = (diff / base) * 100;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function rangeTotal(from: string, to: string, warehouse: string) {
  const start = from ? startOfDay(new Date(`${from}T12:00:00`)) : new Date("1970-01-01");
  const end = to ? endOfDay(new Date(`${to}T12:00:00`)) : new Date("2999-12-31");
  const rows = MOCK_RECEIPTS.map((receipt) => ({
    receipt,
    amount: receiptAmount(receipt, warehouse),
  })).filter(
    (row) =>
      row.amount > 0 && new Date(row.receipt.date) >= start && new Date(row.receipt.date) <= end,
  );
  return {
    total: rows.reduce((sum, row) => sum + row.amount, 0),
    count: rows.length,
  };
}

export function SavdoAnalizi() {
  const [view, setView] = React.useState<SalesView>("analysis");
  const [period, setPeriod] = React.useState<Period>("today");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [warehouse, setWarehouse] = React.useState(ALL_WAREHOUSES);
  const anchor = React.useMemo(() => latestReceiptDate(MOCK_RECEIPTS), []);
  const [compareAFrom, setCompareAFrom] = React.useState(() => inputDate(addDays(anchor, -13)));
  const [compareATo, setCompareATo] = React.useState(() => inputDate(addDays(anchor, -7)));
  const [compareBFrom, setCompareBFrom] = React.useState(() => inputDate(addDays(anchor, -6)));
  const [compareBTo, setCompareBTo] = React.useState(() => inputDate(anchor));

  const filtered = React.useMemo(
    () => filteredReceipts(period, from, to, anchor, warehouse),
    [anchor, from, period, to, warehouse],
  );
  const rows = React.useMemo(
    () => buildBuckets(period, from, to, anchor, filtered),
    [anchor, filtered, from, period, to],
  );
  const total = filtered.reduce((sum, row) => sum + row.amount, 0);
  const receiptCount = filtered.length;
  const average = receiptCount ? Math.round(total / receiptCount) : 0;
  const activeRows = rows.filter((row) => row.total > 0);
  const peak = activeRows.reduce<SalesBucket | null>(
    (best, row) => (!best || row.total > best.total ? row : best),
    null,
  );
  const last = activeRows.at(-1);
  const previous = activeRows.length > 1 ? activeRows.at(-2) : null;
  const activeChange = last && previous ? last.total - previous.total : 0;
  const trendUp = activeChange >= 0;
  const mode = getMode(period, from, to);
  const modeLabel =
    mode === "hour"
      ? "Soatlar kesimida"
      : mode === "month"
        ? "Oylar kesimida"
        : period === "week"
          ? "Hafta kunlari kesimida"
          : "Kunlar kesimida";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
          <Button
            type="button"
            size="sm"
            variant={view === "analysis" ? "default" : "ghost"}
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => setView("analysis")}
          >
            <BarChart3 className="h-4 w-4" />
            Davr analizi
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "compare" ? "default" : "ghost"}
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => setView("compare")}
          >
            <GitCompareArrows className="h-4 w-4" />
            Davrlarni taqqoslash
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "online" ? "default" : "ghost"}
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => setView("online")}
          >
            <Wifi className="h-4 w-4" />
            Online savdo
          </Button>
        </div>
        {(view === "analysis" || view === "online") && (
          <PeriodFilter
            value={period}
            onValueChange={setPeriod}
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        )}
        {view !== "online" && (
          <Select value={warehouse} onValueChange={setWarehouse}>
            <SelectTrigger className="h-7 w-52 text-xs">
              <Warehouse className="mr-1.5 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_WAREHOUSES}>Barcha omborlar</SelectItem>
              {warehouses.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {view === "analysis" ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Metric title="Jami sotuv" value={formatSom(total)} icon={ReceiptText} accent />
            <Metric title="Cheklar" value={`${receiptCount} ta`} icon={ReceiptText} />
            <Metric title="O'rtacha chek" value={formatSom(average)} icon={Clock} />
            <Metric
              title={mode === "hour" ? "So'nggi soat trendi" : "So'nggi kesim trendi"}
              value={trendLabel(activeChange)}
              icon={trendUp ? TrendingUp : TrendingDown}
              positive={trendUp}
            />
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 grid gap-3 lg:grid-cols-[1fr_330px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">Savdo ustunlari</h3>
                  {peak && (
                    <Badge variant="outline">
                      Eng yuqori: {peak.label} · {formatSom(peak.total)}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {modeLabel} sotuv o'zgarishi ·{" "}
                  {warehouse === ALL_WAREHOUSES ? "barcha omborlar" : warehouse}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Qo'shimcha ma'lumot
                </div>
                <div className="space-y-1.5 text-xs">
                  <InfoLine
                    label="Eng faol kesim"
                    value={peak ? `${peak.label} (${formatSom(peak.total)})` : "—"}
                  />
                  <InfoLine
                    label="O'sish / pasayish"
                    value={trendLabel(activeChange)}
                    tone={trendUp ? "positive" : "negative"}
                  />
                  <InfoLine
                    label="Analiz turi"
                    value={mode === "hour" ? "Soatlik" : mode === "month" ? "Oylik" : "Kunlik"}
                  />
                  <InfoLine
                    label="Ombor"
                    value={warehouse === ALL_WAREHOUSES ? "Barchasi" : warehouse}
                  />
                </div>
              </div>
            </div>

            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  margin={{ left: 0, right: 8, top: 6, bottom: 0 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeOpacity={0.4}
                    strokeDasharray="2 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                    width={36}
                  />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid color-mix(in oklab, var(--primary) 30%, transparent)",
                      borderRadius: 8,
                      fontSize: 11,
                      color: "var(--primary)",
                    }}
                    labelStyle={{ color: "var(--primary)", fontWeight: 600 }}
                    itemStyle={{ color: "var(--primary)" }}
                    formatter={(value: number, name: string) => [
                      formatSom(Number(value)),
                      name === "total" ? "Sotuv" : name,
                    ]}
                    labelFormatter={(label) =>
                      `${mode === "hour" ? "Soat" : mode === "month" ? "Oy" : "Sana"}: ${label}`
                    }
                  />
                  <Bar
                    dataKey="total"
                    name="Sotuv"
                    fill="var(--primary)"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="border-b px-3 py-2 text-sm font-semibold">{modeLabel} tafsilot</div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      {mode === "hour" ? "Soat" : mode === "month" ? "Oy" : "Sana"}
                    </th>
                    <th className="px-3 py-2 text-right">Sotuv</th>
                    <th className="px-3 py-2 text-right">Chek</th>
                    <th className="px-3 py-2 text-right">O'zgarish</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b last:border-b-0">
                      <td className="px-3 py-2 font-medium">{row.label}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatSom(row.total)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                      <td
                        className={`px-3 py-2 text-right font-semibold tabular-nums ${row.change >= 0 ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {trendLabel(row.change)}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        Ma'lumot yo'q
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : view === "compare" ? (
        <CompareView
          warehouse={warehouse}
          aFrom={compareAFrom}
          aTo={compareATo}
          bFrom={compareBFrom}
          bTo={compareBTo}
          onAFrom={setCompareAFrom}
          onATo={setCompareATo}
          onBFrom={setCompareBFrom}
          onBTo={setCompareBTo}
        />
      ) : (
        <OnlineSalesAnalysis period={period} from={from} to={to} anchor={anchor} />
      )}
    </div>
  );
}

function OnlineSalesAnalysis({
  period,
  from,
  to,
  anchor,
}: {
  period: Period;
  from: string;
  to: string;
  anchor: Date;
}) {
  const onlineRows = React.useMemo(
    () =>
      filterOnlineOrders({
        period: period as OnlineOrderPeriod,
        from,
        to,
      }),
    [from, period, to],
  );
  const onlineSummary = onlineOrdersSummary(onlineRows);
  const offlineRows = React.useMemo(
    () => filteredReceipts(period, from, to, anchor, ALL_WAREHOUSES),
    [anchor, from, period, to],
  );
  const offlineTotal = offlineRows.reduce((sum, row) => sum + row.amount, 0);
  const allTotal = onlineSummary.total + offlineTotal;
  const onlineShare = allTotal > 0 ? (onlineSummary.total / allTotal) * 100 : 0;
  const offlineShare = allTotal > 0 ? (offlineTotal / allTotal) * 100 : 0;
  const compareRows = [
    { label: "Online savdo", total: onlineSummary.total, count: onlineSummary.count },
    { label: "Oddiy savdo", total: offlineTotal, count: offlineRows.length },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric title="Online zakaz" value={`${onlineSummary.count} ta`} icon={Wifi} accent />
        <Metric title="Online summa" value={formatSom(onlineSummary.total)} icon={ReceiptText} />
        <Metric
          title="Qabul qilingan"
          value={`${onlineSummary.acceptedCount} ta`}
          icon={TrendingUp}
          positive
        />
        <Metric
          title="Tasdiqlangan"
          value={`${onlineSummary.confirmedCount} ta`}
          icon={ReceiptText}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3">
            <div className="text-sm font-semibold">Online va oddiy savdo taqqoslash</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Tanlangan davr bo'yicha summa va chek/zakaz soni
            </div>
          </div>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={compareRows}
                margin={{ left: 0, right: 8, top: 6, bottom: 0 }}
                barCategoryGap="45%"
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeOpacity={0.4}
                  strokeDasharray="2 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                  width={36}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid color-mix(in oklab, var(--primary) 30%, transparent)",
                    borderRadius: 8,
                    fontSize: 11,
                    color: "var(--primary)",
                  }}
                  formatter={(value: number, name: string) => [
                    formatSom(Number(value)),
                    name === "total" ? "Summa" : name,
                  ]}
                />
                <Bar
                  dataKey="total"
                  name="Summa"
                  fill="var(--primary)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="text-sm font-semibold">Ulush</div>
            <div className="mt-3 space-y-2">
              <ShareRow
                label="Online"
                percent={onlineShare}
                value={formatSom(onlineSummary.total)}
              />
              <ShareRow label="Oddiy" percent={offlineShare} value={formatSom(offlineTotal)} />
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="text-sm font-semibold">Statuslar</div>
            <div className="mt-3 space-y-1.5 text-xs">
              <InfoLine
                label="Qabul qilingan"
                value={`${onlineSummary.acceptedCount} ta · ${formatSom(onlineSummary.acceptedTotal)}`}
                tone="positive"
              />
              <InfoLine
                label="Tasdiqlangan"
                value={`${onlineSummary.confirmedCount} ta · ${formatSom(onlineSummary.confirmedTotal)}`}
                tone="positive"
              />
              <InfoLine
                label="Bekor qilingan"
                value={`${onlineSummary.canceledCount} ta`}
                tone="negative"
              />
              <InfoLine
                label="Oddiy savdo cheklari"
                value={`${offlineRows.length} ta · ${formatSom(offlineTotal)}`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-3 py-2 text-sm font-semibold">Online zakazlar tafsiloti</div>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Zakaz</th>
                <th className="px-3 py-2 text-left">Mijoz</th>
                <th className="px-3 py-2 text-right">Summa</th>
                <th className="px-3 py-2 text-left">Holat</th>
                <th className="px-3 py-2 text-left">Vaqt</th>
              </tr>
            </thead>
            <tbody>
              {onlineRows.map((order) => (
                <tr key={order.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-mono text-xs font-bold text-primary">{order.id}</td>
                  <td className="px-3 py-2 font-medium">{order.customerName}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {formatSom(onlineOrderTotal(order))}
                  </td>
                  <td className="px-3 py-2">{onlineStatusLabel(order.status)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString("uz-UZ")}
                  </td>
                </tr>
              ))}
              {onlineRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Online zakaz topilmadi
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

function ShareRow({ label, percent, value }: { label: string; percent: number; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">
          {percent.toFixed(1)}% · {value}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

function onlineStatusLabel(status: string) {
  if (status === "pending") return "Yangi";
  if (status === "accepted") return "Qabul qilingan";
  if (status === "completed") return "Tasdiqlangan";
  if (status === "canceled") return "Bekor qilingan";
  return status;
}

function CompareView({
  warehouse,
  aFrom,
  aTo,
  bFrom,
  bTo,
  onAFrom,
  onATo,
  onBFrom,
  onBTo,
}: {
  warehouse: string;
  aFrom: string;
  aTo: string;
  bFrom: string;
  bTo: string;
  onAFrom: (value: string) => void;
  onATo: (value: string) => void;
  onBFrom: (value: string) => void;
  onBTo: (value: string) => void;
}) {
  const a = rangeTotal(aFrom, aTo, warehouse);
  const b = rangeTotal(bFrom, bTo, warehouse);
  const compareChart = React.useMemo(
    () => buildComparePoints(aFrom, aTo, bFrom, bTo, warehouse),
    [aFrom, aTo, bFrom, bTo, warehouse],
  );
  const diff = b.total - a.total;
  const positive = diff >= 0;
  const compareModeLabel =
    compareChart.mode === "hour"
      ? "Soatlar kesimida"
      : compareChart.mode === "month"
        ? "Oylar kesimida"
        : "Kunlar kesimida";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-base font-semibold">Davrlarni taqqoslash</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {warehouse === ALL_WAREHOUSES ? "Barcha omborlar" : warehouse}
            </div>
          </div>
          <div
            className={`rounded-lg border px-3 py-2 text-right ${positive ? "border-primary/25 bg-primary/5" : "border-destructive/25 bg-destructive/5"}`}
          >
            <div className="text-[10px] uppercase text-muted-foreground">Farq</div>
            <div
              className={`text-sm font-bold tabular-nums ${positive ? "text-primary" : "text-destructive"}`}
            >
              {trendLabel(diff)} · {percentLabel(diff, a.total)}
            </div>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <CompareBlock
            from={aFrom}
            to={aTo}
            onFrom={onAFrom}
            onTo={onATo}
            total={a.total}
            count={a.count}
          />
          <CompareBlock
            from={bFrom}
            to={bTo}
            onFrom={onBFrom}
            onTo={onBTo}
            total={b.total}
            count={b.count}
            accent
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Davrlar column chart orqali solishtirish</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {compareModeLabel} · {warehouse === ALL_WAREHOUSES ? "barcha omborlar" : warehouse}
            </div>
          </div>
          <Badge variant="outline">
            A: {formatSom(a.total)} · B: {formatSom(b.total)}
          </Badge>
        </div>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={compareChart.points}
              margin={{ left: 0, right: 8, top: 6, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeOpacity={0.4}
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                width={36}
              />
              <Tooltip
                cursor={false}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid color-mix(in oklab, var(--primary) 30%, transparent)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "var(--primary)",
                }}
                labelStyle={{ color: "var(--primary)", fontWeight: 600 }}
                itemStyle={{ color: "var(--primary)" }}
                formatter={(value: number, name: string) => [
                  formatSom(Number(value)),
                  name === "aTotal" ? "1-davr" : "2-davr",
                ]}
                labelFormatter={(label, payload) => {
                  const point = payload?.[0]?.payload as ComparePoint | undefined;
                  if (!point) return String(label);
                  return `${label} · A: ${point.aLabel ?? "-"} · B: ${point.bLabel ?? "-"}`;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
              <Bar
                dataKey="aTotal"
                name="1-davr"
                fill="var(--muted-foreground)"
                radius={[2, 2, 0, 0]}
                maxBarSize={14}
              />
              <Bar
                dataKey="bTotal"
                name="2-davr"
                fill="var(--primary)"
                radius={[2, 2, 0, 0]}
                maxBarSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CompareBlock({
  from,
  to,
  onFrom,
  onTo,
  total,
  count,
  accent,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  total: number;
  count: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${accent ? "border-primary/25 bg-primary/5" : "bg-card"}`}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">
            Boshlanish
          </Label>
          <Input
            className="h-8 text-xs"
            type="date"
            value={from}
            onChange={(event) => onFrom(event.target.value)}
          />
        </div>
        <div>
          <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">Tugash</Label>
          <Input
            className="h-8 text-xs"
            type="date"
            value={to}
            onChange={(event) => onTo(event.target.value)}
          />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Summary label="Sotuv" value={formatSom(total)} accent={accent} />
        <Summary label="Chek" value={`${count} ta`} />
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  accent,
  positive,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  accent?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase text-muted-foreground">{title}</div>
        <Icon
          className={`h-4 w-4 ${positive === false ? "text-destructive" : accent || positive ? "text-primary" : "text-muted-foreground"}`}
        />
      </div>
      <div
        className={`mt-2 text-lg font-bold tabular-nums ${accent ? "text-primary" : ""} ${positive === false ? "text-destructive" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border bg-background/70 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-background/70 px-2 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`text-right font-semibold tabular-nums ${tone === "positive" ? "text-primary" : ""} ${tone === "negative" ? "text-destructive" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
