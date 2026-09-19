/**
 * Admin Telegram boti uchun PDF hisobotlar. Ma'lumot manbai har doim
 * `reports.ts` — chatdagi raqamlar bilan PDF'dagi raqamlar shu sababli har
 * doim bir xil bo'ladi.
 *
 * Mavjud `jspdf` + `jspdf-autotable` ishlatiladi (loyihada allaqachon
 * `BarchaTovarlar.tsx` eksport funksiyasida xuddi shu kutubxonalar bor).
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type ToolCallRecord } from "./ai/agent";
import { callTool } from "./ai/tools";
import { formatSom } from "./format";
import { formatDateUz, tashkentDateKey, type PeriodRange } from "./period";
import {
  getCashSummary,
  getCustomerDebt,
  getDebts,
  getSalesList,
  getSalesSummary,
  getStock,
  type DebtStatus,
  type SaleType,
  type StockFilter,
} from "./reports";
import type { Receipt } from "@/lib/mock-data";

export type GeneratedPdf = { blob: Blob; filename: string };

/** Har bir sahifaga "1 / N" sahifa raqamini qo'yib, doc'ni Blob'ga aylantiradi. */
function finalizePdf(doc: jsPDF): Blob {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`${i} / ${pageCount}`, pageWidth - 20, pageHeight - 8);
  }
  return doc.output("blob");
}

type Column = { header: string; key: string; align?: "left" | "right" };

function renderReportPdf(opts: {
  title: string;
  subtitle: string;
  columns: Column[];
  rows: Record<string, string | number>[];
  totalsRow?: Record<string, string | number>;
  orientation?: "portrait" | "landscape";
}): Blob {
  const doc = new jsPDF({ orientation: opts.orientation ?? "portrait" });

  doc.setFontSize(13);
  doc.text("UZKO SAVDO", 14, 15);
  doc.setFontSize(11);
  doc.text(opts.title, 14, 22);
  doc.setFontSize(9);
  doc.text(opts.subtitle, 14, 28);
  doc.text(`Yaratildi: ${new Date().toLocaleString("uz-UZ")}`, 14, 33);

  autoTable(doc, {
    startY: 38,
    head: [opts.columns.map((c) => c.header)],
    body: opts.rows.map((row) => opts.columns.map((c) => String(row[c.key] ?? ""))),
    foot: opts.totalsRow ? [opts.columns.map((c) => String(opts.totalsRow![c.key] ?? ""))] : undefined,
    styles: { font: "helvetica", fontSize: 9 },
    headStyles: { fillColor: [34, 44, 59] },
    footStyles: { fillColor: [230, 230, 230], textColor: [20, 20, 20], fontStyle: "bold" },
    columnStyles: Object.fromEntries(
      opts.columns.map((c, i) => [i, { halign: c.align ?? "left" }]),
    ),
    didParseCell: (data) => {
      // Manfiy summalar (masalan xarajat/skidka) qizil rangda ko'rsatiladi.
      const raw = String(data.cell.raw ?? "");
      if (raw.trim().startsWith("-")) {
        data.cell.styles.textColor = [200, 30, 30];
      }
    },
  });

  return finalizePdf(doc);
}

const SALE_TYPE_FILE_LABEL: Record<SaleType, string> = {
  all: "barcha",
  paid: "tolangan",
  credit: "nasiya",
};

const SALE_TYPE_TITLE: Record<SaleType, string> = {
  all: "Barchasi",
  paid: "To'langan",
  credit: "Nasiya",
};

export function buildSalesPdf(range: PeriodRange, saleType: SaleType): GeneratedPdf {
  const { rows: listRows } = getSalesList(range.start, range.end, saleType, {
    limit: 5000,
  });
  const summary = getSalesSummary(range.start, range.end, saleType);

  const rows = listRows.map((r) => ({
    date: formatDateUz(new Date(r.date)),
    receiptNo: r.receiptNo,
    customer: r.customer,
    total: formatSom(r.total),
    paid: formatSom(r.paid),
    debt: r.debt > 0 ? `-${formatSom(r.debt)}` : formatSom(0),
  }));

  const fromKey = tashkentDateKey(range.start);
  const toKey = tashkentDateKey(new Date(range.end.getTime() - 1));

  return {
    blob: renderReportPdf({
      title: `Savdo hisobot — ${SALE_TYPE_TITLE[saleType]}`,
      subtitle: `Davr: ${range.label} · Cheklar: ${summary.receiptsCount} · Jami: ${formatSom(summary.total)} (To'langan: ${formatSom(summary.paidTotal)}, Nasiya: ${formatSom(summary.creditTotal)})`,
      columns: [
        { header: "Sana", key: "date" },
        { header: "Chek №", key: "receiptNo" },
        { header: "Mijoz", key: "customer" },
        { header: "Jami", key: "total", align: "right" },
        { header: "To'langan", key: "paid", align: "right" },
        { header: "Qarz", key: "debt", align: "right" },
      ],
      rows,
      totalsRow: {
        date: "",
        receiptNo: "",
        customer: "Jami",
        total: formatSom(summary.total),
        paid: formatSom(summary.paidTotal),
        debt: summary.creditTotal > 0 ? `-${formatSom(summary.creditTotal)}` : formatSom(0),
      },
    }),
    filename: `savdo_${SALE_TYPE_FILE_LABEL[saleType]}_${fromKey}_${toKey}.pdf`,
  };
}

