import * as React from "react";
import * as XLSX from "xlsx";
import {
  ArrowLeftRight,
  Bot,
  FileSpreadsheet,
  FileText,
  Pencil,
  Printer,
  ReceiptText,
  Search,
  Truck,
  UserPlus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";
import { MoneyOperationDialog } from "@/components/shared/MoneyOperationDialog";
import { MoneyOperationsList } from "@/components/shared/MoneyOperationsList";
import { dispatchReceiptMessage } from "@/lib/data-actions";
import { formatNumberInput } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { MOCK_SUPPLIER_REPORTS, formatSom, type SupplierReport } from "@/lib/mock-data";
import { toast } from "sonner";

type Period = PeriodFilterValue;

type AgentRow = {
  id: string;
  name: string;
  phone: string;
  botEnabled: boolean;
  total: number;
  paid: number;
  remaining: number;
  receipts: SupplierReport[];
};

type DetailState =
  | {
      type: "agent-groups";
      title: string;
      rows: AgentRow[];
      metric: "count" | "total" | "remaining";
    }
  | {
      type: "agent-receipts";
      title: string;
      rows: SupplierReport[];
      agent: { id: string; name: string; phone?: string; botEnabled?: boolean };
    }
  | null;

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

function matchesMany(values: Array<string | undefined>, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(normalized),
  );
}

function amountMatches(amount: number, query: string) {
  const digits = query.trim().replace(/\D/g, "");
  if (!digits) return true;
  return String(Math.round(amount)).includes(digits);
}

function fmtDate(value: string) {
  return new Date(value).toLocaleString("uz-UZ");
}

function reportKindLabel(report: Pick<SupplierReport, "type">) {
  if (report.type === "return") return "Qaytarish";
  if (report.type === "payment") return "To'lov";
  return "Prixod";
}

export function exportAgentHistoryToExcel(
  rows: SupplierReport[],
  agentId: string,
  agentName: string,
) {
  const data = rows.flatMap((report) =>
    report.items.map((item) => ({
      Chek: report.id,
      Sana: fmtDate(report.date),
      Turi: reportKindLabel(report),
      "Tovar nomi": item.productName,
      Miqdor: item.qty,
      Birligi: item.unit,
      Summasi: item.amount,
      Mashina: report.vehicleName || "",
      "Mashina raqami": report.vehiclePlate || "",
      Haydovchi: report.driverName || "",
      "Haydovchi raqami": report.driverPhone || "",
      Izoh: report.note || "",
    })),
  );

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 26 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tovarlar tarixi");
  XLSX.writeFile(workbook, `agent-${agentId}-tovarlar-tarixi.xlsx`);
}

