/**
 * AI chat (Gemini function calling) uchun tool'lar.
 *
 * MUHIM: LLM hech qachon SQL/hisob-kitob yozmaydi — faqat shu funksiyalarni
 * chaqiradi, ular esa faqat `reports.ts`ni ishlatadi (yagona ma'lumot manbai —
 * bot tugmalari, PDF va AI chat bir xil raqamlarni ko'rsatishi shu orqali
 * kafolatlanadi). Har bir tool `period_label / generated_at / row_count /
 * truncated` metama'lumotini qaytaradi (spec 6-bo'lim).
 */
import { percentChange, resolvePreviousPeriod, tashkentDayBounds } from "../period";
import {
  findCustomer,
  findProduct,
  getCashSummary,
  getCustomerDebt,
  getDebts,
  getSalesList,
  getSalesSummary,
  getStock,
  getTopProducts,
  type DebtStatus,
  type SaleType,
  type StockFilter,
} from "../reports";

// ─── Umumiy yordamchilar ─────────────────────────────────────────────────────

/** ISO "YYYY-MM-DD" (Toshkent kuni) dan davr oralig'ini hisoblaydi — date_to inklyuziv. */
function resolveDateRange(dateFrom: string, dateTo: string): { start: Date; end: Date; label: string } {
  const { start } = tashkentDayBounds(dateFrom);
  const { end } = tashkentDayBounds(dateTo);
  const label = dateFrom === dateTo ? dateFrom : `${dateFrom} – ${dateTo}`;
  return { start, end, label };
}

type ToolMeta = { period_label: string; generated_at: string; row_count: number; truncated: boolean };

function withMeta<T extends object>(
  data: T,
  meta: { periodLabel?: string; rowCount: number; truncated: boolean },
): T & ToolMeta {
  return {
    ...data,
    period_label: meta.periodLabel ?? "",
    generated_at: new Date().toISOString(),
    row_count: meta.rowCount,
    truncated: meta.truncated,
  };
}

/** Spec 6.1: har bir ro'yxat-qaytaruvchi tool'ning maksimal qator chegarasi. */
const MAX_ROWS = { list: 50, top: 20, debts: 50, stock: 50 } as const;

// ─── 1. get_sales_summary ────────────────────────────────────────────────────

export type SalesSummaryArgs = { date_from: string; date_to: string; sale_type?: SaleType };

function toolGetSalesSummary(args: SalesSummaryArgs) {
  const saleType = args.sale_type ?? "all";
  const range = resolveDateRange(args.date_from, args.date_to);
  const prevRange = resolvePreviousPeriod("custom", range);
  const summary = getSalesSummary(range.start, range.end, saleType);
  const prevSummary = getSalesSummary(prevRange.start, prevRange.end, saleType);

  return withMeta(
    {
      total: summary.total,
      paid_total: summary.paidTotal,
      credit_total: summary.creditTotal,
      credit_count: summary.creditCount,
      receipts: summary.receiptsCount,
      avg_receipt: summary.avgReceipt,
      profit: summary.profit,
      compare_prev: { total: prevSummary.total, pct: percentChange(summary.total, prevSummary.total) },
    },
    { periodLabel: range.label, rowCount: 1, truncated: false },
  );
}

// ─── 2. get_sales_list ───────────────────────────────────────────────────────

export type SalesListArgs = {
  date_from: string;
  date_to: string;
  sale_type?: SaleType;
  customer_id?: string;
  limit?: number;
};

function toolGetSalesList(args: SalesListArgs) {
  const range = resolveDateRange(args.date_from, args.date_to);
  const limit = Math.min(args.limit ?? MAX_ROWS.list, MAX_ROWS.list);
  const { rows, totalCount } = getSalesList(range.start, range.end, args.sale_type ?? "all", {
    customerId: args.customer_id,
    limit,
  });

  return withMeta(
    {
      rows: rows.map((r) => ({
        date: r.date,
        receipt_no: r.receiptNo,
        customer: r.customer,
        total: r.total,
        paid: r.paid,
        debt: r.debt,
      })),
      total_count: totalCount,
    },
    { periodLabel: range.label, rowCount: rows.length, truncated: rows.length < totalCount },
  );
}

// ─── 3. get_top_products ─────────────────────────────────────────────────────

export type TopProductsArgs = {
  date_from: string;
  date_to: string;
  sort_by?: "qty" | "revenue" | "profit";
  order?: "asc" | "desc";
  limit?: number;
};

function toolGetTopProducts(args: TopProductsArgs) {
  const range = resolveDateRange(args.date_from, args.date_to);
  const limit = Math.min(args.limit ?? MAX_ROWS.top, MAX_ROWS.top);
  const rows = getTopProducts(range.start, range.end, { sortBy: args.sort_by, order: args.order, limit });

  return withMeta(
    { rows: rows.map((r) => ({ name: r.name, qty: r.qty, unit: r.unit, revenue: r.revenue, profit: r.profit })) },
    { periodLabel: range.label, rowCount: rows.length, truncated: false },
  );
}