export function buildCashPdf(range: PeriodRange): GeneratedPdf {
  const cash = getCashSummary(range.start, range.end);
  const rows: Record<string, string>[] = cash.byPaymentType.map((row) => ({
    label: row.method,
    amount: formatSom(row.amount),
  }));
  rows.push({ label: "Qarz to'lovlaridan kirim", amount: formatSom(cash.debtPayments) });
  rows.push({ label: "Xarajatlar", amount: `-${formatSom(cash.expenses)}` });
  if (cash.cashBalance !== null) {
    rows.push({ label: "Kassada qoldi", amount: formatSom(cash.cashBalance) });
  }

  const fromKey = tashkentDateKey(range.start);
  const toKey = tashkentDateKey(new Date(range.end.getTime() - 1));

  return {
    blob: renderReportPdf({
      title: "Kassa hisobot",
      subtitle: `Davr: ${range.label}`,
      columns: [
        { header: "Ko'rsatkich", key: "label" },
        { header: "Summa", key: "amount", align: "right" },
      ],
      rows,
    }),
    filename: `kassa_${fromKey}_${toKey}.pdf`,
  };
}

const DEBT_STATUS_TITLE: Record<DebtStatus, string> = {
  all: "Barchasi",
  overdue: "Muddati o'tgan",
  paidToday: "Bugun to'laganlar",
};

const DEBT_STATUS_FILE_LABEL: Record<DebtStatus, string> = {
  all: "barcha",
  overdue: "muddati-otgan",
  paidToday: "bugun-tolangan",
};

export function buildDebtsPdf(status: DebtStatus, now = new Date()): GeneratedPdf {
  const { totalDebt, customersCount, rows: debtRows } = getDebts(status, { now, limit: 5000 });
  const rows = debtRows.map((r) => ({
    customer: r.customer,
    debt: formatSom(r.debt),
    dueDate: r.dueDate ? formatDateUz(new Date(`${r.dueDate}T00:00:00+05:00`)) : "—",
    overdueDays: r.overdueDays > 0 ? `${r.overdueDays} kun` : "—",
  }));

  return {
    blob: renderReportPdf({
      title: `Qarzdorlar — ${DEBT_STATUS_TITLE[status]}`,
      subtitle: `Jami qarz: ${formatSom(totalDebt)} (${customersCount} mijoz)`,
      columns: [
        { header: "Mijoz", key: "customer" },
        { header: "Qarz", key: "debt", align: "right" },
        { header: "Muddat", key: "dueDate" },
        { header: "Kechikish", key: "overdueDays" },
      ],
      rows,
      totalsRow: { customer: "Jami", debt: formatSom(totalDebt), dueDate: "", overdueDays: "" },
    }),
    filename: `qarzdorlar_${DEBT_STATUS_FILE_LABEL[status]}_${tashkentDateKey(now)}.pdf`,
  };
}

export function buildCustomerActPdf(customerId: string, now = new Date()): GeneratedPdf | null {
  const detail = getCustomerDebt(customerId);
  if (!detail) return null;
  const rows = detail.creditSales.map((s) => ({
    date: formatDateUz(new Date(s.date)),
    title: s.title,
    amount: formatSom(s.amount),
  }));

  return {
    blob: renderReportPdf({
      title: `Akt-sverka — ${detail.customer}`,
      subtitle: `Joriy qarz: ${formatSom(detail.debt)}`,
      columns: [
        { header: "Sana", key: "date" },
        { header: "Nomi", key: "title" },
        { header: "Summa", key: "amount", align: "right" },
      ],
      rows,
    }),
    filename: `akt_sverka_${customerId}_${tashkentDateKey(now)}.pdf`,
  };
}