export function printAgentNakladnoy(
  rows: SupplierReport[],
  agentId: string,
  agentName: string,
  agentPhone: string,
  storeName: string,
  storePhone: string,
) {
  const win = window.open("", "_blank");
  if (!win) return;

  const items = rows.flatMap((report) =>
    report.items.map((item) => ({ ...item, reportId: report.id, date: report.date })),
  );
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const transportRows = rows.filter(
    (report) =>
      report.vehicleName || report.vehiclePlate || report.driverName || report.driverPhone,
  );

  win.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Nakladnoy — ${agentName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 18px; margin: 0 0 2px; }
          .muted { color: #555; font-size: 12px; }
          .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #333; padding: 8px; font-size: 13px; text-align: left; }
          th { background: #f2f2f2; }
          .right { text-align: right; }
          .total-row td { font-weight: bold; }
          .signs { display: flex; justify-content: space-between; margin-top: 48px; }
          .sign { width: 45%; border-top: 1px solid #333; padding-top: 4px; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="head">
          <div>
            <h1>${storeName || "Agent tovarlar tarixi nakladnoyi"}</h1>
            ${storePhone ? `<div class="muted">Tel: ${storePhone}</div>` : ""}
          </div>
          <div class="muted">
            <div>Agent: <b>${agentName}</b> (${agentId})</div>
            ${agentPhone ? `<div>Tel: ${agentPhone}</div>` : ""}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Chek</th>
              <th>Sana</th>
              <th>Tovar nomi</th>
              <th class="right">Miqdor</th>
              <th class="right">Summa</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.reportId}</td>
                <td>${fmtDate(item.date)}</td>
                <td>${item.productName}</td>
                <td class="right">${item.qty} ${item.unit}</td>
                <td class="right">${formatSom(item.amount)}</td>
              </tr>
            `,
              )
              .join("")}
            <tr class="total-row">
              <td colspan="5" class="right">Jami:</td>
              <td class="right">${formatSom(total)}</td>
            </tr>
          </tbody>
        </table>

        ${
          transportRows.length > 0
            ? `<div class="muted" style="margin-top:16px;">
                <b>Mashrut ma'lumotlari</b>
                ${transportRows
                  .map(
                    (report) => `
                  <div style="margin-top:4px;">
                    Chek ${report.id}:
                    ${report.vehicleName ? ` Mashina — ${report.vehicleName}` : ""}
                    ${report.vehiclePlate ? ` (${report.vehiclePlate})` : ""}
                    ${report.driverName ? ` · Haydovchi — ${report.driverName}` : ""}
                    ${report.driverPhone ? ` (${report.driverPhone})` : ""}
                  </div>
                `,
                  )
                  .join("")}
              </div>`
            : ""
        }

        <div class="signs">
          <div class="sign">Topshirdi: ${agentName}</div>
          <div class="sign">Qabul qildi (F.I.Sh, imzo)</div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

export function printAgentReceipt80mm(
  report: SupplierReport,
  storeName: string,
  storePhone: string,
) {
  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Chek ${report.id}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 4mm; color: #000; font-size: 12px; }
          h1 { font-size: 14px; margin: 0 0 2px; text-align: center; }
          .muted { color: #333; font-size: 11px; text-align: center; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; gap: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; font-weight: normal; border-bottom: 1px dashed #000; padding-bottom: 2px; }
          td { padding: 2px 0; vertical-align: top; }
          .right { text-align: right; }
          .total { font-weight: bold; font-size: 13px; }
        </style>
      </head>
      <body>
        <h1>${storeName || "Prixod cheki"}</h1>
        ${storePhone ? `<div class="muted">Tel: ${storePhone}</div>` : ""}
        <div class="line"></div>
        <div class="row"><span>Chek:</span><span><b>${report.id}</b></span></div>
        <div class="row"><span>Sana:</span><span>${fmtDate(report.date)}</span></div>
        <div class="row"><span>Turi:</span><span>${reportKindLabel(report)}</span></div>
        <div class="row"><span>Agent:</span><span>${report.agentName}</span></div>
        ${report.agentPhone ? `<div class="row"><span>Tel:</span><span>${report.agentPhone}</span></div>` : ""}
        <div class="line"></div>
        <table>
          <thead>
            <tr><th>Tovar</th><th class="right">Miqdor</th><th class="right">Summa</th></tr>
          </thead>
          <tbody>
            ${report.items
              .map(
                (item) => `
              <tr>
                <td>${item.productName}</td>
                <td class="right">${item.qty} ${item.unit}</td>
                <td class="right">${formatSom(item.amount)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        <div class="line"></div>
        <div class="row total"><span>Jami:</span><span>${formatSom(report.totalAmount)}</span></div>
        <div class="row"><span>Berilgan:</span><span>${formatSom(report.paidAmount)}</span></div>
        <div class="row"><span>Qoldiq:</span><span>${formatSom(report.remainingDebt)}</span></div>
        ${
          report.vehicleName || report.vehiclePlate || report.driverName || report.driverPhone
            ? `<div class="line"></div>
               ${report.vehicleName || report.vehiclePlate ? `<div class="row"><span>Mashina:</span><span>${report.vehicleName || ""}${report.vehiclePlate ? ` (${report.vehiclePlate})` : ""}</span></div>` : ""}
               ${report.driverName || report.driverPhone ? `<div class="row"><span>Haydovchi:</span><span>${report.driverName || ""}${report.driverPhone ? ` (${report.driverPhone})` : ""}</span></div>` : ""}`
            : ""
        }
        ${report.note ? `<div class="line"></div><div class="muted">${report.note}</div>` : ""}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

function nextAgentId() {
  const max = MOCK_SUPPLIER_REPORTS.reduce((acc, row) => {
    const parsed = Number.parseInt(row.agentId.replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) && parsed > acc ? parsed : acc;
  }, 0);
  return `AG-${String(max + 1).padStart(4, "0")}`;
}

export function AgentlarPage() {
  const { settings } = useApp();
  const [detail, setDetail] = React.useState<DetailState>(null);
  const [selectedReport, setSelectedReport] = React.useState<SupplierReport | null>(null);
  const [period, setPeriod] = React.useState<Period>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [addAgentOpen, setAddAgentOpen] = React.useState(false);
  const [editingAgent, setEditingAgent] = React.useState<AgentRow | null>(null);
  const [deletingAgent, setDeletingAgent] = React.useState<AgentRow | null>(null);
  const [moneyOpAgent, setMoneyOpAgent] = React.useState<AgentRow | null>(null);

  const moneyOpBalance = React.useMemo(
    () =>
      moneyOpAgent
        ? MOCK_SUPPLIER_REPORTS.filter((r) => r.agentId === moneyOpAgent.id).reduce(
            (sum, r) => sum + r.remainingDebt,
            0,
          )
        : 0,
    [moneyOpAgent, refreshKey],
  );

  const [receiptPeriod, setReceiptPeriod] = React.useState<Period>("all");
  const [receiptFrom, setReceiptFrom] = React.useState("");
  const [receiptTo, setReceiptTo] = React.useState("");
  const [receiptQuery, setReceiptQuery] = React.useState("");

  const resetReceiptFilters = React.useCallback(() => {
    setReceiptPeriod("all");
    setReceiptFrom("");
    setReceiptTo("");
    setReceiptQuery("");
  }, []);

  const agentRows = React.useMemo(() => {
    const map = new Map<string, AgentRow>();

    MOCK_SUPPLIER_REPORTS.forEach((report) => {
      if (!isInside(report.date, period, from, to)) return;
      const current = map.get(report.agentId) ?? {
        id: report.agentId,
        name: report.agentName,
        phone: report.agentPhone,
        botEnabled: false,
        total: 0,
        paid: 0,
        remaining: 0,
        receipts: [],
      };
      current.total += report.totalAmount;
      current.paid += report.paidAmount;
      current.remaining += report.remainingDebt;
      current.botEnabled = current.botEnabled || Boolean(report.botEnabled);
      current.receipts.push(report);
      map.set(report.agentId, current);
    });

    return Array.from(map.values())
      .filter((row) => {
        if (query && !matchesMany([row.id, row.name, row.phone], query)) return false;
        return true;
      })
      .sort((a, b) => b.total - a.total);
  }, [from, query, period, refreshKey, to]);

  const agentSummary = {
    customers: agentRows.length,
    total: agentRows.reduce((sum, row) => sum + row.total, 0),
    remaining: agentRows.reduce((sum, row) => sum + row.remaining, 0),
  };

  const triggerRefresh = React.useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const confirmDeleteAgent = () => {
    if (!deletingAgent) return;
    for (let i = MOCK_SUPPLIER_REPORTS.length - 1; i >= 0; i -= 1) {
      if (MOCK_SUPPLIER_REPORTS[i].agentId === deletingAgent.id) MOCK_SUPPLIER_REPORTS.splice(i, 1);
    }
    toast.success(`Agent o'chirildi: ${deletingAgent.name}`);
    setDeletingAgent(null);
    triggerRefresh();
  };

  const openAgentReceipts = React.useCallback(
    (row: AgentRow) => {
      resetReceiptFilters();
      setDetail({
        type: "agent-receipts",
        title: `${row.name} agent cheklari`,
        rows: row.receipts,
        agent: { id: row.id, name: row.name, phone: row.phone, botEnabled: row.botEnabled },
      });
    },
    [resetReceiptFilters],
  );

  const filteredAgentReceipts = React.useMemo(() => {
    if (detail?.type !== "agent-receipts") return [];
    return detail.rows.filter((report) => {
      if (!isInside(report.date, receiptPeriod, receiptFrom, receiptTo)) return false;
      if (!receiptQuery.trim()) return true;
      const matchesId = matches(report.id, receiptQuery);
      const matchesTotal = amountMatches(report.totalAmount, receiptQuery);
      const matchesItem = report.items.some(
        (item) =>
          matches(item.productName, receiptQuery) || amountMatches(item.amount, receiptQuery),
      );
      return matchesId || matchesTotal || matchesItem;
    });
  }, [detail, receiptPeriod, receiptFrom, receiptTo, receiptQuery]);

  const receiptFilterBar = (
    <div className="space-y-2 rounded-lg border bg-card/70 p-3">
      <PeriodFilter
        value={receiptPeriod}
        onValueChange={setReceiptPeriod}
        from={receiptFrom}
        to={receiptTo}
        onFromChange={setReceiptFrom}
        onToChange={setReceiptTo}
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={receiptQuery}
          onChange={(e) => setReceiptQuery(e.target.value)}
          placeholder="Chek raqami, chek summasi yoki mahsulot nomi bo'yicha qidirish"
          className="h-8 pl-9 text-xs"
        />
      </div>
    </div>
  );

  const filterBar = (
    <div className="rounded-lg border bg-card/70 p-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_auto]">
        <Field label="Qidiruv" className="min-w-0">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ID, ism-familiya yoki telefon raqami bo'yicha qidirish"
              className="pl-9"
            />
          </div>
        </Field>
        <PeriodFilter
          value={period}
          onValueChange={setPeriod}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-card p-3">
          <Truck className="h-5 w-5 text-primary" />
          <div className="text-base font-semibold">Agentlar</div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="grid flex-1 gap-3 md:grid-cols-3">
                <Kpi
                  title="Agentlar soni"
                  value={`${agentSummary.customers} ta`}
                  onClick={() =>
                    setDetail({
                      type: "agent-groups",
                      title: "Agentlar ro'yxati",
                      rows: agentRows,
                      metric: "count",
                    })
                  }
                />
                <Kpi
                  title="Umumiy aylanma"
                  value={formatSom(agentSummary.total)}
                  accent
                  onClick={() =>
                    setDetail({
                      type: "agent-groups",
                      title: "Agentlar bo'yicha umumiy aylanma",
                      rows: agentRows,
                      metric: "total",
                    })
                  }
                />
                <Kpi
                  title="Qolgan qarzimiz"
                  value={formatSom(agentSummary.remaining)}
                  onClick={() =>
                    setDetail({
                      type: "agent-groups",
                      title: "Agentlar bo'yicha qolgan qarz",
                      rows: agentRows.filter((row) => row.remaining > 0),
                      metric: "remaining",
                    })
                  }
                />
              </div>
              <Button className="gap-2" onClick={() => setAddAgentOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Yangi agent
              </Button>
            </div>

            {filterBar}

            <Card className="flex min-h-0 flex-1 flex-col">
              <CardHeader className="border-b py-3">
                <CardTitle className="text-base">Agentlar ro'yxati</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto p-0">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Agent nomi</th>
                      <th className="px-4 py-3 text-left">Telefon raqami</th>
                      <th className="px-4 py-3 text-right">Joriy qarzimiz</th>
                      <th className="px-4 py-3 text-right">To'lagan summasi</th>
                      <th className="px-4 py-3 text-right">Umumiy summa</th>
                      <th className="w-40 px-4 py-3 text-center">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentRows.map((row) => (
                      <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openAgentReceipts(row)}
                            className="font-semibold hover:underline"
                          >
                            {row.name}
                          </button>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <Badge variant="outline">{row.id}</Badge>
                            {row.botEnabled && (
                              <Badge variant="secondary" className="gap-1">
                                <Bot className="h-3 w-3" />
                                Bot
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{row.phone || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openAgentReceipts(row)}
                            className="font-semibold text-primary hover:underline"
                          >
                            {formatSom(row.remaining)}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openAgentReceipts(row)}
                            className="font-semibold text-primary hover:underline"
                          >
                            {formatSom(row.paid)}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openAgentReceipts(row)}
                            className="font-semibold text-primary hover:underline"
                          >
                            {formatSom(row.total)}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                              aria-label="Pul operatsiyasi"
                              title="Pul operatsiyasi"
                              onClick={() => setMoneyOpAgent(row)}
                            >
                              <ArrowLeftRight className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              aria-label="Tovarlar tarixini ko'rish"
                              onClick={() => openAgentReceipts(row)}
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              aria-label="Tahrirlash"
                              onClick={() => setEditingAgent(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              aria-label="O'chirish"
                              onClick={() => setDeletingAgent(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {agentRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Ma'lumot topilmadi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[84dvh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              {detail?.title}
            </DialogTitle>
          </DialogHeader>

          {detail?.type === "agent-groups" && (
            <div className="space-y-3">
              {detail.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openAgentReceipts(row)}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {row.id} {row.phone ? `· ${row.phone}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {detail.metric === "count"
                        ? "Cheklar soni"
                        : detail.metric === "remaining"
                          ? "Qoldiq"
                          : "Aylanma"}
                    </div>
                    <div className="font-bold text-primary">
                      {detail.metric === "count"
                        ? `${row.receipts.length} ta`
                        : formatSom(detail.metric === "remaining" ? row.remaining : row.total)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {detail?.type === "agent-receipts" && (
            <div className="space-y-3">
              <MoneyOperationsList
                party="agent"
                partyId={detail.agent.id}
                refreshKey={refreshKey}
              />
              {receiptFilterBar}
              {filteredAgentReceipts.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedReport(report)}
                  className="w-full rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{report.id}</div>
                      <div className="text-sm text-muted-foreground">{fmtDate(report.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{reportKindLabel(report)}</div>
                      <div className="font-bold text-primary">{formatSom(report.totalAmount)}</div>
                      <div className="text-sm text-muted-foreground">
                        Qoldiq: {formatSom(report.remainingDebt)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredAgentReceipts.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">Chek topilmadi</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-h-[84dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              {selectedReport?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    exportAgentHistoryToExcel(
                      [selectedReport],
                      selectedReport.agentId,
                      selectedReport.agentName,
                    )
                  }
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    printAgentNakladnoy(
                      [selectedReport],
                      selectedReport.agentId,
                      selectedReport.agentName,
                      selectedReport.agentPhone,
                      settings.receiptSettings.storeName,
                      settings.receiptSettings.phone,
                    )
                  }
                >
                  <FileText className="h-4 w-4" />
                  Nakladnoy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    printAgentReceipt80mm(
                      selectedReport,
                      settings.receiptSettings.storeName,
                      settings.receiptSettings.phone,
                    )
                  }
                >
                  <Printer className="h-4 w-4" />
                  80sm chek
                </Button>
              </div>
              <InfoRow label="Sana" value={fmtDate(selectedReport.date)} />
              <InfoRow label="Agent" value={selectedReport.agentName} />
              <InfoRow label="Agent ID" value={selectedReport.agentId} />
              <InfoRow label="Turi" value={reportKindLabel(selectedReport)} />
              <InfoRow label="Umumiy summa" value={formatSom(selectedReport.totalAmount)} />
              <InfoRow label="Berilgan" value={formatSom(selectedReport.paidAmount)} />
              <InfoRow label="Qoldiq" value={formatSom(selectedReport.remainingDebt)} />
              {(selectedReport.vehicleName || selectedReport.vehiclePlate) && (
                <InfoRow
                  label="Mashina"
                  value={`${selectedReport.vehicleName || ""}${selectedReport.vehiclePlate ? ` (${selectedReport.vehiclePlate})` : ""}`}
                />
              )}
              {(selectedReport.driverName || selectedReport.driverPhone) && (
                <InfoRow
                  label="Haydovchi"
                  value={`${selectedReport.driverName || ""}${selectedReport.driverPhone ? ` (${selectedReport.driverPhone})` : ""}`}
                />
              )}
              <div className="space-y-2">
                {selectedReport.items.map((item, index) => (
                  <div
                    key={`${selectedReport.id}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2"
                  >
                    <span>{item.productName}</span>
                    <span className="text-muted-foreground">
                      {item.qty} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
              {selectedReport.note && (
                <div className="rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {selectedReport.note}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MoneyOperationDialog
        party="agent"
        target={
          moneyOpAgent
            ? {
                id: moneyOpAgent.id,
                name: moneyOpAgent.name,
                phone: moneyOpAgent.phone,
                botEnabled: moneyOpAgent.botEnabled,
              }
            : null
        }
        currentBalance={moneyOpBalance}
        onClose={() => setMoneyOpAgent(null)}
        onDone={triggerRefresh}
      />

      <AddAgentDialog open={addAgentOpen} onOpenChange={setAddAgentOpen} onSaved={triggerRefresh} />

      <EditAgentDialog
        agent={editingAgent}
        onClose={() => setEditingAgent(null)}
        onSaved={triggerRefresh}
      />

      <AlertDialog open={!!deletingAgent} onOpenChange={(o) => !o && setDeletingAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Agentni o'chirish?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingAgent?.name} — {deletingAgent?.id}
              {deletingAgent && deletingAgent.remaining > 0 && (
                <> · qolgan qarzimiz: {formatSom(deletingAgent.remaining)}</>
              )}{" "}
              Bu agentga tegishli barcha prixod tarixi ham o'chiriladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAgent}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Kpi({
  title,
  value,
  accent,
  onClick,
}: {
  title: string;
  value: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  const className = accent
    ? "rounded-lg border border-primary/30 bg-primary/5 p-4 text-left"
    : "rounded-lg border bg-card p-4 text-left";

  if (!onClick) {
    return (
      <div className={className}>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        <div
          className={accent ? "mt-2 text-2xl font-bold text-primary" : "mt-2 text-2xl font-bold"}
        >
          {value}
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${className} transition hover:bg-muted/30`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className={accent ? "mt-2 text-2xl font-bold text-primary" : "mt-2 text-2xl font-bold"}>
        {value}
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/20 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function EditAgentDialog({
  agent,
  onClose,
  onSaved,
}: {
  agent: AgentRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [botEnabled, setBotEnabled] = React.useState(false);

  React.useEffect(() => {
    setName(agent?.name ?? "");
    setPhone(agent?.phone ?? "");
    setBotEnabled(agent?.botEnabled ?? false);
  }, [agent]);

  if (!agent) return null;

  const canSave = name.trim();

  const save = () => {
    if (!canSave) return;
    MOCK_SUPPLIER_REPORTS.forEach((report) => {
      if (report.agentId !== agent.id) return;
      report.agentName = name.trim();
      report.agentPhone = phone.trim();
      report.botEnabled = botEnabled;
    });
    toast.success(`Agent ma'lumotlari yangilandi: ${name.trim()}`);
    onClose();
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Agent ma'lumotlarini tahrirlash
          </DialogTitle>
        </DialogHeader>

        <div>
          <Label className="mb-1 block text-xs">Agent ID</Label>
          <Input value={agent.id} readOnly className="font-mono font-semibold" />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Ism *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Telefon</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998" />
        </div>

        <div className="rounded-md border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Botga habar yuborish</div>
              <div className="text-xs text-muted-foreground">
                Yoqilganda agent prixodlari bot orqali avtomatik yuboriladi
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={botEnabled ? "default" : "outline"}
              onClick={() => setBotEnabled((value) => !value)}
              className="gap-2"
            >
              <Bot className="h-4 w-4" />
              {botEnabled ? "Yoqilgan" : "Yoqish"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor
          </Button>
          <Button onClick={save} disabled={!canSave}>
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddAgentDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [note, setNote] = React.useState("");
  const [sendBotUpdate, setSendBotUpdate] = React.useState(true);
  const [openingDebt, setOpeningDebt] = React.useState("");
  const agentId = React.useMemo(() => nextAgentId(), [open]);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setPhone("");
      setNote("");
      setSendBotUpdate(true);
      setOpeningDebt("");
    }
  }, [open]);

  const save = () => {
    if (!name.trim()) {
      toast.error("Agent ismini kiriting");
      return;
    }
    if (sendBotUpdate && !phone.trim()) {
      toast.error("Botga yuborish uchun agent telefonini kiriting");
      return;
    }
    const openingDebtValue = Number.parseFloat(openingDebt.replace(/\s/g, "")) || 0;
    const report: SupplierReport = {
      id: `sr-${Date.now()}`,
      date: new Date().toISOString(),
      addedBy: "Joriy foydalanuvchi",
      agentId,
      agentName: name.trim(),
      agentPhone: phone.trim(),
      botEnabled: sendBotUpdate,
      items: [],
      totalAmount: openingDebtValue,
      paidAmount: 0,
      remainingDebt: openingDebtValue,
      note:
        openingDebtValue > 0
          ? ["Boshlang'ich qarz (dastur ishlatishdan oldin)", note.trim()]
              .filter(Boolean)
              .join(" — ")
          : note.trim() || undefined,
    };
    MOCK_SUPPLIER_REPORTS.unshift(report);
    if (sendBotUpdate) {
      dispatchReceiptMessage({
        recipientCategory: "agent",
        recipientId: agentId,
        recipientName: report.agentName,
        phone: report.agentPhone,
        receiptId: agentId,
        title: "Agent ro'yxatdan o'tdi",
        total: 0,
        note: `Agent kodi: ${agentId}`,
      });
    }
    toast.success(`Yangi agent qo'shildi: ${agentId}`);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Yangi agent qo'shish
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs">Agent ID</Label>
            <Input value={agentId} readOnly className="font-mono font-semibold" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Ism *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ism familiya"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">
              Bizning unga qarzimiz (dastur ishlatishdan oldin)
            </Label>
            <Input
              value={openingDebt}
              onChange={(e) => setOpeningDebt(formatNumberInput(e.target.value))}
              inputMode="decimal"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Agar bu agentdan dasturdan foydalanishdan avval ham tovar olib, qarzimiz bo'lsa, shu
              yerga qoldiq summani kiriting
            </p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Botga habar yuborish</div>
                <div className="text-xs text-muted-foreground">
                  Yoqilganda agent prixod va to'lov cheklari agent kodi orqali avtomatik yuboriladi
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant={sendBotUpdate ? "default" : "outline"}
                onClick={() => setSendBotUpdate((value) => !value)}
                className="gap-2"
              >
                <Bot className="h-4 w-4" />
                {sendBotUpdate ? "Yoqilgan" : "Yoqish"}
              </Button>
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Izoh</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Qo'shimcha ma'lumot"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor
          </Button>
          <Button onClick={save}>Saqlash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