// ─── 4. get_cash_summary ─────────────────────────────────────────────────────

export type CashSummaryArgs = { date_from: string; date_to: string };

function toolGetCashSummary(args: CashSummaryArgs) {
  const range = resolveDateRange(args.date_from, args.date_to);
  const cash = getCashSummary(range.start, range.end);

  return withMeta(
    {
      by_payment_type: cash.byPaymentType.map((p) => ({ method: p.method, amount: p.amount })),
      debt_payments: cash.debtPayments,
      expenses: cash.expenses,
      cash_balance: cash.cashBalance,
    },
    { periodLabel: range.label, rowCount: cash.byPaymentType.length, truncated: false },
  );
}

// ─── 5. get_debts ────────────────────────────────────────────────────────────

export type GetDebtsArgs = {
  status?: "all" | "overdue" | "paid_today";
  sort?: "amount" | "overdue_days";
  limit?: number;
};

const DEBT_STATUS_MAP: Record<NonNullable<GetDebtsArgs["status"]>, DebtStatus> = {
  all: "all",
  overdue: "overdue",
  paid_today: "paidToday",
};

function toolGetDebts(args: GetDebtsArgs) {
  const limit = Math.min(args.limit ?? MAX_ROWS.debts, MAX_ROWS.debts);
  const { totalDebt, customersCount, rows } = getDebts(DEBT_STATUS_MAP[args.status ?? "all"], {
    sort: args.sort === "overdue_days" ? "overdueDays" : "amount",
    limit,
  });

  return withMeta(
    {
      total: totalDebt,
      customers_count: customersCount,
      rows: rows.map((r) => ({
        customer_id: r.customerId,
        customer: r.customer,
        debt: r.debt,
        due_date: r.dueDate,
        overdue_days: r.overdueDays,
      })),
    },
    { rowCount: rows.length, truncated: rows.length < customersCount },
  );
}

// ─── 6. find_customer ────────────────────────────────────────────────────────

export type FindCustomerArgs = { query: string };

function toolFindCustomer(args: FindCustomerArgs) {
  const matches = findCustomer(args.query);
  return withMeta({ matches }, { rowCount: matches.length, truncated: false });
}

// ─── 7. get_customer_debt ────────────────────────────────────────────────────

export type GetCustomerDebtArgs = { customer_id: string };

function toolGetCustomerDebt(args: GetCustomerDebtArgs) {
  const detail = getCustomerDebt(args.customer_id);
  if (!detail) return withMeta({ found: false }, { rowCount: 0, truncated: false });

  return withMeta(
    {
      found: true,
      debt: detail.debt,
      last_purchase: detail.lastPurchase,
      last_payment: detail.lastPayment,
      credit_sales: detail.creditSales,
    },
    { rowCount: detail.creditSales.length, truncated: false },
  );
}

// ─── 8. get_stock ────────────────────────────────────────────────────────────

export type GetStockArgs = {
  filter: StockFilter;
  dead_days?: 7 | 14 | 30;
  category?: string;
  limit?: number;
};

function toolGetStock(args: GetStockArgs) {
  const limit = Math.min(args.limit ?? MAX_ROWS.stock, MAX_ROWS.stock);
  const { rows, totalCount } = getStock(args.filter, {
    deadDays: args.dead_days,
    category: args.category,
    limit,
  });

  return withMeta(
    {
      rows: rows.map((r) => ({
        name: r.name,
        qty: r.qty,
        unit: r.unit,
        min_qty: r.minQty,
        days_left: r.daysLeft,
        last_sold_at: r.lastSoldAt,
        frozen_value: r.frozenValue,
      })),
    },
    { rowCount: rows.length, truncated: rows.length < totalCount },
  );
}

// ─── 9. find_product ─────────────────────────────────────────────────────────

export type FindProductArgs = { query: string };

function toolFindProduct(args: FindProductArgs) {
  const matches = findProduct(args.query).map((p) => ({
    name: p.name,
    barcode: p.barcode,
    qty: p.qty,
    unit: p.unit,
    price: p.price,
    last_sold_at: p.lastSoldAt,
  }));
  return withMeta({ matches }, { rowCount: matches.length, truncated: false });
}

// ─── Gemini function-calling deklaratsiyalari ────────────────────────────────

const DATE_PROPS = {
  date_from: { type: "STRING", description: "Davr boshlanishi, ISO sana (YYYY-MM-DD)" },
  date_to: { type: "STRING", description: "Davr tugashi, ISO sana (YYYY-MM-DD), inklyuziv" },
} as const;