const STOCK_FILTER_TITLE: Record<StockFilter, string> = {
  low: "Tugayotgan",
  out: "Tugagan",
  dead: "Sotilmayotgan",
  all: "Barcha qoldiq",
};

const STOCK_FILTER_FILE_LABEL: Record<StockFilter, string> = {
  low: "tugayotgan",
  out: "tugagan",
  dead: "sotilmayotgan",
  all: "barcha",
};

export function buildStockPdf(
  filter: StockFilter,
  deadDays: 7 | 30,
  now = new Date(),
): GeneratedPdf {
  const { rows: stockRows, totalCount } = getStock(filter, { deadDays, limit: 5000 });
  const rows = stockRows.map((r) => ({
    name: r.name,
    qty: `${r.qty} ${r.unit}`,
    lastSoldAt: r.lastSoldAt ? formatDateUz(new Date(`${r.lastSoldAt}T00:00:00+05:00`)) : "—",
    frozenValue: r.frozenValue !== undefined ? formatSom(r.frozenValue) : "—",
  }));
  const title = filter === "dead" ? `${STOCK_FILTER_TITLE.dead} (${deadDays} kun)` : STOCK_FILTER_TITLE[filter];

  return {
    blob: renderReportPdf({
      title: `Zaxira — ${title}`,
      subtitle: `Jami: ${totalCount} ta tovar`,
      columns: [
        { header: "Nomi", key: "name" },
        { header: "Qoldiq", key: "qty", align: "right" },
        { header: "Oxirgi sotilgan", key: "lastSoldAt" },
        { header: "Muzlagan pul", key: "frozenValue", align: "right" },
      ],
      rows,
      orientation: "landscape",
    }),
    filename: `zaxira_${STOCK_FILTER_FILE_LABEL[filter]}_${tashkentDateKey(now)}.pdf`,
  };
}

const AI_TOOL_TITLE: Record<string, string> = {
  get_sales_summary: "Savdo xulosasi",
  get_sales_list: "Cheklar ro'yxati",
  get_top_products: "Top tovarlar",
  get_cash_summary: "Kassa",
  get_debts: "Qarzdorlar",
  find_customer: "Mijoz qidiruvi",
  get_customer_debt: "Mijoz qarzi",
  get_stock: "Zaxira",
  find_product: "Tovar qidiruvi",
};

/** Ro'yxat (array) bo'lmagan maydonlarni "Maydon / Qiymat" jadvali uchun tekislaydi. */
function flattenScalarFields(obj: Record<string, unknown>): [string, string][] {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && !Array.isArray(v) && typeof v !== "object")
    .map(([key, value]) => [key, String(value)]);
}

/**
 * AI chat javobi ostidagi "📄 PDF" tugmasi bosilganda chaqiriladi: javobda
 * ishlatilgan tool'lar xuddi shu parametrlar bilan, lekin limit 5000
 * qatorgacha ko'tarilib, qayta chaqiriladi (spec 7-bo'lim). LLM matni PDF'ga
 * kirmaydi — faqat bazadagi (reports.ts orqali kelgan) raqamlar.
 */
export function buildAiChatPdf(question: string, tools: ToolCallRecord[], now = new Date()): GeneratedPdf {
  const doc = new jsPDF();

  doc.setFontSize(13);
  doc.text("UZKO SAVDO", 14, 15);
  doc.setFontSize(11);
  doc.text("AI javobi — ma'lumotlar", 14, 22);
  doc.setFontSize(9);
  const questionLines = doc.splitTextToSize(`Savol: ${question}`, 180) as string[];
  doc.text(questionLines, 14, 28);
  let y = 28 + questionLines.length * 5 + 3;
  doc.text(`Yaratildi: ${now.toLocaleString("uz-UZ")}`, 14, y);
  y += 8;

  for (const call of tools) {
    const result = callTool(call.name, { ...call.args, limit: 5000 }) as Record<string, unknown>;

    if (y > 260) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(10);
    doc.text(AI_TOOL_TITLE[call.name] ?? call.name, 14, y);
    y += 4;

    const scalarRows = flattenScalarFields(result);
    if (scalarRows.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Maydon", "Qiymat"]],
        body: scalarRows,
        styles: { font: "helvetica", fontSize: 8 },
        headStyles: { fillColor: [34, 44, 59] },
      });
      // @ts-expect-error - jspdf-autotable extends doc with lastAutoTable at runtime
      y = (doc.lastAutoTable?.finalY ?? y) + 4;
    }

    const rowsEntry = Object.entries(result).find(
      (entry): entry is [string, Record<string, unknown>[]] =>
        Array.isArray(entry[1]) && entry[1].length > 0 && typeof entry[1][0] === "object",
    );
    if (rowsEntry) {
      const [, rows] = rowsEntry;
      const columns = Object.keys(rows[0]);
      autoTable(doc, {
        startY: y,
        head: [columns],
        body: rows.map((row) => columns.map((c) => String(row[c] ?? ""))),
        styles: { font: "helvetica", fontSize: 7 },
        headStyles: { fillColor: [34, 44, 59] },
      });
      // @ts-expect-error - jspdf-autotable extends doc with lastAutoTable at runtime
      y = (doc.lastAutoTable?.finalY ?? y) + 8;
    }
  }

  return { blob: finalizePdf(doc), filename: `ai_javob_${tashkentDateKey(now)}_${Date.now()}.pdf` };
}

