import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReceiptText, Search } from "lucide-react";
import { MOCK_SUPPLIER_REPORTS, formatSom, type SupplierReport } from "@/lib/mock-data";
import { useApp } from "@/lib/app-context";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";

type Period = PeriodFilterValue;
type KpiKind = "borrowed" | "paid" | "remaining";

function fmtDate(value: string) {
  return new Date(value).toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  if (period === "month") return d >= new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "year") return d >= new Date(now.getFullYear(), 0, 1);
  const fromDate = from ? startOfDay(new Date(from)) : new Date("1970-01-01");
  const toDate = to ? new Date(`${to}T23:59:59`) : new Date("2999-12-31");
  return d >= fromDate && d <= toDate;
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

export function Hisobot() {
  const { t } = useApp();
  const [period, setPeriod] = React.useState<Period>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [supplierName, setSupplierName] = React.useState("");
  const [supplierPhone, setSupplierPhone] = React.useState("");
  const [supplierId, setSupplierId] = React.useState("");
  const [detail, setDetail] = React.useState<KpiKind | null>(null);
  const filteredReports = React.useMemo(
    () =>
      MOCK_SUPPLIER_REPORTS.filter((row) => {
        if (!isInside(row.date, period, from, to)) return false;
        if (supplierName && !matches(row.supplierName, supplierName)) return false;
        if (supplierPhone && !matches(row.supplierPhone || "", supplierPhone)) return false;
        if (supplierId && !matches(row.supplierId, supplierId)) return false;
        return true;
      }),
    [supplierId, supplierName, supplierPhone, from, period, to],
  );

  const totals = filteredReports.reduce(
    (acc, item) => ({
      total: acc.total + item.totalAmount,
      paid: acc.paid + item.paidAmount,
      debt: acc.debt + item.remainingDebt,
    }),
    { total: 0, paid: 0, debt: 0 },
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="rounded-lg border bg-card p-2.5 shadow-sm">
        <div className="grid items-end gap-2 md:grid-cols-2 xl:grid-cols-[auto_repeat(3,minmax(0,1fr))]">
          <PeriodFilter
            value={period}
            onValueChange={setPeriod}
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          <Field
            label="Yetkazib beruvchi ismi"
            icon={<Search className="h-4 w-4 text-muted-foreground" />}
          >
            <Input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Bekzod"
            />
          </Field>
          <Field label="Yetkazib beruvchi telefon">
            <Input
              value={supplierPhone}
              onChange={(e) => setSupplierPhone(e.target.value)}
              placeholder="+998"
            />
          </Field>
          <Field label="Yetkazib beruvchi ID">
            <Input
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              placeholder="YB-0001"
            />
          </Field>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Kpi
          label="Qarzga olingan tovarlar summasi"
          value={formatSom(totals.total)}
          onClick={() => setDetail("borrowed")}
        />
        <Kpi label="Berganimiz" value={formatSom(totals.paid)} onClick={() => setDetail("paid")} />
        <Kpi
          label="Qolgan qarzimiz"
          value={formatSom(totals.debt)}
          accent
          onClick={() => setDetail("remaining")}
        />
      </div>
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="border-b py-2.5">
          <CardTitle className="text-base">{t("supplier_report_list")}</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto p-0">
          <table className="w-full min-w-[1060px] text-sm">
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
              <tr className="border-b text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 text-left">{t("date")}</th>
                <th className="px-3 py-2 text-left">{t("supplier_id")}</th>
                <th className="px-3 py-2 text-left">{t("supplier")}</th>
                <th className="px-3 py-2 text-left">{t("phone")}</th>
                <th className="px-3 py-2 text-left">{t("products")}</th>
                <th className="px-3 py-2 text-right">{t("total_amount")}</th>
                <th className="px-3 py-2 text-right">{t("paid_amount")}</th>
                <th className="px-3 py-2 text-right">{t("remaining_debt")}</th>
                <th className="px-3 py-2 text-left">{t("added_by")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((row) => (
                <tr key={row.id} className="border-b align-top hover:bg-muted/40">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {fmtDate(row.date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-primary">
                    {row.supplierId}
                  </td>
                  <td className="px-3 py-2 font-semibold">{row.supplierName}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.supplierPhone || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      {row.items.map((item, idx) => (
                        <div key={idx} className="rounded-md bg-muted/40 px-2 py-1">
                          <span className="font-medium">{item.productName}</span>{" "}
                          <span className="text-muted-foreground">
                            — {item.qty} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {formatSom(row.totalAmount)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatSom(row.paidAmount)}</td>
                  <td className="px-3 py-2 text-right font-bold text-primary tabular-nums">
                    {formatSom(row.remainingDebt)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{row.addedBy}</Badge>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    {t("empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <SupplierDetailDialog
        kind={detail}
        reports={filteredReports}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        {icon}
        {children}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border bg-card p-2.5 text-left shadow-sm transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={"mt-0.5 text-base font-bold tabular-nums " + (accent ? "text-primary" : "")}>
        {value}
      </div>
    </button>
  );
}

function SupplierDetailDialog({
  kind,
  reports,
  onClose,
}: {
  kind: KpiKind | null;
  reports: SupplierReport[];
  onClose: () => void;
}) {
  const title =
    kind === "borrowed"
      ? "Qarzga olingan tovarlar"
      : kind === "paid"
        ? "Berganimiz"
        : "Qolgan qarzimiz";
  const amount =
    kind === "borrowed" ? "totalAmount" : kind === "paid" ? "paidAmount" : "remainingDebt";
  const rows = kind ? reports.filter((row) => row[amount] > 0) : [];

  return (
    <Dialog open={!!kind} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="grid max-h-[92dvh] max-w-[min(96vw,1280px)] grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="h-4 w-4" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 overflow-auto rounded-md border">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 bg-muted/95 text-xs uppercase text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2 text-left">{kind === "paid" ? "Kimga" : "Kimdan"}</th>
                <th className="px-3 py-2 text-left">Qachon</th>
                {kind !== "paid" && <th className="px-3 py-2 text-left">Mahsulot</th>}
                {kind === "borrowed" && <th className="px-3 py-2 text-right">Qancha</th>}
                <th className="px-3 py-2 text-right">
                  {kind === "remaining" ? "Qoldiq" : "Summa"}
                </th>
                {kind === "paid" && <th className="px-3 py-2 text-right">Qolgan qarzi</th>}
                <th className="px-3 py-2 text-left">Chek/detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap((row) =>
                (kind === "paid" ? [row] : row.items).map((item, index) => (
                  <tr key={`${row.id}-${index}`} className="border-b align-top last:border-0">
                    <td className="px-3 py-2 font-semibold">
                      {row.supplierName}
                      <div className="text-xs font-normal text-muted-foreground">
                        {row.supplierId} · {row.supplierPhone}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {fmtDate(row.date)}
                    </td>
                    {kind !== "paid" && (
                      <td className="px-3 py-2">
                        {!("productName" in item) ? "—" : item.productName}
                      </td>
                    )}
                    {kind === "borrowed" && (
                      <td className="px-3 py-2 text-right tabular-nums">
                        {"qty" in item ? `${item.qty} ${item.unit}` : "—"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatSom(
                        kind === "paid"
                          ? row.paidAmount
                          : kind === "remaining"
                            ? row.remainingDebt
                            : "amount" in item
                              ? item.amount
                              : row.totalAmount,
                      )}
                    </td>
                    {kind === "paid" && (
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatSom(row.remainingDebt)}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <Badge variant="outline">{row.id}</Badge>
                      {row.note && (
                        <div className="mt-1 text-xs text-muted-foreground">{row.note}</div>
                      )}
                    </td>
                  </tr>
                )),
              )}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
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
