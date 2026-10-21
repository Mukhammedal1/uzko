import * as React from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ArrowLeftRight,
  Columns3,
  Filter,
  ImagePlus,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Download,
  Printer,
  Camera,
  ReceiptText,
  Search,
  Truck,
  UserPlus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";
import { MoneyOperationDialog } from "@/components/shared/MoneyOperationDialog";
import { MoneyOperationsList } from "@/components/shared/MoneyOperationsList";
import { dispatchReceiptMessage } from "@/lib/data-actions";
import { formatNumberInput } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import {
  MOCK_MONEY_OPERATIONS,
  MOCK_SUPPLIER_REPORTS,
  formatSom,
  type SupplierReport,
} from "@/lib/mock-data";
import { toast } from "sonner";

type Period = PeriodFilterValue;

type SupplierColumn =
  "inn" | "remaining" | "lastPayment" | "lastReturn" | "total" | "paid" | "totalReturned";

const SUPPLIER_COLUMNS: { key: SupplierColumn; label: string }[] = [
  { key: "inn", label: "INN" },
  { key: "remaining", label: "Joriy qarzimiz" },
  { key: "lastPayment", label: "Oxirgi to'lovimiz" },
  { key: "lastReturn", label: "Oxirgi tovar qaytarishimiz" },
  { key: "total", label: "Umumiy qarz aylanmamiz" },
  { key: "paid", label: "Jami to'langan qarzimiz" },
  { key: "totalReturned", label: "Jami tovar qaytarishimiz" },
];

type SupplierExportColumn =
  "name" | "phone" | "companyName" | "inn" | "accountNumber" | "total" | "paid" | "remaining";

const SUPPLIER_EXPORT_COLUMNS: { key: SupplierExportColumn; label: string }[] = [
  { key: "name", label: "Yetkazib beruvchi" },
  { key: "phone", label: "Telefon" },
  { key: "companyName", label: "Korxona" },
  { key: "inn", label: "INN" },
  { key: "accountNumber", label: "Hisob raqami" },
  { key: "total", label: "Umumiy qarz aylanmamiz" },
  { key: "paid", label: "Jami to'langan qarzimiz" },
  { key: "remaining", label: "Joriy qarzimiz" },
];

const SUPPLIER_HIDDEN_COLUMNS_KEY = "uzko-yetkazib-beruvchilar-hidden-columns";

function readHiddenSupplierColumns(): Set<SupplierColumn> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(window.localStorage.getItem(SUPPLIER_HIDDEN_COLUMNS_KEY) ?? "[]");
    return new Set(
      (Array.isArray(raw) ? raw : []).filter((key): key is SupplierColumn =>
        SUPPLIER_COLUMNS.some((col) => col.key === key),
      ),
    );
  } catch {
    return new Set();
  }
}

type SupplierRow = {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  companyName?: string;
  inn?: string;
  accountNumber?: string;
  botEnabled: boolean;
  /** Shu paytgacha shu yetkazib beruvchidan olingan tovarlarning umumiy summasi. */
  total: number;
  /** Yetkazib beruvchiga to'langan barcha summalar yig'indisi. */
  paid: number;
  /** Joriy qarz. */
  remaining: number;
  lastPaymentAmount: number;
  lastPaymentDate?: string;
  lastPaymentReport?: SupplierReport;
  /** Oxirgi marta shu yetkazib beruvchiga qaytarilgan tovar summasi. */
  lastReturnAmount: number;
  lastReturnDate?: string;
  /** Shu yetkazib beruvchi orqali kelgan tovarlardan jami qaytarilgan summa. */
  totalReturned: number;
  receipts: SupplierReport[];
};

