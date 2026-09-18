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

export type GeneratedPdf = { blob: Blob; filename: string };

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