const CUSTOMER_TYPE_TITLE: Record<Receipt["customerType"], string> = {
  oddiy: "Oddiy",
  nasiya: "Nasiya",
};

/** Bitta sotuv (oddiy yoki nasiya) cheki — savdo yakunlanganda avtomatik yuboriladi. */
export function buildReceiptPdf(receipt: Receipt): GeneratedPdf {
  const pageWidth = 80;
  const doc = new jsPDF({ unit: "mm", format: [pageWidth, 200] });

  let y = 8;
  doc.setFontSize(12);
  doc.text("UZKO SAVDO", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9);
  doc.text(`Chek № ${receipt.id}`, pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.text(new Date(receipt.date).toLocaleString("uz-UZ"), pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(8);
  doc.text(`Kassir: ${receipt.cashier}`, 5, y);
  y += 4;
  doc.text(
    `Mijoz: ${CUSTOMER_TYPE_TITLE[receipt.customerType]}${receipt.customerName ? ` — ${receipt.customerName}` : ""}`,
    5,
    y,
  );
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: 5, right: 5 },
    head: [["Tovar", "Soni", "Narx", "Summa"]],
    body: receipt.items.map((item) => [
      item.name,
      `${item.qty} ${item.unit}`,
      formatSom(item.price),
      formatSom(item.qty * item.price),
    ]),
    styles: { font: "helvetica", fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [34, 44, 59] },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { halign: "right", cellWidth: 14 },
      2: { halign: "right", cellWidth: 15 },
      3: { halign: "right", cellWidth: 16 },
    },
  });

  // @ts-expect-error - jspdf-autotable extends doc with lastAutoTable at runtime
  y = (doc.lastAutoTable?.finalY ?? y) + 5;

  doc.setFontSize(8);
  doc.text(`Oraliq summa: ${formatSom(receipt.subtotal)}`, 5, y);
  y += 4;
  if (receipt.discount > 0) {
    doc.text(`Skidka: -${formatSom(receipt.discount)}`, 5, y);
    y += 4;
  }
  doc.setFontSize(10);
  doc.text(`Jami: ${formatSom(receipt.total)}`, 5, y);
  y += 5;
  doc.setFontSize(8);

  if (receipt.customerType === "nasiya") {
    if (receipt.paidAmount) {
      doc.text(`To'langan: ${formatSom(receipt.paidAmount)}`, 5, y);
      y += 4;
    }
    if (receipt.debtAmount) {
      doc.text(`Qarzga yozildi: ${formatSom(receipt.debtAmount)}`, 5, y);
      y += 4;
    }
  } else if (receipt.paymentBreakdown) {
    const pb = receipt.paymentBreakdown;
    if (pb.cash > 0) {
      doc.text(`Naqd: ${formatSom(pb.cash)}`, 5, y);
      y += 4;
    }
    if (pb.card > 0) {
      doc.text(`Karta: ${formatSom(pb.card)}`, 5, y);
      y += 4;
    }
    if (pb.transfer) {
      doc.text(`O'tkazma: ${formatSom(pb.transfer)}`, 5, y);
      y += 4;
    }
    if (pb.wallet) {
      doc.text(`Hamyon: ${formatSom(pb.wallet)}`, 5, y);
      y += 4;
    }
  }

  return {
    blob: doc.output("blob"),
    filename: `chek_${receipt.id}.pdf`,
  };
}