type DetailState =
  | {
      type: "supplier-groups";
      title: string;
      rows: SupplierRow[];
      metric: "count" | "total" | "remaining" | "paid";
    }
  | {
      type: "supplier-receipts";
      title: string;
      rows: SupplierReport[];
      supplier: { id: string; name: string; phone?: string; botEnabled?: boolean };
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

type PaymentReceiptData = {
  title: string;
  receiptId: string;
  rows: [label: string, value: string][];
  amount: number;
};

function buildPaymentReceipt(report: SupplierReport): PaymentReceiptData {
  const operation = MOCK_MONEY_OPERATIONS.find(
    (op) =>
      op.party === "yetkazib_beruvchi" &&
      op.partyId === report.supplierId &&
      op.date === report.date,
  );
  const isPayment = report.type === "payment";
  const methodLabel = operation
    ? operation.method === "naqd"
      ? "Naqd pul"
      : operation.method === "karta"
        ? `Karta${operation.cardType ? ` (${operation.cardType})` : ""}`
        : operation.method === "valyuta"
          ? `Valyuta${operation.currencyCode ? ` (${operation.currencyCode})` : ""}`
          : operation.method === "otkazma"
            ? "Bank orqali o'tkazma"
            : operation.method === "click"
              ? "Click"
              : "Payme"
    : (report.note?.match(
        /Naqd pul|Karta \([^)]*\)|Valyuta \([^)]*\)|Bank orqali o'tkazma|Click|Payme/,
      )?.[0] ?? "—");
  const sourceLabel = operation
    ? operation.source === "boshqa"
      ? "Ixtiyoriy manba (kassadan emas)"
      : "Kassadan chiqim"
    : report.note?.includes("Ixtiyoriy manba")
      ? "Ixtiyoriy manba (kassadan emas)"
      : report.note?.includes("Kassadan")
        ? "Kassadan chiqim"
        : "—";
  const cashier = operation?.cashier || report.addedBy || "—";
  const rows: [string, string][] = [
    ["Chek raqami", report.id],
    ["Sana va vaqt", fmtDate(report.date)],
    ["Yetkazib beruvchi", report.supplierName],
  ];
  if (report.companyName) rows.push(["Korxona", report.companyName]);
  if (report.inn) rows.push(["INN", report.inn]);
  if (report.accountNumber) rows.push(["Hisob raqami", report.accountNumber]);
  if (report.supplierPhone) rows.push(["Telefon", report.supplierPhone]);
  rows.push(["To'lov turi", isPayment ? methodLabel : "Prixod bilan birga to'langan"]);
  if (isPayment) rows.push(["Pul manbai", sourceLabel]);
  rows.push(["To'lovni amalga oshirdi", cashier]);
  rows.push(["To'langan summa", formatSom(report.paidAmount)]);
  if (!isPayment) rows.push(["Prixod summasi", formatSom(report.totalAmount)]);
  rows.push([
    "To'lovdan keyingi qarzimiz",
    formatSom(isPayment && operation ? operation.balanceAfter : report.remainingDebt),
  ]);
  const note = operation?.note || (isPayment ? "" : report.note || "");
  if (note) rows.push(["Izoh", note]);
  return {
    title: isPayment ? "Yetkazib beruvchiga to'lov cheki" : "Prixod to'lovi cheki",
    receiptId: report.id,
    rows,
    amount: report.paidAmount,
  };
}

function paymentReceiptText(data: PaymentReceiptData, storeName: string, storePhone: string) {
  return [
    storeName || "To'lov cheki",
    storePhone ? `Tel: ${storePhone}` : "",
    data.title,
    "",
    ...data.rows.map(([label, value]) => `${label}: ${value}`),
  ]
    .filter((line, index, arr) => line !== "" || arr[index - 1] !== "")
    .join("\n");
}

function buildPaymentReceiptPdf(data: PaymentReceiptData, storeName: string, storePhone: string) {
  const width = 80;
  const margin = 5;
  const lines: { text: string; bold?: boolean; size?: number; center?: boolean }[] = [];
  const probe = new jsPDF({ unit: "mm", format: [width, 200] });
  const wrap = (text: string, size: number, max: number) => {
    probe.setFontSize(size);
    return probe.splitTextToSize(text, max) as string[];
  };
  if (storeName) lines.push({ text: storeName, bold: true, size: 13, center: true });
  if (storePhone) lines.push({ text: `Tel: ${storePhone}`, size: 9, center: true });
  lines.push({ text: data.title, bold: true, size: 11, center: true });
  lines.push({ text: "-".repeat(40), size: 8, center: true });
  data.rows.forEach(([label, value]) => {
    lines.push({ text: label, size: 8 });
    wrap(value, 10, width - margin * 2).forEach((part) =>
      lines.push({ text: part, bold: true, size: 10 }),
    );
  });
  const lineHeight = (size: number) => size * 0.5 + 1.2;
  const height = Math.max(
    60,
    margin * 2 + lines.reduce((sum, line) => sum + lineHeight(line.size ?? 10), 0),
  );
  const doc = new jsPDF({ unit: "mm", format: [width, height] });
  let y = margin + 3;
  lines.forEach((line) => {
    const size = line.size ?? 10;
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setFontSize(size);
    if (line.center) doc.text(line.text, width / 2, y, { align: "center" });
    else doc.text(line.text, margin, y);
    y += lineHeight(size);
  });
  return doc;
}

function printPaymentReceipt(data: PaymentReceiptData, storeName: string, storePhone: string) {
  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Chop etish oynasini ochib bo'lmadi");
    return;
  }
  const esc = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  win.document.write(`
    <html><head><meta charset="utf-8" /><title>${esc(data.receiptId)}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 4mm; color: #000; font-size: 12px; }
        h1 { font-size: 14px; margin: 0 0 2px; text-align: center; }
        .muted { font-size: 11px; text-align: center; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
        .row span:last-child { text-align: right; font-weight: bold; }
      </style></head>
      <body>
        <h1>${esc(storeName || "To'lov cheki")}</h1>
        ${storePhone ? `<div class="muted">Tel: ${esc(storePhone)}</div>` : ""}
        <div class="muted"><b>${esc(data.title)}</b></div>
        <div class="line"></div>
        ${data.rows
          .map(([l, v]) => `<div class="row"><span>${esc(l)}:</span><span>${esc(v)}</span></div>`)
          .join("")}
        <div class="line"></div>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`);
  win.document.close();
}

export function exportSupplierHistoryToExcel(
  rows: SupplierReport[],
  supplierId: string,
  supplierName: string,
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
  XLSX.writeFile(workbook, `yetkazib-beruvchi-${supplierId}-tovarlar-tarixi.xlsx`);
}

