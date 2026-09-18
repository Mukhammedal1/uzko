/**
 * Admin Telegram bot uchun hisobot funksiyalari.
 *
 * MUHIM: shu fayldagi funksiyalar — UZKO'dagi YAGONA "ma'lumot manbai". Bot
 * tugmalari, kelajakdagi AI chat tool'lari va PDF generatorlari FAQAT shu
 * funksiyalarni chaqirishi kerak (hech qachon o'zi alohida hisoblamasligi
 * kerak) — shu orqali bir xil davr/filtr uchun raqamlar hamma joyda 100% bir
 * xil bo'lishi kafolatlanadi (docs/schema-mapping.md'dagi qabul mezoni).
 *
 * Hozircha real backend/PostgreSQL yo'q — UZKO to'liq frontend-only ilova,
 * shuning uchun bu funksiyalar `mock-data.ts`dagi massivlarni "baza" sifatida
 * ishlatadi (read-only). Kelajakda haqiqiy backend qo'shilsa, shu fayl ichini
 * SQL so'rovlarga almashtirish kifoya — tashqi signature (kirish/chiqish
 * shakli) o'zgarmasligi kerak.
 */
import {
  MOCK_CREDIT_CUSTOMERS,
  MOCK_DEBT_PAYMENTS,
  MOCK_PRODUCTS,
  MOCK_RECEIPTS,
  MOCK_WITHDRAWALS,
  MOCK_CASH_CLOSES,
  type CreditCustomer,
  type Product,
  type Receipt,
} from "@/lib/mock-data";
import { tashkentDateKey } from "./period";

// ─── Umumiy yordamchilar ─────────────────────────────────────────────────────

