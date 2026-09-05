import * as React from "react";
import * as XLSX from "xlsx";
import {
  ArrowLeftRight,
  Bot,
  CreditCard,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Pencil,
  Percent,
  Phone,
  Printer,
  ReceiptText,
  Search,
  Star,
  Users,
  UserPlus,
  Plus,
  Trash2,
  Wallet,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";
import { MoneyOperationDialog } from "@/components/shared/MoneyOperationDialog";
import { MoneyOperationsList } from "@/components/shared/MoneyOperationsList";
import { addCreditCustomer, dispatchReceiptMessage, fullCustomerName } from "@/lib/data-actions";
import { cn, formatNumberInput } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import {
  MOCK_CREDIT_CUSTOMERS,
  MOCK_LOYAL_CUSTOMERS,
  MOCK_PRODUCTS,
  MOCK_RECEIPT_DISPATCHES,
  MOCK_RECEIPTS,
  MOCK_REGULAR_CUSTOMERS,
  formatSom,
  nextLoyalCardNumber,
  type CreditCustomer,
  type Currency,
  type CustomerDebtReceipt,
  type LoyalCustomer,
  type LoyalDiscountScope,
  type Product,
  type Receipt,
} from "@/lib/mock-data";
import { toast } from "sonner";

type Tab = "oddiy" | "nasiya" | "sodiq";
type Period = PeriodFilterValue;

type RegularRow = {
  id: string;
  name: string;
  phone: string;
  botEnabled?: boolean;
  receiptCount: number;
  total: number;
  receipts: Receipt[];
  sentCount: number;
};

type CreditRow = {
  id: string;
  name: string;
  phone: string;
  botEnabled: boolean;
  debt: number;
  paid: number;
  totalDebtEver: number;
  dueDate?: string;
  lastDebtDate?: string;
  total: number;
  receipts: CustomerDebtReceipt[];
};

type LoyalRow = {
  id: string;
  cardNumber: string;
  name: string;
  phone: string;
  discountPercent: number;
  discountScope: LoyalDiscountScope;
  discountProductIds: string[];
  cashbackPercent: number;
  cashbackBalance: number;
  totalSpent: number;
  joinedAt: string;
  note?: string;
};

function discountScopeLabel(scope: LoyalDiscountScope, productCount: number) {
  if (scope === "selected") return `${productCount} ta tovarga`;
  if (scope === "excluded") return `${productCount} tadan tashqari`;
  return "Barchasiga";
}

const DUE_SOON_DAYS = 3;

type DebtStatus = "paid" | "overdue" | "due_soon" | "normal";

function debtStatus(debt: number, dueDate: string | undefined): DebtStatus {
  if (debt <= 0) return "paid";
  if (!dueDate) return "normal";
  const due = new Date(`${dueDate}T23:59:59`);
  const now = new Date();
  if (due < now) return "overdue";
  const daysLeft = (due.getTime() - now.getTime()) / 86_400_000;
  if (daysLeft <= DUE_SOON_DAYS) return "due_soon";
  return "normal";
}

const DEBT_STATUS_LABEL: Record<DebtStatus, string> = {
  paid: "To'langan",
  overdue: "Muddati o'tgan",
  due_soon: "Muddat yaqin",
  normal: "",
};

const DEBT_STATUS_TEXT_CLASS: Record<DebtStatus, string> = {
  paid: "text-success",
  overdue: "text-destructive",
  due_soon: "text-amber-600",
  normal: "text-primary",
};

const DEBT_STATUS_BADGE_CLASS: Record<DebtStatus, string> = {
  paid: "border-success/40 bg-success/10 text-success",
  overdue: "border-destructive/40 bg-destructive/10 text-destructive",
  due_soon: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  normal: "",
};

type DetailState =
  | { type: "oddiy-customers"; title: string; rows: RegularRow[] }
  | { type: "oddiy-receipts"; title: string; rows: Receipt[] }
  | { type: "nasiya-debts"; title: string; rows: CreditRow[] }
  | {
      type: "nasiya-receipts";
      title: string;
      rows: CustomerDebtReceipt[];
      customer: { id: string; name: string; phone: string };
    }
  | null;

type SelectedReceiptState =
  | { type: "oddiy"; receipt: Receipt }
  | {
      type: "nasiya";
      receipt: CustomerDebtReceipt;
      customer: { id: string; name: string; phone: string };
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

function exportCreditReceiptToExcel(
  receipts: CustomerDebtReceipt[],
  customerId: string,
  customerName: string,
) {
  const data = receipts.flatMap((receipt) =>
    receipt.items.length > 0
      ? receipt.items.map((item) => ({
          Chek: receipt.id,
          Sana: fmtDate(receipt.date),
          Turi: receipt.title,
          "Tovar nomi": item.name,
          Miqdor: item.qty,
          Birligi: item.unit,
          Summasi: item.amount,
          Izoh: receipt.note || "",
        }))
      : [
          {
            Chek: receipt.id,
            Sana: fmtDate(receipt.date),
            Turi: receipt.title,
            "Tovar nomi": "",
            Miqdor: 0,
            Birligi: "",
            Summasi: receipt.amount,
            Izoh: receipt.note || "",
          },
        ],
  );

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 26 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Nasiya tarixi");
  XLSX.writeFile(workbook, `nasiyachi-${customerId}-tarix.xlsx`);
}

function printCreditNakladnoy(
  receipts: CustomerDebtReceipt[],
  customerId: string,
  customerName: string,
  customerPhone: string,
  storeName: string,
  storePhone: string,
) {
  const win = window.open("", "_blank");
  if (!win) return;

  const items = receipts.flatMap((receipt) =>
    receipt.items.length > 0
      ? receipt.items.map((item) => ({ ...item, receiptId: receipt.id, date: receipt.date }))
      : [
          {
            name: receipt.title,
            qty: 1,
            unit: "",
            amount: receipt.amount,
            receiptId: receipt.id,
            date: receipt.date,
          },
        ],
  );
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  win.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Nakladnoy — ${customerName}</title>
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
            <h1>${storeName || "Nasiya tovarlar tarixi nakladnoyi"}</h1>
            ${storePhone ? `<div class="muted">Tel: ${storePhone}</div>` : ""}
          </div>
          <div class="muted">
            <div>Mijoz: <b>${customerName}</b> (${customerId})</div>
            ${customerPhone && customerPhone !== "—" ? `<div>Tel: ${customerPhone}</div>` : ""}
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
                <td>${item.receiptId}</td>
                <td>${fmtDate(item.date)}</td>
                <td>${item.name}</td>
                <td class="right">${item.unit ? `${item.qty} ${item.unit}` : item.qty}</td>
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

        <div class="signs">
          <div class="sign">Topshirdi (F.I.Sh, imzo)</div>
          <div class="sign">Qabul qildi: ${customerName}</div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

function printCreditReceipt80mm(
  receipt: CustomerDebtReceipt,
  customerName: string,
  customerPhone: string,
  storeName: string,
  storePhone: string,
) {
  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Chek ${receipt.id}</title>
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
        <h1>${storeName || "Nasiya cheki"}</h1>
        ${storePhone ? `<div class="muted">Tel: ${storePhone}</div>` : ""}
        <div class="line"></div>
        <div class="row"><span>Chek:</span><span><b>${receipt.id}</b></span></div>
        <div class="row"><span>Sana:</span><span>${fmtDate(receipt.date)}</span></div>
        <div class="row"><span>Turi:</span><span>${receipt.title}</span></div>
        <div class="row"><span>Mijoz:</span><span>${customerName}</span></div>
        ${customerPhone && customerPhone !== "—" ? `<div class="row"><span>Tel:</span><span>${customerPhone}</span></div>` : ""}
        <div class="line"></div>
        ${
          receipt.items.length > 0
            ? `<table>
                <thead>
                  <tr><th>Tovar</th><th class="right">Miqdor</th><th class="right">Summa</th></tr>
                </thead>
                <tbody>
                  ${receipt.items
                    .map(
                      (item) => `
                    <tr>
                      <td>${item.name}</td>
                      <td class="right">${item.qty} ${item.unit}</td>
                      <td class="right">${formatSom(item.amount)}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>`
            : ""
        }
        <div class="line"></div>
        <div class="row total"><span>Jami:</span><span>${formatSom(receipt.amount)}</span></div>
        ${receipt.paidAmount !== undefined ? `<div class="row"><span>Berilgan:</span><span>${formatSom(receipt.paidAmount)}</span></div>` : ""}
        ${receipt.debtAmount !== undefined ? `<div class="row"><span>Qoldiq:</span><span>${formatSom(receipt.debtAmount)}</span></div>` : ""}
        ${receipt.note ? `<div class="line"></div><div class="muted">${receipt.note}</div>` : ""}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

export function MijozlarPage() {
  const { settings } = useApp();
  const [tab, setTab] = React.useState<Tab>("nasiya");
  const [detail, setDetail] = React.useState<DetailState>(null);
  const [selectedReceipt, setSelectedReceipt] = React.useState<SelectedReceiptState>(null);
  const [period, setPeriod] = React.useState<Period>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [addCreditOpen, setAddCreditOpen] = React.useState(false);
  const [editingCredit, setEditingCredit] = React.useState<CreditCustomer | null>(null);
  const [deletingCredit, setDeletingCredit] = React.useState<CreditCustomer | null>(null);
  const [moneyOpCredit, setMoneyOpCredit] = React.useState<CreditRow | null>(null);

  const [addLoyalOpen, setAddLoyalOpen] = React.useState(false);
  const [editingLoyal, setEditingLoyal] = React.useState<LoyalCustomer | null>(null);
  const [deletingLoyal, setDeletingLoyal] = React.useState<LoyalCustomer | null>(null);
  const [cashbackTarget, setCashbackTarget] = React.useState<LoyalRow | null>(null);

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

  const regularRows = React.useMemo(() => {
    return MOCK_REGULAR_CUSTOMERS.map((customer) => {
      const receipts = MOCK_RECEIPTS.filter(
        (receipt) =>
          receipt.customerType === "oddiy" &&
          (receipt.customerId === customer.id || receipt.customerPhone === customer.phone) &&
          isInside(receipt.date, period, from, to),
      );
      const total = receipts.reduce((sum, receipt) => sum + receipt.total, 0);
      return {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        phone: customer.phone,
        botEnabled: false,
        receiptCount: receipts.length,
        total,
        receipts,
        sentCount: MOCK_RECEIPT_DISPATCHES.filter(
          (item) =>
            item.recipientCategory === "oddiy" &&
            item.recipientId === customer.id &&
            isInside(item.date, period, from, to),
        ).length,
      };
    })
      .filter((row) => {
        if (query && !matchesMany([row.id, row.name, row.phone], query)) return false;
        return row.receiptCount > 0;
      })
      .sort((a, b) => b.total - a.total);
  }, [from, query, period, refreshKey, to]);

  const creditRows = React.useMemo(() => {
    return MOCK_CREDIT_CUSTOMERS.map((customer) => {
      const receipts = (customer.receipts ?? []).filter((receipt) =>
        isInside(receipt.date, period, from, to),
      );
      const salesTotal = receipts
        .filter((receipt) => receipt.type === "sale")
        .reduce((sum, receipt) => sum + Math.max(receipt.amount, 0), 0);
      const lastDebtDate = (customer.receipts ?? [])
        .filter((receipt) => receipt.type === "sale")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;
      const paid = (customer.receipts ?? [])
        .filter((receipt) => receipt.type === "payment")
        .reduce((sum, receipt) => sum + Math.max(receipt.amount, 0), 0);
      return {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        phone: customer.phone ?? "—",
        botEnabled: Boolean(customer.botEnabled),
        debt: customer.currentDebt,
        paid,
        totalDebtEver: customer.currentDebt + paid,
        dueDate: customer.dueDate,
        lastDebtDate,
        total: salesTotal,
        receipts,
      };
    })
      .filter((row) => {
        if (query && !matchesMany([row.id, row.name, row.phone], query)) return false;
        return row.debt > 0 || row.receipts.length > 0;
      })
      .sort((a, b) => b.debt - a.debt);
  }, [from, query, period, refreshKey, to]);

  const moneyOpCreditBalance = React.useMemo(
    () =>
      moneyOpCredit
        ? (MOCK_CREDIT_CUSTOMERS.find((c) => c.id === moneyOpCredit.id)?.currentDebt ??
          moneyOpCredit.debt)
        : 0,
    [moneyOpCredit, refreshKey],
  );

  const regularSummary = {
    customers: regularRows.length,
    total: regularRows.reduce((sum, row) => sum + row.total, 0),
    receipts: regularRows.reduce((sum, row) => sum + row.receiptCount, 0),
  };

  const creditSummary = {
    customers: creditRows.length,
    totalDebt: creditRows.reduce((sum, row) => sum + row.debt, 0),
    totalSales: creditRows.reduce((sum, row) => sum + row.total, 0),
  };

  const loyalRows: LoyalRow[] = React.useMemo(() => {
    return MOCK_LOYAL_CUSTOMERS.map((customer) => ({
      id: customer.id,
      cardNumber: customer.cardNumber,
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      phone: customer.phone,
      discountPercent: customer.discountPercent,
      discountScope: customer.discountScope,
      discountProductIds: customer.discountProductIds ?? [],
      cashbackPercent: customer.cashbackPercent,
      cashbackBalance: customer.cashbackBalance,
      totalSpent: customer.totalSpent,
      joinedAt: customer.joinedAt,
      note: customer.note,
    }))
      .filter((row) => !query || matchesMany([row.id, row.cardNumber, row.name, row.phone], query))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [query, refreshKey]);

  const loyalSummary = {
    customers: loyalRows.length,
    totalCashbackBalance: loyalRows.reduce((sum, row) => sum + row.cashbackBalance, 0),
    totalSpent: loyalRows.reduce((sum, row) => sum + row.totalSpent, 0),
  };

  const triggerRefresh = React.useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const confirmDeleteCredit = () => {
    if (!deletingCredit) return;
    const idx = MOCK_CREDIT_CUSTOMERS.findIndex((c) => c.id === deletingCredit.id);
    if (idx >= 0) MOCK_CREDIT_CUSTOMERS.splice(idx, 1);
    toast.success(`Nasiyachi o'chirildi: ${fullCustomerName(deletingCredit)}`);
    setDeletingCredit(null);
    triggerRefresh();
  };

  const confirmDeleteLoyal = () => {
    if (!deletingLoyal) return;
    const idx = MOCK_LOYAL_CUSTOMERS.findIndex((c) => c.id === deletingLoyal.id);
    if (idx >= 0) MOCK_LOYAL_CUSTOMERS.splice(idx, 1);
    toast.success(`Sodiq mijoz o'chirildi: ${fullCustomerName(deletingLoyal)}`);
    setDeletingLoyal(null);
    triggerRefresh();
  };

  const openRegularReceipts = React.useCallback((row: RegularRow) => {
    setDetail({
      type: "oddiy-receipts",
      title: `${row.name} savdo cheklari`,
      rows: row.receipts,
    });
  }, []);

  const openCreditReceipts = React.useCallback(
    (row: CreditRow) => {
      resetReceiptFilters();
      setDetail({
        type: "nasiya-receipts",
        title: `${row.name} nasiya cheklari`,
        rows: row.receipts,
        customer: { id: row.id, name: row.name, phone: row.phone },
      });
    },
    [resetReceiptFilters],
  );

  const filteredNasiyaReceipts = React.useMemo(() => {
    if (detail?.type !== "nasiya-receipts") return [];
    return detail.rows.filter((receipt) => {
      if (!isInside(receipt.date, receiptPeriod, receiptFrom, receiptTo)) return false;
      if (!receiptQuery.trim()) return true;
      const matchesId = matches(receipt.id, receiptQuery);
      const matchesTotal = amountMatches(receipt.amount, receiptQuery);
      const matchesItem = receipt.items.some(
        (item) => matches(item.name, receiptQuery) || amountMatches(item.amount, receiptQuery),
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
          <HandCoins className="h-5 w-5 text-primary" />
          <div className="text-base font-semibold">Mijozlar</div>
          <div className="ml-3 flex items-center gap-1 rounded-md border bg-muted/30 p-1">
            <TabButton
              active={tab === "nasiya"}
              onClick={() => setTab("nasiya")}
              icon={<HandCoins className="h-3.5 w-3.5" />}
              label="Nasiyachilar"
            />
            <TabButton
              active={tab === "oddiy"}
              onClick={() => setTab("oddiy")}
              icon={<Users className="h-3.5 w-3.5" />}
              label="Oddiy xaridorlar"
            />
            <TabButton
              active={tab === "sodiq"}
              onClick={() => setTab("sodiq")}
              icon={<Star className="h-3.5 w-3.5" />}
              label="Sodiq mijozlar"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4">
          {tab === "oddiy" && (
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Kpi
                  title="Xizmat ko'rsatilgan xaridor"
                  value={`${regularSummary.customers} ta`}
                  onClick={() =>
                    setDetail({
                      type: "oddiy-customers",
                      title: "Xizmat ko'rsatilgan oddiy xaridorlar",
                      rows: regularRows,
                    })
                  }
                />
                <Kpi
                  title="Umumiy savdo summasi"
                  value={formatSom(regularSummary.total)}
                  accent
                  onClick={() =>
                    setDetail({
                      type: "oddiy-receipts",
                      title: "Oddiy xaridorlar cheklari",
                      rows: regularRows.flatMap((row) => row.receipts),
                    })
                  }
                />
                <Kpi
                  title="Cheklar soni"
                  value={`${regularSummary.receipts} ta`}
                  onClick={() =>
                    setDetail({
                      type: "oddiy-receipts",
                      title: "Oddiy xaridorlar cheklari",
                      rows: regularRows.flatMap((row) => row.receipts),
                    })
                  }
                />
              </div>

              {filterBar}

              <Card className="flex min-h-0 flex-1 flex-col">
                <CardHeader className="border-b py-3">
                  <CardTitle className="text-base">Oddiy xaridorlar ro'yxati</CardTitle>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 overflow-auto p-0">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Mijoz</th>
                        <th className="px-4 py-3 text-left">Telefon</th>
                        <th className="px-4 py-3 text-center">Cheklar</th>
                        <th className="px-4 py-3 text-center">Botga yuborilgan</th>
                        <th className="px-4 py-3 text-right">Savdo summasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regularRows.map((row) => (
                        <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="font-semibold">{row.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline">{row.id}</Badge>
                              {row.botEnabled && (
                                <Badge variant="secondary" className="gap-1">
                                  <Bot className="h-3 w-3" />
                                  Bot
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {row.phone}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => openRegularReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {row.receiptCount}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">{row.sentCount}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openRegularReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {formatSom(row.total)}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {regularRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            Ma'lumot topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "nasiya" && (
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="grid flex-1 gap-3 md:grid-cols-3">
                  <Kpi title="Nasiyachi soni" value={`${creditSummary.customers} ta`} />
                  <Kpi title="Nasiya savdo summasi" value={formatSom(creditSummary.totalSales)} />
                  <Kpi
                    title="Joriy qarzdorlik"
                    value={formatSom(creditSummary.totalDebt)}
                    accent
                    onClick={() =>
                      setDetail({
                        type: "nasiya-debts",
                        title: "Nasiyachilar bo'yicha joriy qarz",
                        rows: creditRows.filter((row) => row.debt > 0),
                      })
                    }
                  />
                </div>
                <Button className="gap-2" onClick={() => setAddCreditOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Yangi nasiyachi
                </Button>
              </div>

              {filterBar}

              <Card className="flex min-h-0 flex-1 flex-col">
                <CardHeader className="border-b py-3">
                  <CardTitle className="text-base">Nasiyachilar</CardTitle>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 overflow-auto p-0">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Mijoz nomi</th>
                        <th className="px-4 py-3 text-left">Telefon raqami</th>
                        <th className="px-4 py-3 text-right">Joriy qarz</th>
                        <th className="px-4 py-3 text-right">To'lagan</th>
                        <th className="px-4 py-3 text-right">Umumiy qarz</th>
                        <th className="px-4 py-3 text-left">Qaytarish sanasi</th>
                        <th className="px-4 py-3 text-left">Olgan sanasi</th>
                        <th className="w-40 px-4 py-3 text-center">Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditRows.map((row) => {
                        const status = debtStatus(row.debt, row.dueDate);
                        return (
                          <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{row.name}</span>
                                {status !== "normal" && (
                                  <Badge
                                    variant="outline"
                                    className={cn("text-[10px]", DEBT_STATUS_BADGE_CLASS[status])}
                                  >
                                    {DEBT_STATUS_LABEL[status]}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">{row.phone}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openCreditReceipts(row)}
                                className={cn(
                                  "font-semibold hover:underline",
                                  DEBT_STATUS_TEXT_CLASS[status],
                                )}
                              >
                                {formatSom(row.debt)}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openCreditReceipts(row)}
                                className="font-semibold text-primary hover:underline"
                              >
                                {formatSom(row.paid)}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openCreditReceipts(row)}
                                className="font-semibold hover:underline"
                              >
                                {formatSom(row.totalDebtEver)}
                              </button>
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3",
                                status !== "normal" && status !== "paid" && "font-semibold",
                                DEBT_STATUS_TEXT_CLASS[status],
                              )}
                            >
                              {row.dueDate
                                ? new Date(row.dueDate).toLocaleDateString("uz-UZ", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                  })
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {row.lastDebtDate
                                ? new Date(row.lastDebtDate).toLocaleDateString("uz-UZ", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                  })
                                : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                                  aria-label="Pul operatsiyasi"
                                  title="Pul operatsiyasi"
                                  onClick={() => setMoneyOpCredit(row)}
                                >
                                  <ArrowLeftRight className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  aria-label="Nasiya cheklarini ko'rish"
                                  onClick={() => openCreditReceipts(row)}
                                >
                                  <Search className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  aria-label="Tahrirlash"
                                  onClick={() => {
                                    const customer = MOCK_CREDIT_CUSTOMERS.find(
                                      (c) => c.id === row.id,
                                    );
                                    if (customer) setEditingCredit(customer);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  aria-label="O'chirish"
                                  onClick={() => {
                                    const customer = MOCK_CREDIT_CUSTOMERS.find(
                                      (c) => c.id === row.id,
                                    );
                                    if (customer) setDeletingCredit(customer);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {creditRows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            Ma'lumot topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "sodiq" && (
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="grid flex-1 gap-3 md:grid-cols-3">
                  <Kpi title="Sodiq mijozlar soni" value={`${loyalSummary.customers} ta`} />
                  <Kpi
                    title="Umumiy cashback balansi"
                    value={formatSom(loyalSummary.totalCashbackBalance)}
                    accent
                  />
                  <Kpi title="Umumiy xarid summasi" value={formatSom(loyalSummary.totalSpent)} />
                </div>
                <Button className="gap-2" onClick={() => setAddLoyalOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Yangi sodiq mijoz
                </Button>
              </div>

              {filterBar}

              <Card className="flex min-h-0 flex-1 flex-col">
                <CardHeader className="border-b py-3">
                  <CardTitle className="text-base">Sodiq mijozlar ro'yxati</CardTitle>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 overflow-auto p-0">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Mijoz</th>
                        <th className="px-4 py-3 text-left">Karta raqami</th>
                        <th className="px-4 py-3 text-left">Telefon</th>
                        <th className="px-4 py-3 text-center">Skidka</th>
                        <th className="px-4 py-3 text-center">Cashback %</th>
                        <th className="px-4 py-3 text-right">Cashback balansi</th>
                        <th className="px-4 py-3 text-right">Jami xarid</th>
                        <th className="w-32 px-4 py-3 text-center">Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loyalRows.map((row) => (
                        <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="font-semibold">{row.name}</div>
                            {row.note && (
                              <div className="mt-1 text-xs text-muted-foreground">{row.note}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="gap-1 font-mono">
                              <CreditCard className="h-3 w-3" />
                              {row.cardNumber}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {row.phone}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="secondary" className="gap-1">
                                <Percent className="h-3 w-3" />
                                {row.discountPercent}%
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {discountScopeLabel(
                                  row.discountScope,
                                  row.discountProductIds.length,
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="gap-1">
                              <Star className="h-3 w-3" />
                              {row.cashbackPercent}%
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setCashbackTarget(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {formatSom(row.cashbackBalance)}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatSom(row.totalSpent)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                                aria-label="Cashback boshqarish"
                                title="Cashback boshqarish"
                                onClick={() => setCashbackTarget(row)}
                              >
                                <Wallet className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                aria-label="Tahrirlash"
                                onClick={() => {
                                  const customer = MOCK_LOYAL_CUSTOMERS.find(
                                    (c) => c.id === row.id,
                                  );
                                  if (customer) setEditingLoyal(customer);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                aria-label="O'chirish"
                                onClick={() => {
                                  const customer = MOCK_LOYAL_CUSTOMERS.find(
                                    (c) => c.id === row.id,
                                  );
                                  if (customer) setDeletingLoyal(customer);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {loyalRows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            Ma'lumot topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
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

          {detail?.type === "oddiy-customers" && (
            <div className="space-y-3">
              {detail.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openRegularReceipts(row)}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-sm text-muted-foreground">{row.phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Cheklar</div>
                    <div className="font-bold text-primary">{row.receiptCount} ta</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {detail?.type === "oddiy-receipts" && (
            <div className="space-y-3">
              {detail.rows.map((receipt) => (
                <button
                  key={receipt.id}
                  type="button"
                  onClick={() => setSelectedReceipt({ type: "oddiy", receipt })}
                  className="w-full rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{receipt.id}</div>
                      <div className="text-sm text-muted-foreground">{fmtDate(receipt.date)}</div>
                    </div>
                    <div className="font-bold text-primary">{formatSom(receipt.total)}</div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {receipt.customerName || "Oddiy xaridor"}
                  </div>
                </button>
              ))}
            </div>
          )}

          {detail?.type === "nasiya-debts" && (
            <div className="space-y-3">
              {detail.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openCreditReceipts(row)}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {row.id} {row.phone !== "—" ? `· ${row.phone}` : ""}
                    </div>
                  </div>
                  <div className="font-bold text-primary">{formatSom(row.debt)}</div>
                </button>
              ))}
            </div>
          )}

          {detail?.type === "nasiya-receipts" && (
            <div className="space-y-3">
              <MoneyOperationsList
                party="nasiyachi"
                partyId={detail.customer.id}
                refreshKey={refreshKey}
              />
              {receiptFilterBar}
              {filteredNasiyaReceipts.map((receipt) => (
                <button
                  key={receipt.id}
                  type="button"
                  onClick={() =>
                    setSelectedReceipt({ type: "nasiya", receipt, customer: detail.customer })
                  }
                  className="w-full rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{receipt.id}</div>
                      <div className="text-sm text-muted-foreground">{receipt.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{fmtDate(receipt.date)}</div>
                      <div className="font-bold text-primary">{formatSom(receipt.amount)}</div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredNasiyaReceipts.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">Chek topilmadi</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-h-[84dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              {selectedReceipt?.receipt.id}
            </DialogTitle>
          </DialogHeader>

          {selectedReceipt?.type === "oddiy" && (
            <div className="space-y-3 rounded-lg border p-4">
              <InfoRow label="Sana" value={fmtDate(selectedReceipt.receipt.date)} />
              <InfoRow
                label="Mijoz"
                value={selectedReceipt.receipt.customerName || "Oddiy xaridor"}
              />
              <div className="space-y-2">
                {selectedReceipt.receipt.items.map((item, index) => (
                  <div
                    key={`${selectedReceipt.receipt.id}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2"
                  >
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.qty} x {formatSom(item.price)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-right text-lg font-bold text-primary">
                {formatSom(selectedReceipt.receipt.total)}
              </div>
            </div>
          )}

          {selectedReceipt?.type === "nasiya" && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    exportCreditReceiptToExcel(
                      [selectedReceipt.receipt],
                      selectedReceipt.customer.id,
                      selectedReceipt.customer.name,
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
                    printCreditNakladnoy(
                      [selectedReceipt.receipt],
                      selectedReceipt.customer.id,
                      selectedReceipt.customer.name,
                      selectedReceipt.customer.phone,
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
                    printCreditReceipt80mm(
                      selectedReceipt.receipt,
                      selectedReceipt.customer.name,
                      selectedReceipt.customer.phone,
                      settings.receiptSettings.storeName,
                      settings.receiptSettings.phone,
                    )
                  }
                >
                  <Printer className="h-4 w-4" />
                  80sm chek
                </Button>
              </div>
              <InfoRow label="Sana" value={fmtDate(selectedReceipt.receipt.date)} />
              <InfoRow label="Turi" value={selectedReceipt.receipt.title} />
              <InfoRow label="Summa" value={formatSom(selectedReceipt.receipt.amount)} />
              {selectedReceipt.receipt.note && (
                <div className="rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {selectedReceipt.receipt.note}
                </div>
              )}
              {selectedReceipt.receipt.items.length > 0 && (
                <div className="space-y-2">
                  {selectedReceipt.receipt.items.map((item, index) => (
                    <div
                      key={`${selectedReceipt.receipt.id}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2"
                    >
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">{formatSom(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MoneyOperationDialog
        party="nasiyachi"
        target={
          moneyOpCredit
            ? {
                id: moneyOpCredit.id,
                name: moneyOpCredit.name,
                phone: moneyOpCredit.phone === "—" ? undefined : moneyOpCredit.phone,
                botEnabled: moneyOpCredit.botEnabled,
              }
            : null
        }
        currentBalance={moneyOpCreditBalance}
        onClose={() => setMoneyOpCredit(null)}
        onDone={triggerRefresh}
      />

      <AddCreditCustomerDialog
        open={addCreditOpen}
        onOpenChange={setAddCreditOpen}
        onSaved={() => {
          triggerRefresh();
          setTab("nasiya");
        }}
      />

      <EditCreditCustomerDialog
        customer={editingCredit}
        onClose={() => setEditingCredit(null)}
        onSaved={triggerRefresh}
      />

      <AlertDialog open={!!deletingCredit} onOpenChange={(o) => !o && setDeletingCredit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nasiyachini o'chirish?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCredit && fullCustomerName(deletingCredit)} — {deletingCredit?.id}
              {deletingCredit && deletingCredit.currentDebt > 0 && (
                <> · joriy qarzi: {formatSom(deletingCredit.currentDebt)}</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCredit}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddLoyalCustomerDialog
        open={addLoyalOpen}
        onOpenChange={setAddLoyalOpen}
        onSaved={() => {
          triggerRefresh();
          setTab("sodiq");
        }}
      />

      <EditLoyalCustomerDialog
        customer={editingLoyal}
        onClose={() => setEditingLoyal(null)}
        onSaved={triggerRefresh}
      />

      <CashbackDialog
        target={cashbackTarget}
        onClose={() => setCashbackTarget(null)}
        onSaved={triggerRefresh}
      />

      <AlertDialog open={!!deletingLoyal} onOpenChange={(o) => !o && setDeletingLoyal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sodiq mijozni o'chirish?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingLoyal && fullCustomerName(deletingLoyal)} — {deletingLoyal?.id}
              {deletingLoyal && deletingLoyal.cashbackBalance > 0 && (
                <> · cashback balansi: {formatSom(deletingLoyal.cashbackBalance)}</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLoyal}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {icon}
      {label}
    </button>
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

function EditCreditCustomerDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer: CreditCustomer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [withLimit, setWithLimit] = React.useState(false);
  const [limit, setLimit] = React.useState("");
  const [currency, setCurrency] = React.useState<Currency>("UZS");

  React.useEffect(() => {
    setFirst(customer?.firstName ?? "");
    setLast(customer?.lastName ?? "");
    setPhone(customer?.phone ?? "");
    setDueDate(customer?.dueDate ?? "");
    setWithLimit(Boolean(customer && customer.limit > 0));
    setLimit(customer && customer.limit > 0 ? String(customer.limit) : "");
    setCurrency(customer?.limitCurrency ?? "UZS");
  }, [customer]);

  if (!customer) return null;

  const canSave = first.trim() && last.trim() && phone.trim();

  const save = () => {
    if (!canSave) return;
    const target = MOCK_CREDIT_CUSTOMERS.find((c) => c.id === customer.id);
    if (target) {
      target.firstName = first.trim();
      target.lastName = last.trim();
      target.phone = phone.trim();
      target.dueDate = dueDate || undefined;
      target.limit = withLimit ? Number.parseFloat(limit) || 0 : 0;
      target.limitCurrency = withLimit ? currency : undefined;
    }
    toast.success(`Nasiyachi ma'lumotlari yangilandi: ${first.trim()} ${last.trim()}`.trim());
    onClose();
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Nasiyachi ma'lumotlarini tahrirlash
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block text-xs">Ism *</Label>
            <Input value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Familya *</Label>
            <Input value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="mb-1 block text-xs">Telefon raqami *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 ..." />
        </div>

        <div>
          <Label className="mb-1 block text-xs">Qaytarish sanasi</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label className="text-sm">Limit</Label>
              <div className="text-xs text-muted-foreground">
                {withLimit ? "Nasiyachiga qarz limiti belgilangan" : "Limit belgilanmagan"}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={withLimit ? "default" : "outline"}
              onClick={() => setWithLimit((value) => !value)}
            >
              {withLimit ? "Limitni olib tashlash" : "Limit qo'yish"}
            </Button>
          </div>
          {withLimit && (
            <div className="mt-3 grid grid-cols-[1fr_120px] gap-2">
              <div>
                <Label className="mb-1 block text-xs">Summa</Label>
                <Input
                  value={limit}
                  onChange={(e) => setLimit(formatNumberInput(e.target.value))}
                  inputMode="decimal"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Valyuta</Label>
                <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UZS">UZS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="RUB">RUB</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
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

function AddCreditCustomerDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [withLimit, setWithLimit] = React.useState(false);
  const [limit, setLimit] = React.useState("");
  const [currency, setCurrency] = React.useState<Currency>("UZS");
  const [sendBotUpdate, setSendBotUpdate] = React.useState(true);
  const [objects, setObjects] = React.useState<Array<{ id: string; name: string }>>([]);
  const [openingDebt, setOpeningDebt] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setFirst("");
      setLast("");
      setPhone("");
      setWithLimit(false);
      setLimit("");
      setCurrency("UZS");
      setSendBotUpdate(true);
      setObjects([]);
      setOpeningDebt("");
    }
  }, [open]);

  const canSave = first.trim() && last.trim() && phone.trim();

  const save = () => {
    if (!canSave) return;
    const openingDebtValue = Number.parseFloat(openingDebt.replace(/\s/g, "")) || 0;
    const customer: CreditCustomer = {
      id: `c${Date.now()}`,
      firstName: first.trim(),
      lastName: last.trim(),
      phone: phone.trim(),
      botEnabled: sendBotUpdate,
      role: "mijoz",
      limit: withLimit ? Number.parseFloat(limit) || 0 : 0,
      limitCurrency: withLimit ? currency : "UZS",
      currentDebt: openingDebtValue,
    };
    if (openingDebtValue > 0) {
      customer.receipts = [
        {
          id: `cr-${Date.now()}`,
          date: new Date().toISOString(),
          type: "sale",
          status: "unpaid",
          title: "Boshlang'ich qarz (dastur ishlatishdan oldin)",
          items: [],
          amount: openingDebtValue,
          debtAmount: openingDebtValue,
          paidAmount: 0,
          note: "Dasturdan foydalanishdan avvalgi qarz",
        },
      ];
    }
    const cleanedObjects = objects
      .map((item) => ({ ...item, name: item.name.trim() }))
      .filter((item) => item.name);
    if (cleanedObjects.length > 0) {
      customer.objects = cleanedObjects.map((item, index) => ({
        id: item.id || `OBJ-${Date.now()}-${index}`,
        name: item.name,
        debt: 0,
      }));
    }
    addCreditCustomer(customer);
    if (sendBotUpdate) {
      dispatchReceiptMessage({
        recipientCategory: "nasiya",
        recipientId: customer.id,
        recipientName: fullCustomerName(customer),
        phone: customer.phone,
        receiptId: customer.id,
        title: "Nasiyachi ro'yxatdan o'tdi",
        total: 0,
        note: `Nasiyachi kodi: ${customer.id}`,
      });
    }
    toast.success(`Yangi nasiyachi qo'shildi: ${fullCustomerName(customer)}`);
    onOpenChange(false);
    onSaved();
  };

  const addObject = () => {
    setObjects((current) => [...current, { id: `OBJ-${Date.now()}-${current.length}`, name: "" }]);
  };

  const updateObjectName = (id: string, name: string) => {
    setObjects((current) => current.map((item) => (item.id === id ? { ...item, name } : item)));
  };

  const removeObject = (id: string) => {
    setObjects((current) => current.filter((item) => item.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Yangi nasiyachi qo'shish
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block text-xs">Ism *</Label>
            <Input value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Familya *</Label>
            <Input value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="mb-1 block text-xs">Telefon raqami *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 ..." />
        </div>

        <div>
          <Label className="mb-1 block text-xs">Bizga qarzi (dastur ishlatishdan oldin)</Label>
          <Input
            value={openingDebt}
            onChange={(e) => setOpeningDebt(formatNumberInput(e.target.value))}
            inputMode="decimal"
            placeholder="0"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Agar mijoz dasturdan foydalanishdan avval ham bizga qarzdor bo'lsa, shu yerga qoldiq
            summani kiriting
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={addObject}>
              <Plus className="h-4 w-4" />
              Obyekt qo'shish
            </Button>
            <Button
              type="button"
              size="sm"
              variant={withLimit ? "default" : "outline"}
              onClick={() => setWithLimit((value) => !value)}
            >
              Limit qo'yish
            </Button>
          </div>

          {objects.length > 0 && (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Obyektlar
              </div>
              <div className="space-y-2">
                {objects.map((item, index) => (
                  <div key={item.id} className="flex gap-2">
                    <Input
                      value={item.name}
                      onChange={(e) => updateObjectName(item.id, e.target.value)}
                      placeholder={`Obyekt ${index + 1} nomi`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => removeObject(item.id)}
                      aria-label="Obyektni o'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-md border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Botga habar yuborish</div>
              <div className="text-xs text-muted-foreground">
                Yoqilganda nasiya savdo va qarz to'lovlari nasiyachi kodi orqali avtomatik
                yuboriladi
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

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm">Limit qo'yish</Label>
          </div>
          {withLimit && (
            <div className="mt-3 grid grid-cols-[1fr_120px] gap-2">
              <div>
                <Label className="mb-1 block text-xs">Summa</Label>
                <Input
                  value={limit}
                  onChange={(e) => setLimit(formatNumberInput(e.target.value))}
                  inputMode="decimal"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Valyuta</Label>
                <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UZS">UZS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="RUB">RUB</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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

function AddLoyalCustomerDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [cardNumber, setCardNumber] = React.useState("");
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [discountPercent, setDiscountPercent] = React.useState("5");
  const [discountScope, setDiscountScope] = React.useState<LoyalDiscountScope>("all");
  const [discountProductIds, setDiscountProductIds] = React.useState<string[]>([]);
  const [cashbackPercent, setCashbackPercent] = React.useState("3");
  const [openingCashback, setOpeningCashback] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setCardNumber(nextLoyalCardNumber());
    } else {
      setFirst("");
      setLast("");
      setPhone("");
      setDiscountPercent("5");
      setDiscountScope("all");
      setDiscountProductIds([]);
      setCashbackPercent("3");
      setOpeningCashback("");
      setNote("");
    }
  }, [open]);

  const cardTaken = MOCK_LOYAL_CUSTOMERS.some(
    (c) => c.cardNumber.toLowerCase() === cardNumber.trim().toLowerCase(),
  );
  const canSave = first.trim() && last.trim() && phone.trim() && cardNumber.trim() && !cardTaken;

  const save = () => {
    if (!canSave) return;
    const customer: LoyalCustomer = {
      id: `l${Date.now()}`,
      cardNumber: cardNumber.trim(),
      firstName: first.trim(),
      lastName: last.trim(),
      phone: phone.trim(),
      discountPercent: Number.parseFloat(discountPercent) || 0,
      discountScope,
      discountProductIds: discountScope === "all" ? undefined : discountProductIds,
      cashbackPercent: Number.parseFloat(cashbackPercent) || 0,
      cashbackBalance: Number.parseFloat(openingCashback.replace(/\s/g, "")) || 0,
      totalSpent: 0,
      joinedAt: new Date().toISOString(),
      note: note.trim() || undefined,
    };
    MOCK_LOYAL_CUSTOMERS.push(customer);
    toast.success(`Yangi sodiq mijoz qo'shildi: ${fullCustomerName(customer)}`);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Yangi sodiq mijoz qo'shish
          </DialogTitle>
        </DialogHeader>

        <div>
          <Label className="mb-1 block text-xs">Cashback karta raqami *</Label>
          <Input
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="font-mono"
          />
          {cardTaken && (
            <p className="mt-1 text-xs text-destructive">Bu karta raqami boshqa mijozga tegishli</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Mijoz shu raqam (yoki tel/ism-familya) orqali topiladi va savdo yakunida shu bilan
            o'zini tasdiqlaydi
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block text-xs">Ism *</Label>
            <Input value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Familya *</Label>
            <Input value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="mb-1 block text-xs">Telefon raqami *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 ..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block text-xs">Doimiy skidka (%)</Label>
            <Input
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Cashback (%)</Label>
            <Input
              value={cashbackPercent}
              onChange={(e) => setCashbackPercent(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
            />
          </div>
        </div>

        <LoyalDiscountScopePicker
          scope={discountScope}
          onScopeChange={setDiscountScope}
          selectedIds={discountProductIds}
          onSelectedIdsChange={setDiscountProductIds}
        />

        <div>
          <Label className="mb-1 block text-xs">Boshlang'ich cashback balansi</Label>
          <Input
            value={openingCashback}
            onChange={(e) => setOpeningCashback(formatNumberInput(e.target.value))}
            inputMode="decimal"
            placeholder="0"
          />
        </div>

        <div>
          <Label className="mb-1 block text-xs">Izoh</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Masalan: VIP mijoz"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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

function EditLoyalCustomerDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer: LoyalCustomer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cardNumber, setCardNumber] = React.useState("");
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [discountPercent, setDiscountPercent] = React.useState("");
  const [discountScope, setDiscountScope] = React.useState<LoyalDiscountScope>("all");
  const [discountProductIds, setDiscountProductIds] = React.useState<string[]>([]);
  const [cashbackPercent, setCashbackPercent] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    setCardNumber(customer?.cardNumber ?? "");
    setFirst(customer?.firstName ?? "");
    setLast(customer?.lastName ?? "");
    setPhone(customer?.phone ?? "");
    setDiscountPercent(customer ? String(customer.discountPercent) : "");
    setDiscountScope(customer?.discountScope ?? "all");
    setDiscountProductIds(customer?.discountProductIds ?? []);
    setCashbackPercent(customer ? String(customer.cashbackPercent) : "");
    setNote(customer?.note ?? "");
  }, [customer]);

  if (!customer) return null;

  const cardTaken = MOCK_LOYAL_CUSTOMERS.some(
    (c) => c.id !== customer.id && c.cardNumber.toLowerCase() === cardNumber.trim().toLowerCase(),
  );
  const canSave = first.trim() && last.trim() && phone.trim() && cardNumber.trim() && !cardTaken;

  const save = () => {
    if (!canSave) return;
    const target = MOCK_LOYAL_CUSTOMERS.find((c) => c.id === customer.id);
    if (target) {
      target.cardNumber = cardNumber.trim();
      target.firstName = first.trim();
      target.lastName = last.trim();
      target.phone = phone.trim();
      target.discountPercent = Number.parseFloat(discountPercent) || 0;
      target.discountScope = discountScope;
      target.discountProductIds = discountScope === "all" ? undefined : discountProductIds;
      target.cashbackPercent = Number.parseFloat(cashbackPercent) || 0;
      target.note = note.trim() || undefined;
    }
    toast.success(`Sodiq mijoz ma'lumotlari yangilandi: ${first.trim()} ${last.trim()}`.trim());
    onClose();
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Sodiq mijoz ma'lumotlarini tahrirlash
          </DialogTitle>
        </DialogHeader>

        <div>
          <Label className="mb-1 block text-xs">Cashback karta raqami *</Label>
          <Input
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="font-mono"
          />
          {cardTaken && (
            <p className="mt-1 text-xs text-destructive">Bu karta raqami boshqa mijozga tegishli</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block text-xs">Ism *</Label>
            <Input value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Familya *</Label>
            <Input value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="mb-1 block text-xs">Telefon raqami *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 ..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block text-xs">Doimiy skidka (%)</Label>
            <Input
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Cashback (%)</Label>
            <Input
              value={cashbackPercent}
              onChange={(e) => setCashbackPercent(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
            />
          </div>
        </div>

        <LoyalDiscountScopePicker
          scope={discountScope}
          onScopeChange={setDiscountScope}
          selectedIds={discountProductIds}
          onSelectedIdsChange={setDiscountProductIds}
        />

        <div>
          <Label className="mb-1 block text-xs">Izoh</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
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

function CashbackDialog({
  target,
  onClose,
  onSaved,
}: {
  target: LoyalRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = React.useState<"qoshish" | "yechish">("yechish");
  const [amount, setAmount] = React.useState("");

  React.useEffect(() => {
    setMode("yechish");
    setAmount("");
  }, [target]);

  if (!target) return null;

  const parsedAmount = Number.parseFloat(amount.replace(/\s/g, "")) || 0;
  const canSave =
    parsedAmount > 0 && (mode === "qoshish" || parsedAmount <= target.cashbackBalance);

  const save = () => {
    if (!canSave) return;
    const customer = MOCK_LOYAL_CUSTOMERS.find((c) => c.id === target.id);
    if (customer) {
      customer.cashbackBalance =
        mode === "qoshish"
          ? customer.cashbackBalance + parsedAmount
          : Math.max(0, customer.cashbackBalance - parsedAmount);
    }
    toast.success(
      mode === "qoshish"
        ? `Cashback qo'shildi: ${formatSom(parsedAmount)}`
        : `Cashback ishlatildi: ${formatSom(parsedAmount)}`,
    );
    onClose();
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Cashback boshqarish
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-muted/30 p-3">
          <div className="text-sm font-semibold">{target.name}</div>
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">
            Karta: {target.cardNumber}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Joriy balans:{" "}
            <span className="font-bold text-primary">{formatSom(target.cashbackBalance)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "yechish" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("yechish")}
          >
            Ishlatish (yechish)
          </Button>
          <Button
            type="button"
            variant={mode === "qoshish" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("qoshish")}
          >
            Qo'shish
          </Button>
        </div>

        <div>
          <Label className="mb-1 block text-xs">Summa</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(formatNumberInput(e.target.value))}
            inputMode="decimal"
            placeholder="0"
            autoFocus
          />
          {mode === "yechish" && parsedAmount > target.cashbackBalance && (
            <p className="mt-1 text-xs text-destructive">Balansdan ortiq summa kiritildi</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor
          </Button>
          <Button onClick={save} disabled={!canSave}>
            Tasdiqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoyalDiscountScopePicker({
  scope,
  onScopeChange,
  selectedIds,
  onSelectedIdsChange,
}: {
  scope: LoyalDiscountScope;
  onScopeChange: (scope: LoyalDiscountScope) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered: Product[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? MOCK_PRODUCTS.filter((p) => p.name.toLowerCase().includes(q)) : MOCK_PRODUCTS;
    return list.slice(0, 40);
  }, [query]);

  const toggle = (id: string) => {
    onSelectedIdsChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <Label className="text-sm">Skidka qamrovi</Label>
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={scope === "all" ? "default" : "outline"}
          onClick={() => onScopeChange("all")}
        >
          Barchasiga
        </Button>
        <Button
          type="button"
          size="sm"
          variant={scope === "selected" ? "default" : "outline"}
          onClick={() => onScopeChange("selected")}
        >
          Tanlangan
        </Button>
        <Button
          type="button"
          size="sm"
          variant={scope === "excluded" ? "default" : "outline"}
          onClick={() => onScopeChange("excluded")}
        >
          Tashqarisiga
        </Button>
      </div>

      {scope !== "all" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {scope === "selected"
              ? "Faqat quyida belgilangan tovarlarga skidka beriladi"
              : "Barcha tovarlarga skidka beriladi, quyida belgilanganlardan tashqari"}
          </p>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tovar qidirish..."
            className="h-8 text-xs"
          />
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
            {filtered.map((product) => (
              <label
                key={product.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(product.id)}
                  onChange={() => toggle(product.id)}
                />
                <span className="flex-1 truncate">{product.name}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="p-2 text-center text-xs text-muted-foreground">Topilmadi</p>
            )}
          </div>
          <p className="text-xs font-medium text-primary">{selectedIds.length} ta tovar tanlandi</p>
        </div>
      )}
    </div>
  );
}