export function printSupplierNakladnoy(
  rows: SupplierReport[],
  supplierId: string,
  supplierName: string,
  supplierPhone: string,
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
        <title>Nakladnoy — ${supplierName}</title>
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
            <h1>${storeName || "Yetkazib beruvchi tovarlar tarixi nakladnoyi"}</h1>
            ${storePhone ? `<div class="muted">Tel: ${storePhone}</div>` : ""}
          </div>
          <div class="muted">
            <div>Yetkazib beruvchi: <b>${supplierName}</b></div>
            ${supplierPhone ? `<div>Tel: ${supplierPhone}</div>` : ""}
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
          <div class="sign">Topshirdi: ${supplierName}</div>
          <div class="sign">Qabul qildi (F.I.Sh, imzo)</div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

export function printSupplierReceipt80mm(
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
        <div class="row"><span>Yetkazib beruvchi:</span><span>${report.supplierName}</span></div>
        ${report.supplierPhone ? `<div class="row"><span>Tel:</span><span>${report.supplierPhone}</span></div>` : ""}
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

function nextSupplierId() {
  const max = MOCK_SUPPLIER_REPORTS.reduce((acc, row) => {
    const parsed = Number.parseInt(row.supplierId.replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) && parsed > acc ? parsed : acc;
  }, 0);
  return `YB-${String(max + 1).padStart(4, "0")}`;
}

export function YetkazibBeruvchilarPage() {
  const { settings } = useApp();
  const [detail, setDetail] = React.useState<DetailState>(null);
  const [selectedReport, setSelectedReport] = React.useState<SupplierReport | null>(null);
  const [paymentReceipt, setPaymentReceipt] = React.useState<SupplierReport | null>(null);
  const [period, setPeriod] = React.useState<Period>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [addSupplierOpen, setAddSupplierOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<"excel" | "pdf">("excel");
  const [exportColumns, setExportColumns] = React.useState<Set<SupplierExportColumn>>(
    () => new Set(SUPPLIER_EXPORT_COLUMNS.map((c) => c.key)),
  );
  const toggleExportColumn = (key: SupplierExportColumn, checked: boolean) => {
    setExportColumns((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };
  const [hiddenColumns, setHiddenColumns] =
    React.useState<Set<SupplierColumn>>(readHiddenSupplierColumns);
  const toggleColumn = (key: SupplierColumn, visible: boolean) => {
    setHiddenColumns((current) => {
      const next = new Set(current);
      if (visible) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(SUPPLIER_HIDDEN_COLUMNS_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  };
  const showCol = (key: SupplierColumn) => !hiddenColumns.has(key);
  const visibleColCount = 3 + SUPPLIER_COLUMNS.filter((c) => showCol(c.key)).length;
  const [editingSupplier, setEditingSupplier] = React.useState<SupplierRow | null>(null);
  const [deletingSupplier, setDeletingSupplier] = React.useState<SupplierRow | null>(null);
  const [moneyOpSupplier, setMoneyOpSupplier] = React.useState<SupplierRow | null>(null);

  const moneyOpBalance = React.useMemo(
    () =>
      moneyOpSupplier
        ? MOCK_SUPPLIER_REPORTS.filter((r) => r.supplierId === moneyOpSupplier.id).reduce(
            (sum, r) => sum + r.remainingDebt,
            0,
          )
        : 0,
    [moneyOpSupplier, refreshKey],
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

  const supplierRows = React.useMemo(() => {
    const map = new Map<string, SupplierRow>();

    MOCK_SUPPLIER_REPORTS.forEach((report) => {
      if (!isInside(report.date, period, from, to)) return;
      const current = map.get(report.supplierId) ?? {
        id: report.supplierId,
        name: report.supplierName,
        phone: report.supplierPhone,
        botEnabled: false,
        total: 0,
        paid: 0,
        remaining: 0,
        lastPaymentAmount: 0,
        lastReturnAmount: 0,
        totalReturned: 0,
        receipts: [],
      };
      current.photo = current.photo || report.supplierPhoto;
      current.companyName = current.companyName || report.companyName;
      current.inn = current.inn || report.inn;
      current.accountNumber = current.accountNumber || report.accountNumber;
      if (
        report.paidAmount > 0 &&
        (!current.lastPaymentDate ||
          new Date(report.date).getTime() > new Date(current.lastPaymentDate).getTime())
      ) {
        current.lastPaymentAmount = report.paidAmount;
        current.lastPaymentDate = report.date;
        current.lastPaymentReport = report;
      }
      if (report.type === "return") current.totalReturned += Math.abs(report.totalAmount);
      if (
        report.type === "return" &&
        (!current.lastReturnDate ||
          new Date(report.date).getTime() > new Date(current.lastReturnDate).getTime())
      ) {
        current.lastReturnAmount = Math.abs(report.totalAmount);
        current.lastReturnDate = report.date;
      }
      current.total += report.totalAmount;
      current.paid += report.paidAmount;
      current.remaining += report.remainingDebt;
      current.botEnabled = current.botEnabled || Boolean(report.botEnabled);
      current.receipts.push(report);
      map.set(report.supplierId, current);
    });

    return Array.from(map.values())
      .filter((row) => {
        if (
          query &&
          !matchesMany(
            [row.name, row.phone, row.companyName ?? "", row.inn ?? "", row.accountNumber ?? ""],
            query,
          )
        )
          return false;
        return true;
      })
      .sort((a, b) => b.total - a.total);
  }, [from, query, period, refreshKey, to]);

  const supplierSummary = {
    customers: supplierRows.length,
    total: supplierRows.reduce((sum, row) => sum + row.total, 0),
    paid: supplierRows.reduce((sum, row) => sum + row.paid, 0),
    remaining: supplierRows.reduce((sum, row) => sum + row.remaining, 0),
  };

  const toggleSupplierSelect = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const allSuppliersSelected =
    supplierRows.length > 0 && supplierRows.every((row) => selectedIds.has(row.id));
  const selectAllSuppliers = () => setSelectedIds(new Set(supplierRows.map((row) => row.id)));
  const clearSupplierSelection = () => setSelectedIds(new Set());
  const selectedSupplierRows = React.useMemo(
    () => supplierRows.filter((row) => selectedIds.has(row.id)),
    [supplierRows, selectedIds],
  );
  const suppliersForExport = selectedSupplierRows.length > 0 ? selectedSupplierRows : supplierRows;

  const buildSupplierExportRows = () => {
    const columns = SUPPLIER_EXPORT_COLUMNS.filter((col) => exportColumns.has(col.key));
    const rows = suppliersForExport.map((row) =>
      columns.map((col) => {
        switch (col.key) {
          case "name":
            return row.name;
          case "phone":
            return row.phone || "—";
          case "companyName":
            return row.companyName || "—";
          case "inn":
            return row.inn || "—";
          case "accountNumber":
            return row.accountNumber || "—";
          case "total":
            return formatSom(row.total);
          case "paid":
            return formatSom(row.paid);
          case "remaining":
            return formatSom(row.remaining);
          default:
            return "";
        }
      }),
    );
    return { columns, rows };
  };

  const exportSuppliersToExcel = () => {
    const { columns, rows } = buildSupplierExportRows();
    const worksheet = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label), ...rows]);
    worksheet["!cols"] = columns.map(() => ({ wch: 20 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Yetkazib beruvchilar qarzi");
    XLSX.writeFile(
      workbook,
      `yetkazib-beruvchilar-qarz-hisoboti-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const exportSuppliersToPdf = () => {
    const { columns, rows } = buildSupplierExportRows();
    const doc = new jsPDF({ orientation: "landscape" });
    autoTable(doc, {
      head: [columns.map((c) => c.label)],
      body: rows,
      styles: { font: "helvetica", fontSize: 9 },
      headStyles: { fillColor: [34, 44, 59] },
    });
    doc.save(`yetkazib-beruvchilar-qarz-hisoboti-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleSupplierExportConfirm = () => {
    if (exportColumns.size === 0) {
      toast.error("Kamida bitta ustunni tanlang");
      return;
    }
    if (exportFormat === "excel") exportSuppliersToExcel();
    else exportSuppliersToPdf();
    setExportOpen(false);
  };

  const triggerRefresh = React.useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const confirmDeleteSupplier = () => {
    if (!deletingSupplier) return;
    for (let i = MOCK_SUPPLIER_REPORTS.length - 1; i >= 0; i -= 1) {
      if (MOCK_SUPPLIER_REPORTS[i].supplierId === deletingSupplier.id)
        MOCK_SUPPLIER_REPORTS.splice(i, 1);
    }
    toast.success(`Yetkazib beruvchi o'chirildi: ${deletingSupplier.name}`);
    setDeletingSupplier(null);
    triggerRefresh();
  };

  const openSupplierReceipts = React.useCallback(
    (row: SupplierRow) => {
      resetReceiptFilters();
      setDetail({
        type: "supplier-receipts",
        title: `${row.name} yetkazib beruvchi cheklari`,
        rows: row.receipts,
        supplier: { id: row.id, name: row.name, phone: row.phone, botEnabled: row.botEnabled },
      });
    },
    [resetReceiptFilters],
  );

  const filteredSupplierReceipts = React.useMemo(() => {
    if (detail?.type !== "supplier-receipts") return [];
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
    <div className="flex items-center gap-2 rounded-lg border bg-card/70 p-3">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ism-familiya, korxona yoki telefon raqami bo'yicha qidirish"
          className="pl-9"
        />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={period === "all" ? "outline" : "default"} className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-3">
          <PeriodFilter
            value={period}
            onValueChange={setPeriod}
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-card p-3">
          <Truck className="h-5 w-5 text-primary" />
          <div className="text-base font-semibold">Yetkazib beruvchilar</div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="grid flex-1 gap-3 md:grid-cols-4">
                <Kpi
                  title="Yetkazib beruvchilar soni"
                  value={`${supplierSummary.customers} ta`}
                  onClick={() =>
                    setDetail({
                      type: "supplier-groups",
                      title: "Yetkazib beruvchilar ro'yxati",
                      rows: supplierRows,
                      metric: "count",
                    })
                  }
                />
                <Kpi
                  title="Joriy umumiy qarzimiz"
                  value={formatSom(supplierSummary.remaining)}
                  onClick={() =>
                    setDetail({
                      type: "supplier-groups",
                      title: "Yetkazib beruvchilar bo'yicha joriy umumiy qarz",
                      rows: supplierRows.filter((row) => row.remaining > 0),
                      metric: "remaining",
                    })
                  }
                />
                <Kpi
                  title="Jami to'lagan qarzimiz"
                  value={formatSom(supplierSummary.paid)}
                  onClick={() =>
                    setDetail({
                      type: "supplier-groups",
                      title: "Yetkazib beruvchilar bo'yicha jami to'lagan qarzimiz",
                      rows: supplierRows,
                      metric: "paid",
                    })
                  }
                />
                <Kpi
                  title="Jami qarz aylanmamiz"
                  value={formatSom(supplierSummary.total)}
                  accent
                  onClick={() =>
                    setDetail({
                      type: "supplier-groups",
                      title: "Yetkazib beruvchilar bo'yicha jami qarz aylanmamiz",
                      rows: supplierRows,
                      metric: "total",
                    })
                  }
                />
              </div>
              <Button className="gap-2" onClick={() => setAddSupplierOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Yangi yetkazib beruvchi
              </Button>
            </div>

            {filterBar}

            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-primary/5 px-3 py-2">
                <div className="text-sm font-semibold text-primary">
                  {selectedIds.size} ta yetkazib beruvchi tanlandi
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setExportOpen(true)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Tanlanganlarni yuklab olish
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={clearSupplierSelection}
                    title="Tanlovni bekor qilish"
                    aria-label="Tanlovni bekor qilish"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Card className="flex min-h-0 flex-1 flex-col">
              <CardHeader className="flex-row items-center justify-between border-b py-3">
                <CardTitle className="text-base">Yetkazib beruvchilar ro'yxati</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setExportOpen(true)}
                  title="Yuklab olish"
                >
                  <Download className="h-4 w-4" />
                  Yuklab olish
                </Button>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto p-0">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="sticky top-0 z-10 bg-muted text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="w-10 px-4 py-3 text-left">
                        <Checkbox
                          checked={
                            allSuppliersSelected
                              ? true
                              : selectedIds.size > 0
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={() =>
                            allSuppliersSelected ? clearSupplierSelection() : selectAllSuppliers()
                          }
                          title="Barchasini belgilash"
                          aria-label="Barchasini belgilash"
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Yetkazib beruvchi</th>
                      {showCol("inn") && <th className="px-4 py-3 text-left">INN</th>}
                      {showCol("remaining") && (
                        <th className="px-4 py-3 text-right">Joriy qarzimiz</th>
                      )}
                      {showCol("lastPayment") && (
                        <th className="px-4 py-3 text-right">Oxirgi to'lovimiz</th>
                      )}
                      {showCol("lastReturn") && (
                        <th className="px-4 py-3 text-right">Oxirgi tovar qaytarishimiz</th>
                      )}
                      {showCol("total") && (
                        <th className="px-4 py-3 text-right">Umumiy qarz aylanmamiz</th>
                      )}
                      {showCol("paid") && (
                        <th className="px-4 py-3 text-right">Jami to'langan qarzimiz</th>
                      )}
                      {showCol("totalReturned") && (
                        <th className="px-4 py-3 text-right">Jami tovar qaytarishimiz</th>
                      )}
                      <th className="w-40 px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          Amallar
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Ustunlarni sozlash"
                                aria-label="Ustunlarni sozlash"
                              >
                                <Columns3 className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-60 normal-case tracking-normal"
                            >
                              {SUPPLIER_COLUMNS.map((col) => (
                                <DropdownMenuCheckboxItem
                                  key={col.key}
                                  checked={showCol(col.key)}
                                  onCheckedChange={(checked) => toggleColumn(col.key, checked)}
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  {col.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierRows.map((row) => (
                      <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedIds.has(row.id)}
                            onCheckedChange={() => toggleSupplierSelect(row.id)}
                            aria-label={`${row.name} tanlash`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted/30 text-sm font-semibold text-muted-foreground">
                              {row.photo ? (
                                <img
                                  src={row.photo}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                row.name.trim().charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => openSupplierReceipts(row)}
                                className="block truncate text-left font-semibold hover:underline"
                              >
                                {row.name}
                              </button>
                              {row.companyName && (
                                <div className="truncate text-xs text-muted-foreground">
                                  {row.companyName}
                                </div>
                              )}
                              {row.accountNumber && (
                                <div className="truncate text-xs text-muted-foreground">
                                  H/r: {row.accountNumber}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {row.phone || "—"}
                              </div>
                            </div>
                          </div>
                        </td>
                        {showCol("inn") && (
                          <td className="px-4 py-3 text-left tabular-nums">{row.inn || "—"}</td>
                        )}
                        {showCol("remaining") && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openSupplierReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {formatSom(row.remaining)}
                            </button>
                          </td>
                        )}
                        {showCol("lastPayment") && (
                          <td className="px-4 py-3 text-right">
                            {row.lastPaymentDate && row.lastPaymentReport ? (
                              <button
                                type="button"
                                onClick={() => setPaymentReceipt(row.lastPaymentReport ?? null)}
                                className="text-right hover:opacity-70"
                                title="To'lov chekini ko'rish"
                              >
                                <div className="font-semibold text-primary hover:underline">
                                  {formatSom(row.lastPaymentAmount)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(row.lastPaymentDate).toLocaleString("uz-UZ", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        {showCol("lastReturn") && (
                          <td className="px-4 py-3 text-right">
                            {row.lastReturnDate ? (
                              <>
                                <div className="font-semibold">
                                  {formatSom(row.lastReturnAmount)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(row.lastReturnDate).toLocaleString("uz-UZ", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        {showCol("total") && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openSupplierReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {formatSom(row.total)}
                            </button>
                          </td>
                        )}
                        {showCol("paid") && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openSupplierReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {formatSom(row.paid)}
                            </button>
                          </td>
                        )}
                        {showCol("totalReturned") && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openSupplierReceipts(row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {formatSom(row.totalReturned)}
                            </button>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                              aria-label="Pul operatsiyasi"
                              title="Pul operatsiyasi"
                              onClick={() => setMoneyOpSupplier(row)}
                            >
                              <ArrowLeftRight className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              aria-label="Tovarlar tarixini ko'rish"
                              onClick={() => openSupplierReceipts(row)}
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              aria-label="Tahrirlash"
                              onClick={() => setEditingSupplier(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              aria-label="O'chirish"
                              onClick={() => setDeletingSupplier(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {supplierRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={visibleColCount}
                          className="p-8 text-center text-muted-foreground"
                        >
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

          {detail?.type === "supplier-groups" && (
            <div className="space-y-3">
              {detail.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openSupplierReceipts(row)}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40"
                >
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-sm text-muted-foreground">{row.phone ?? ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {detail.metric === "count"
                        ? "Cheklar soni"
                        : detail.metric === "remaining"
                          ? "Joriy qarz"
                          : detail.metric === "paid"
                            ? "To'lagan"
                            : "Aylanma"}
                    </div>
                    <div className="font-bold text-primary">
                      {detail.metric === "count"
                        ? `${row.receipts.length} ta`
                        : formatSom(
                            detail.metric === "remaining"
                              ? row.remaining
                              : detail.metric === "paid"
                                ? row.paid
                                : row.total,
                          )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {detail?.type === "supplier-receipts" && (
            <div className="space-y-3">
              <MoneyOperationsList
                party="yetkazib_beruvchi"
                partyId={detail.supplier.id}
                refreshKey={refreshKey}
              />
              {receiptFilterBar}
              {filteredSupplierReceipts.map((report) => (
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
              {filteredSupplierReceipts.length === 0 && (
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
                    exportSupplierHistoryToExcel(
                      [selectedReport],
                      selectedReport.supplierId,
                      selectedReport.supplierName,
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
                    printSupplierNakladnoy(
                      [selectedReport],
                      selectedReport.supplierId,
                      selectedReport.supplierName,
                      selectedReport.supplierPhone,
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
                    printSupplierReceipt80mm(
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
              <InfoRow label="Yetkazib beruvchi" value={selectedReport.supplierName} />
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

      <PaymentReceiptDialog
        report={paymentReceipt}
        storeName={settings.receiptSettings.storeName}
        storePhone={settings.receiptSettings.phone}
        onClose={() => setPaymentReceipt(null)}
      />

      <MoneyOperationDialog
        party="yetkazib_beruvchi"
        target={
          moneyOpSupplier
            ? {
                id: moneyOpSupplier.id,
                name: moneyOpSupplier.name,
                phone: moneyOpSupplier.phone,
                botEnabled: moneyOpSupplier.botEnabled,
              }
            : null
        }
        currentBalance={moneyOpBalance}
        onClose={() => setMoneyOpSupplier(null)}
        onDone={triggerRefresh}
      />

      <AddSupplierDialog
        open={addSupplierOpen}
        onOpenChange={setAddSupplierOpen}
        onSaved={triggerRefresh}
      />

      <EditSupplierDialog
        supplier={editingSupplier}
        onClose={() => setEditingSupplier(null)}
        onSaved={triggerRefresh}
      />

      <AlertDialog open={!!deletingSupplier} onOpenChange={(o) => !o && setDeletingSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yetkazib beruvchini o'chirish?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSupplier?.name}
              {deletingSupplier && deletingSupplier.remaining > 0 && (
                <> · qolgan qarzimiz: {formatSom(deletingSupplier.remaining)}</>
              )}{" "}
              Bu yetkazib beruvchiga tegishli barcha prixod tarixi ham o'chiriladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSupplier}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Yetkazib beruvchilar qarzi hisobotini yuklab olish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              {selectedSupplierRows.length > 0
                ? `${selectedSupplierRows.length} ta tanlangan yetkazib beruvchi yuklab olinadi`
                : `Tanlov yo'q — barcha ${supplierRows.length} ta yetkazib beruvchi yuklab olinadi`}
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={exportFormat === "excel" ? "default" : "outline"}
                  onClick={() => setExportFormat("excel")}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  type="button"
                  variant={exportFormat === "pdf" ? "default" : "outline"}
                  onClick={() => setExportFormat("pdf")}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Qaysi ustunlar chiqsin?</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                {SUPPLIER_EXPORT_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 text-sm font-normal">
                    <Checkbox
                      checked={exportColumns.has(col.key)}
                      onCheckedChange={(checked) => toggleExportColumn(col.key, checked === true)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleSupplierExportConfirm} className="gap-2">
              <Download className="h-4 w-4" />
              Yuklab olish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function PaymentReceiptDialog({
  report,
  storeName,
  storePhone,
  onClose,
}: {
  report: SupplierReport | null;
  storeName: string;
  storePhone: string;
  onClose: () => void;
}) {
  const receiptRef = React.useRef<HTMLDivElement>(null);

  if (!report) return null;
  const data = buildPaymentReceipt(report);
  const fileName = `${data.receiptId}.pdf`;

  const download = () => {
    buildPaymentReceiptPdf(data, storeName, storePhone).save(fileName);
  };

  /** Faqat chek qismini rasm qilib clipboard'ga nusxalaydi (yo'qsa — PNG yuklab beradi). */
  const screenshot = async () => {
    const node = receiptRef.current;
    if (!node) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(node, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("blob");
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Chek rasmi nusxalandi — messengerga qo'ying (Ctrl+V)");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.receiptId}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Chek rasmi yuklab olindi");
    } catch {
      toast.error("Screenshot olib bo'lmadi");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            {data.title}
          </DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="rounded-lg border border-dashed bg-white p-4 text-black">
          <div className="text-center">
            <div className="font-semibold">{storeName || "To'lov cheki"}</div>
            {storePhone && <div className="text-xs text-neutral-600">Tel: {storePhone}</div>}
          </div>
          <div className="my-3 border-t border-dashed" />
          <div className="space-y-1.5 text-sm">
            {data.rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <span className="text-neutral-600">{label}</span>
                <span className="text-right font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={download}>
              <Download className="h-4 w-4" />
              Yuklab olish
            </Button>
            <Button variant="outline" className="gap-2" onClick={screenshot}>
              <Camera className="h-4 w-4" />
              Screenshot
            </Button>
            <Button
              className="gap-2"
              onClick={() => printPaymentReceipt(data, storeName, storePhone)}
            >
              <Printer className="h-4 w-4" />
              Chop etish
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const OPENING_DEBT_NOTE = "Boshlang'ich qarz (dastur ishlatishdan oldin)";

function findOpeningDebtReport(supplierId: string) {
  return MOCK_SUPPLIER_REPORTS.find(
    (r) =>
      r.supplierId === supplierId && r.items.length === 0 && r.note?.startsWith(OPENING_DEBT_NOTE),
  );
}

function EditSupplierDialog({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: SupplierRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [editInn, setEditInn] = React.useState("");
  const [editAccount, setEditAccount] = React.useState("");
  const [photo, setPhoto] = React.useState("");
  const [openingDebt, setOpeningDebt] = React.useState("");
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const opening = supplier ? findOpeningDebtReport(supplier.id) : undefined;
    setOpeningDebt(
      opening && opening.totalAmount > 0 ? formatNumberInput(String(opening.totalAmount)) : "",
    );
    setName(supplier?.name ?? "");
    setPhone(supplier?.phone ?? "");
    setCompany(supplier?.companyName ?? "");
    setEditInn(supplier?.inn ?? "");
    setEditAccount(supplier?.accountNumber ?? "");
    setPhoto(supplier?.photo ?? "");
  }, [supplier]);

  const onPhotoPick = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  if (!supplier) return null;

  const canSave = name.trim();

  const save = () => {
    if (!canSave) return;
    MOCK_SUPPLIER_REPORTS.forEach((report) => {
      if (report.supplierId !== supplier.id) return;
      report.supplierName = name.trim();
      report.supplierPhone = phone.trim();
      report.companyName = company.trim() || undefined;
      report.inn = editInn.trim() || undefined;
      report.accountNumber = editAccount.trim() || undefined;
      report.supplierPhoto = photo || undefined;
    });
    const newDebt = Number.parseFloat(openingDebt.replace(/\s/g, "")) || 0;
    const opening = findOpeningDebtReport(supplier.id);
    if (opening) {
      const delta = newDebt - opening.totalAmount;
      opening.totalAmount = newDebt;
      opening.remainingDebt += delta;
    } else if (newDebt > 0) {
      MOCK_SUPPLIER_REPORTS.unshift({
        id: `sr-${Date.now()}`,
        date: new Date().toISOString(),
        addedBy: "Joriy foydalanuvchi",
        supplierId: supplier.id,
        supplierName: name.trim(),
        supplierPhone: phone.trim(),
        companyName: company.trim() || undefined,
        inn: editInn.trim() || undefined,
        accountNumber: editAccount.trim() || undefined,
        supplierPhoto: photo || undefined,
        items: [],
        totalAmount: newDebt,
        paidAmount: 0,
        remainingDebt: newDebt,
        note: OPENING_DEBT_NOTE,
      });
    }
    toast.success(`Yetkazib beruvchi ma'lumotlari yangilandi: ${name.trim()}`);
    onClose();
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Yetkazib beruvchi ma'lumotlarini tahrirlash
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPhotoPick(e.target.files?.[0] ?? undefined)}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted/30 text-muted-foreground hover:bg-muted/50"
            aria-label="Rasm tanlash"
          >
            {photo ? (
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </button>
          <div className="space-y-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => photoInputRef.current?.click()}
            >
              {photo ? "Rasmni almashtirish" : "Rasm qo'shish"}
            </Button>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto("")}
                className="block text-[11px] font-medium text-destructive hover:underline"
              >
                Rasmni o'chirish
              </button>
            )}
          </div>
        </div>
        <div>
          <Label className="mb-1 block text-xs">Ism *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Korxona nomi</Label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block text-xs">INN</Label>
          <Input
            value={editInn}
            onChange={(e) => setEditInn(e.target.value.replace(/\D/g, "").slice(0, 9))}
            inputMode="numeric"
            placeholder="9 raqam"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Korxona hisob raqami</Label>
          <Input
            value={editAccount}
            onChange={(e) => setEditAccount(e.target.value.replace(/\D/g, "").slice(0, 20))}
            inputMode="numeric"
            placeholder="20 raqam"
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

function AddSupplierDialog({
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
  const [altPhones, setAltPhones] = React.useState<string[]>([]);
  const [note, setNote] = React.useState("");
  const [photo, setPhoto] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [inn, setInn] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [openingDebt, setOpeningDebt] = React.useState("");
  const supplierId = React.useMemo(() => nextSupplierId(), [open]);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setPhone("");
      setAltPhones([]);
      setNote("");
      setPhoto("");
      setCompany("");
      setInn("");
      setAccountNumber("");
      setAddress("");
      setOpeningDebt("");
    }
  }, [open]);

  const onPhotoPick = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const addAltPhone = () => setAltPhones((prev) => [...prev, ""]);
  const updateAltPhone = (index: number, next: string) =>
    setAltPhones((prev) => prev.map((p, i) => (i === index ? next : p)));
  const removeAltPhone = (index: number) =>
    setAltPhones((prev) => prev.filter((_, i) => i !== index));

  const save = () => {
    if (!name.trim()) {
      toast.error("Yetkazib beruvchi ismini kiriting");
      return;
    }
    const altPhonesClean = altPhones.map((p) => p.trim()).filter(Boolean);
    const sendBotUpdate = Boolean(phone.trim());
    const openingDebtValue = Number.parseFloat(openingDebt.replace(/\s/g, "")) || 0;
    const report: SupplierReport = {
      id: `sr-${Date.now()}`,
      date: new Date().toISOString(),
      addedBy: "Joriy foydalanuvchi",
      supplierId,
      supplierName: name.trim(),
      supplierPhone: phone.trim(),
      supplierAltPhones: altPhonesClean.length ? altPhonesClean : undefined,
      supplierAltPhone: altPhonesClean[0],
      supplierPhoto: photo.trim() || undefined,
      companyName: company.trim() || undefined,
      inn: inn.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      address: address.trim() || undefined,
      botEnabled: sendBotUpdate,
      items: [],
      totalAmount: openingDebtValue,
      paidAmount: 0,
      remainingDebt: openingDebtValue,
      note:
        openingDebtValue > 0
          ? [OPENING_DEBT_NOTE, note.trim()].filter(Boolean).join(" — ")
          : note.trim() || undefined,
    };
    MOCK_SUPPLIER_REPORTS.unshift(report);
    if (sendBotUpdate) {
      dispatchReceiptMessage({
        recipientCategory: "yetkazib_beruvchi",
        recipientId: supplierId,
        recipientName: report.supplierName,
        phone: report.supplierPhone,
        receiptId: supplierId,
        title: "Yetkazib beruvchi ro'yxatdan o'tdi",
        total: 0,
      });
    }
    toast.success("Yangi yetkazib beruvchi qo'shildi");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Yangi yetkazib beruvchi qo'shish
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Chap ustun */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhotoPick(e.target.files?.[0] ?? undefined)}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                aria-label="Rasm tanlash"
              >
                {photo ? (
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </button>
              <div className="space-y-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => photoInputRef.current?.click()}
                >
                  {photo ? "Rasmni almashtirish" : "Rasm qo'shish"}
                </Button>
                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto("")}
                    className="block text-[11px] font-medium text-destructive hover:underline"
                  >
                    Rasmni o'chirish
                  </button>
                )}
              </div>
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
              <div className="mb-1 flex items-center justify-between gap-2">
                <Label className="block text-xs">Telefon</Label>
                <button
                  type="button"
                  onClick={addAltPhone}
                  className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Qo'shimcha raqam
                </button>
              </div>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998" />
              {altPhones.map((alt, index) => (
                <div key={index} className="mt-2 flex items-center gap-2">
                  <Input
                    value={alt}
                    onChange={(e) => updateAltPhone(index, e.target.value)}
                    placeholder="+998 ... (qo'shimcha raqam)"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeAltPhone(index)}
                    aria-label="Qo'shimcha raqamni o'chirish"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
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
                Agar bu yetkazib beruvchidan dasturdan foydalanishdan avval ham tovar olib, qarzimiz
                bo'lsa, shu yerga qoldiq summani kiriting
              </p>
            </div>
          </div>

          {/* O'ng ustun */}
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs">Tashkilot / firma nomi</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="MChJ / YaTT nomi"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">STIR (INN)</Label>
              <Input
                value={inn}
                onChange={(e) => setInn(e.target.value.replace(/\D/g, "").slice(0, 9))}
                inputMode="numeric"
                placeholder="9 raqam"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Korxona hisob raqami</Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 20))}
                inputMode="numeric"
                placeholder="20 raqam"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Manzil / mo'ljal</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Tuman, ko'cha yoki mo'ljal"
              />
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