/** Gemini `functionDeclarations` formatida — `agent.ts` shu ro'yxatni to'g'ridan-to'g'ri modelga uzatadi. */
export const TOOL_DECLARATIONS = [
  {
    name: "get_sales_summary",
    description: "Davr bo'yicha savdo xulosasi: jami, to'langan, nasiya, cheklar soni, foyda, oldingi davr bilan taqqoslash.",
    parameters: {
      type: "OBJECT",
      properties: {
        ...DATE_PROPS,
        sale_type: { type: "STRING", enum: ["all", "paid", "credit"], description: "Savdo turi bo'yicha filtr" },
      },
      required: ["date_from", "date_to"],
    },
  },
  {
    name: "get_sales_list",
    description: "Davr bo'yicha cheklar ro'yxati (sana, mijoz, summalar).",
    parameters: {
      type: "OBJECT",
      properties: {
        ...DATE_PROPS,
        sale_type: { type: "STRING", enum: ["all", "paid", "credit"] },
        customer_id: { type: "STRING", description: "Faqat shu mijozning cheklari" },
        limit: { type: "NUMBER", description: "Maksimal qatorlar soni (default 50, max 50)" },
      },
      required: ["date_from", "date_to"],
    },
  },
  {
    name: "get_top_products",
    description: "Davr bo'yicha eng ko'p sotilgan/eng foydali tovarlar.",
    parameters: {
      type: "OBJECT",
      properties: {
        ...DATE_PROPS,
        sort_by: { type: "STRING", enum: ["qty", "revenue", "profit"] },
        order: { type: "STRING", enum: ["desc", "asc"] },
        limit: { type: "NUMBER", description: "Default 20, max 20" },
      },
      required: ["date_from", "date_to"],
    },
  },
  {
    name: "get_cash_summary",
    description: "Davr bo'yicha kassa: to'lov turlari bo'yicha tushum, qarz to'lovlari, xarajatlar, naqd qoldiq.",
    parameters: { type: "OBJECT", properties: { ...DATE_PROPS }, required: ["date_from", "date_to"] },
  },
  {
    name: "get_debts",
    description: "Mijozlarning nasiya qarzlari ro'yxati va jami summasi.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", enum: ["all", "overdue", "paid_today"] },
        sort: { type: "STRING", enum: ["amount", "overdue_days"] },
        limit: { type: "NUMBER", description: "Default 50, max 50" },
      },
    },
  },
  {
    name: "find_customer",
    description: "Mijozni ism yoki telefon raqami bo'yicha qidiradi.",
    parameters: {
      type: "OBJECT",
      properties: { query: { type: "STRING", description: "Ism yoki telefon raqami" } },
      required: ["query"],
    },
  },
  {
    name: "get_customer_debt",
    description: "Bitta mijozning qarzi, oxirgi xaridi/to'lovi va nasiya savdolar tarixi.",
    parameters: {
      type: "OBJECT",
      properties: { customer_id: { type: "STRING" } },
      required: ["customer_id"],
    },
  },
  {
    name: "get_stock",
    description: "Ombordagi qoldiq: tugagan, tugayotgan, sotilmayotgan yoki barcha tovarlar.",
    parameters: {
      type: "OBJECT",
      properties: {
        filter: { type: "STRING", enum: ["low", "out", "dead", "all"] },
        dead_days: { type: "NUMBER", description: "Sotilmayotgan hisoblanadigan kunlar soni: 7, 14 yoki 30" },
        category: { type: "STRING" },
        limit: { type: "NUMBER", description: "Default 50, max 50" },
      },
      required: ["filter"],
    },
  },
  {
    name: "find_product",
    description: "Tovarni nomi yoki shtrix kodi bo'yicha qidiradi.",
    parameters: {
      type: "OBJECT",
      properties: { query: { type: "STRING", description: "Tovar nomi yoki shtrix kod" } },
      required: ["query"],
    },
  },
] as const;

export type ToolName = (typeof TOOL_DECLARATIONS)[number]["name"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOOL_HANDLERS: Record<ToolName, (args: any) => object> = {
  get_sales_summary: toolGetSalesSummary,
  get_sales_list: toolGetSalesList,
  get_top_products: toolGetTopProducts,
  get_cash_summary: toolGetCashSummary,
  get_debts: toolGetDebts,
  find_customer: toolFindCustomer,
  get_customer_debt: toolGetCustomerDebt,
  get_stock: toolGetStock,
  find_product: toolFindProduct,
};

/**
 * `agent.ts` shu funksiya orqali LLM so'ragan tool'ni chaqiradi. Noma'lum
 * tool nomi yoki ijro xatosi LLM'ga tushunarli xato ob'ekti sifatida
 * qaytariladi (throw qilinmaydi) — shunda model "ma'lumot yo'q" deb javob
 * berish o'rniga to'xtab qolmaydi.
 */
export function callTool(name: string, args: unknown): object {
  const handler = TOOL_HANDLERS[name as ToolName];
  if (!handler) return { error: `Noma'lum tool: ${name}` };
  try {
    return handler(args ?? {});
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tool ijrosida xato" };
  }
}