function inRange(dateIso: string, start: Date, end: Date): boolean {
  const t = new Date(dateIso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

/**
 * Nasiya savdo ta'rifi: to'langan summa < umumiy summa (debtAmount > 0).
 * Qisman to'langan nasiya ham shu guruhga kiradi — to'langan qismi paidTotal'ga qo'shiladi.
 */
function receiptDebt(receipt: Receipt): number {
  return receipt.debtAmount ?? 0;
}

function receiptPaid(receipt: Receipt): number {
  return receipt.paidAmount ?? receipt.total - receiptDebt(receipt);
}

function isCreditReceipt(receipt: Receipt): boolean {
  return receiptDebt(receipt) > 0;
}

export type SaleType = "all" | "paid" | "credit";

function matchesSaleType(receipt: Receipt, saleType: SaleType): boolean {
  if (saleType === "all") return true;
  return saleType === "credit" ? isCreditReceipt(receipt) : !isCreditReceipt(receipt);
}

function productById(productId: string): Product | undefined {
  return MOCK_PRODUCTS.find((p) => p.id === productId);
}

function receiptsInRange(start: Date, end: Date, saleType: SaleType = "all"): Receipt[] {
  return MOCK_RECEIPTS.filter((r) => inRange(r.date, start, end) && matchesSaleType(r, saleType));
}

function receiptProfit(receipt: Receipt): number {
  return receipt.items.reduce((sum, item) => {
    const cost = productById(item.productId)?.costPrice ?? 0;
    return sum + (item.price - cost) * item.qty;
  }, 0);
}

function stockQty(product: Product): number {
  return (product.vitrinaQty ?? 0) + (product.omborQty ?? 0);
}

/**
 * Chat/AI tool javoblari qisqa (odatda 50 qatorgacha) bo'ladi, lekin PDF
 * hisobot chaqiruvi limitni ko'targan bo'lishi mumkin (spec: "5000 qatorgacha").
 * Shu sababli funksiyalar ichidagi qattiq chegara (50/200) emas, shu umumiy
 * xavfsizlik chegarasi qo'llaniladi.
 */
const MAX_REPORT_ROWS = 5000;

function fullCustomerName(customer: { firstName: string; lastName: string }): string {
  return `${customer.firstName} ${customer.lastName}`.trim();
}

function maskPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-4)}` : phone;
}

// ─── 1. get_sales_summary ────────────────────────────────────────────────────

export type SalesSummary = {
  total: number;
  paidTotal: number;
  creditTotal: number;
  creditCount: number;
  receiptsCount: number;
  avgReceipt: number;
  /** Faqat "owner" rolida ko'rsatilishi kerak — auth qatlami (2-bosqich) buni olib tashlaydi. */
  profit: number;
};

export function getSalesSummary(start: Date, end: Date, saleType: SaleType = "all"): SalesSummary {
  const receipts = receiptsInRange(start, end, saleType);
  let total = 0;
  let paidTotal = 0;
  let creditTotal = 0;
  let creditCount = 0;
  let profit = 0;

  for (const receipt of receipts) {
    total += receipt.total;
    paidTotal += receiptPaid(receipt);
    const debt = receiptDebt(receipt);
    if (debt > 0) {
      creditTotal += debt;
      creditCount += 1;
    }
    profit += receiptProfit(receipt);
  }

  return {
    total,
    paidTotal,
    creditTotal,
    creditCount,
    receiptsCount: receipts.length,
    avgReceipt: receipts.length > 0 ? Math.round(total / receipts.length) : 0,
    profit,
  };
}

// ─── 2. get_sales_list ───────────────────────────────────────────────────────

export type SalesListRow = {
  date: string;
  receiptNo: string;
  customer: string;
  total: number;
  paid: number;
  debt: number;
};

export function getSalesList(
  start: Date,
  end: Date,
  saleType: SaleType = "all",
  options: { customerId?: string; limit?: number } = {},
): { rows: SalesListRow[]; totalCount: number } {
  const limit = Math.min(options.limit ?? 50, MAX_REPORT_ROWS);
  let receipts = receiptsInRange(start, end, saleType);
  if (options.customerId) {
    receipts = receipts.filter((r) => r.customerId === options.customerId);
  }
  const rows = receipts.slice(0, limit).map((r) => ({
    date: r.date,
    receiptNo: r.id,
    customer: r.customerName ?? "Oddiy mijoz",
    total: r.total,
    paid: receiptPaid(r),
    debt: receiptDebt(r),
  }));
  return { rows, totalCount: receipts.length };
}

// ─── 3. get_top_products ─────────────────────────────────────────────────────

export type TopProductRow = { name: string; qty: number; unit: string; revenue: number; profit: number };

export function getTopProducts(
  start: Date,
  end: Date,
  options: { sortBy?: "qty" | "revenue" | "profit"; order?: "asc" | "desc"; limit?: number } = {},
): TopProductRow[] {
  const sortBy = options.sortBy ?? "revenue";
  const order = options.order ?? "desc";
  const limit = Math.min(options.limit ?? 20, 20);

  const byProduct = new Map<string, TopProductRow>();
  for (const receipt of receiptsInRange(start, end)) {
    for (const item of receipt.items) {
      const cost = productById(item.productId)?.costPrice ?? 0;
      const existing = byProduct.get(item.productId) ?? {
        name: item.name,
        qty: 0,
        unit: item.unit,
        revenue: 0,
        profit: 0,
      };
      existing.qty += item.qty;
      existing.revenue += item.price * item.qty;
      existing.profit += (item.price - cost) * item.qty;
      byProduct.set(item.productId, existing);
    }
  }

  const rows = Array.from(byProduct.values());
  rows.sort((a, b) => (order === "desc" ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]));
  return rows.slice(0, limit);
}

// ─── 4. get_cash_summary ─────────────────────────────────────────────────────

export type CashSummary = {
  byPaymentType: { method: string; amount: number }[];
  debtPayments: number;
  expenses: number;
  /** Eng so'nggi kassa yopilishidagi qoldiq — davr ichida yopilish bo'lmasa null. */
  cashBalance: number | null;
};

export function getCashSummary(start: Date, end: Date): CashSummary {
  const byPaymentType = new Map<string, number>();
  const addAmount = (method: string, amount: number) => {
    if (amount <= 0) return;
    byPaymentType.set(method, (byPaymentType.get(method) ?? 0) + amount);
  };

  for (const receipt of receiptsInRange(start, end)) {
    const breakdown = receipt.paymentBreakdown;
    if (breakdown?.rows?.length) {
      for (const row of breakdown.rows) addAmount(row.methodName, row.amountSom);
    } else if (breakdown) {
      addAmount("Naqd", breakdown.cash);
      addAmount("Karta", breakdown.card);
      if (breakdown.transfer) addAmount("O'tkazma", breakdown.transfer);
      if (breakdown.wallet) addAmount("Elektron hamyon", breakdown.wallet);
    } else {
      addAmount("Naqd", receiptPaid(receipt));
    }
  }

  const debtPayments = MOCK_DEBT_PAYMENTS.filter((p) => inRange(p.date, start, end)).reduce(
    (sum, p) => sum + p.amount,
    0,
  );
  const expenses = MOCK_WITHDRAWALS.filter((w) => inRange(w.date, start, end)).reduce(
    (sum, w) => sum + w.cash + w.cardAmount,
    0,
  );

  const closesInRange = MOCK_CASH_CLOSES.filter((c) => inRange(c.date, start, end)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return {
    byPaymentType: Array.from(byPaymentType.entries()).map(([method, amount]) => ({
      method,
      amount,
    })),
    debtPayments,
    expenses,
    cashBalance: closesInRange[0]?.leftInRegister ?? null,
  };
}

// ─── 5. get_debts ────────────────────────────────────────────────────────────

export type DebtStatus = "all" | "overdue" | "paidToday";

export type DebtRow = {
  customerId: string;
  customer: string;
  debt: number;
  dueDate?: string;
  overdueDays: number;
};

export function getDebts(
  status: DebtStatus = "all",
  options: { sort?: "amount" | "overdueDays"; limit?: number; now?: Date } = {},
): { totalDebt: number; customersCount: number; rows: DebtRow[] } {
  const now = options.now ?? new Date();
  const todayKey = tashkentDateKey(now);
  const limit = Math.min(options.limit ?? 50, MAX_REPORT_ROWS);
  const sort = options.sort ?? "amount";

  const overdueDaysOf = (customer: CreditCustomer): number => {
    if (!customer.dueDate || customer.dueDate >= todayKey) return 0;
    const diffMs =
      new Date(`${todayKey}T00:00:00+05:00`).getTime() -
      new Date(`${customer.dueDate}T00:00:00+05:00`).getTime();
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  };

  let candidates = MOCK_CREDIT_CUSTOMERS.filter((c) => c.currentDebt > 0);

  if (status === "overdue") {
    candidates = candidates.filter((c) => overdueDaysOf(c) > 0);
  } else if (status === "paidToday") {
    const paidTodayIds = new Set(
      MOCK_DEBT_PAYMENTS.filter((p) => tashkentDateKey(new Date(p.date)) === todayKey).map(
        (p) => p.customerId,
      ),
    );
    candidates = MOCK_CREDIT_CUSTOMERS.filter((c) => paidTodayIds.has(c.id));
  }

  const totalDebt = candidates.reduce((sum, c) => sum + c.currentDebt, 0);

  const rows: DebtRow[] = candidates.map((c) => ({
    customerId: c.id,
    customer: fullCustomerName(c),
    debt: c.currentDebt,
    dueDate: c.dueDate,
    overdueDays: overdueDaysOf(c),
  }));

  rows.sort((a, b) => (sort === "amount" ? b.debt - a.debt : b.overdueDays - a.overdueDays));

  return { totalDebt, customersCount: candidates.length, rows: rows.slice(0, limit) };
}

// ─── 6. find_customer ────────────────────────────────────────────────────────

export type CustomerMatch = { id: string; name: string; phone: string; debt: number };

export function findCustomer(query: string, limit = 8): CustomerMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MOCK_CREDIT_CUSTOMERS.filter((c) =>
    `${fullCustomerName(c)} ${c.phone ?? ""}`.toLowerCase().includes(q),
  )
    .slice(0, limit)
    .map((c) => ({ id: c.id, name: fullCustomerName(c), phone: maskPhone(c.phone), debt: c.currentDebt }));
}

// ─── 7. get_customer_debt ────────────────────────────────────────────────────

export type CustomerDebtDetail = {
  customer: string;
  debt: number;
  lastPurchase?: string;
  lastPayment?: string;
  creditSales: { date: string; title: string; amount: number }[];
};

export function getCustomerDebt(customerId: string): CustomerDebtDetail | null {
  const customer = MOCK_CREDIT_CUSTOMERS.find((c) => c.id === customerId);
  if (!customer) return null;
  const receipts = customer.receipts ?? [];
  const lastPurchase = receipts
    .filter((r) => r.type === "sale")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;
  const lastPayment = receipts
    .filter((r) => r.type === "payment")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;

  return {
    customer: fullCustomerName(customer),
    debt: customer.currentDebt,
    lastPurchase,
    lastPayment,
    creditSales: receipts
      .filter((r) => r.type === "sale")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map((r) => ({ date: r.date, title: r.title, amount: r.amount })),
  };
}

// ─── 8. get_stock ────────────────────────────────────────────────────────────

export type StockFilter = "low" | "out" | "dead" | "all";

export type StockRow = {
  name: string;
  qty: number;
  unit: string;
  minQty?: number;
  daysLeft: number | null;
  lastSoldAt?: string;
  /** Faqat "owner" uchun (Sotilmayotgan tovarning muzlagan puli). */
  frozenValue?: number;
};

function averageDailySales(product: Product, windowDays: number): number {
  const history = product.salesHistory ?? [];
  const recent = history.slice(-windowDays);
  if (recent.length === 0) return 0;
  const totalQty = recent.reduce((sum, entry) => sum + entry.qty, 0);
  return totalQty / recent.length;
}

function lastSoldAt(product: Product): string | undefined {
  const history = product.salesHistory ?? [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].qty > 0) return history[i].date;
  }
  return undefined;
}

export function getStock(
  filter: StockFilter,
  options: { deadDays?: 7 | 14 | 30; category?: string; limit?: number } = {},
): { rows: StockRow[]; totalCount: number } {
  const deadDays = options.deadDays ?? 7;
  const limit = Math.min(options.limit ?? 50, MAX_REPORT_ROWS);

  let products = MOCK_PRODUCTS;
  if (options.category) {
    products = products.filter((p) => p.warehouse === options.category);
  }

  const rows: StockRow[] = products
    .map((p) => {
      const qty = stockQty(p);
      const avgDaily = averageDailySales(p, 14);
      const daysLeft = avgDaily > 0 ? qty / avgDaily : null;
      return {
        name: p.name,
        qty,
        unit: p.unit,
        minQty: p.minStockAlert,
        daysLeft,
        lastSoldAt: lastSoldAt(p),
        frozenValue: qty * p.costPrice,
        _isOut: qty <= 0,
        _isLow: qty > 0 && ((p.minStockAlert !== undefined && qty <= p.minStockAlert) || (daysLeft !== null && daysLeft < 3)),
        _isDead: qty > 0 && daysSinceLastSale(p) >= deadDays,
      };
    })
    .filter((row) => {
      if (filter === "out") return row._isOut;
      if (filter === "low") return row._isLow && !row._isOut;
      if (filter === "dead") return row._isDead;
      return true;
    })
    .map(({ _isOut, _isLow, _isDead, ...row }) => row);

  return { rows: rows.slice(0, limit), totalCount: rows.length };
}

function daysSinceLastSale(product: Product): number {
  const last = lastSoldAt(product);
  if (!last) return Infinity;
  const diffMs = Date.now() - new Date(`${last}T00:00:00+05:00`).getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

// ─── 9. find_product ─────────────────────────────────────────────────────────

export type ProductMatch = {
  name: string;
  barcode: string;
  qty: number;
  unit: string;
  price: number;
  lastSoldAt?: string;
};

export function findProduct(query: string, limit = 8): ProductMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MOCK_PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.barcode.includes(q) ||
      p.customCode.toLowerCase().includes(q),
  )
    .slice(0, limit)
    .map((p) => ({
      name: p.name,
      barcode: p.barcode,
      qty: stockQty(p),
      unit: p.unit,
      price: p.price,
      lastSoldAt: lastSoldAt(p),
    }));
}
