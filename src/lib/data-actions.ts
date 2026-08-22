import {
  MOCK_CREDIT_CUSTOMERS,
  MOCK_DEBT_PAYMENTS,
  MOCK_EDIT_HISTORY,
  MOCK_ONE_TIME_ITEMS,
  MOCK_PRODUCTS,
  MOCK_PRODUCT_HISTORY,
  MOCK_RECEIPT_DISPATCHES,
  MOCK_RECEIPTS,
  MOCK_REGULAR_CUSTOMERS,
  MOCK_STOCK_COUNTS,
  MOCK_STOCK_COUNT_EDITS,
  MOCK_SUPPLIER_REPORTS,
  costInSom,
  nextAgentId,
  type CreditCustomer,
  type CustomerDebtReceipt,
  type CustomerType,
  type DebtPayment,
  type Product,
  type ReceiptDispatchLog,
  type Receipt,
  type ReceiptItem,
  type RegularCustomer,
  type StockCount,
  type StockCountEdit,
  type StockCountLine,
  type StockCountScope,
  type SupplierReport,
} from "@/lib/mock-data";

export type DebtPaymentInput = {
  customer: CreditCustomer;
  amount: number;
  cashier?: string;
  method: DebtPayment["method"];
  cardType?: string;
  currencyCode?: string;
  note?: string;
  methodLabel?: string;
};

export type AddSaleReceiptInput = {
  cashier: string;
  customerType: CustomerType;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount?: number;
  debtAmount?: number;
  paymentBreakdown?: Receipt["paymentBreakdown"];
};

export function fullCustomerName(customer: CreditCustomer) {
  return `${customer.firstName} ${customer.lastName}`;
}

export function searchCreditCustomers(query: string, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MOCK_CREDIT_CUSTOMERS.filter((customer) =>
    `${customer.id} ${customer.firstName} ${customer.lastName} ${customer.phone ?? ""}`
      .toLowerCase()
      .includes(q),
  ).slice(0, limit);
}

export function searchRegularCustomers(query: string, limit = 8) {
  const q = normalizeSearch(query);
  if (!q) return [];
  return MOCK_REGULAR_CUSTOMERS.filter((customer) =>
    `${customer.id} ${customer.firstName} ${customer.lastName} ${customer.phone}`
      .toLowerCase()
      .includes(q),
  ).slice(0, limit);
}

export function upsertRegularCustomer(input: {
  firstName: string;
  lastName: string;
  phone: string;
}) {
  const phone = normalizePhone(input.phone);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const existing = MOCK_REGULAR_CUSTOMERS.find(
    (customer) => normalizePhone(customer.phone) === phone,
  );

  if (existing) {
    existing.firstName = firstName || existing.firstName;
    existing.lastName = lastName || existing.lastName;
    existing.phone = input.phone.trim();
    existing.lastReceiptAt = new Date().toISOString();
    return existing;
  }

  const created: RegularCustomer = {
    id: `rc-${Date.now()}`,
    firstName,
    lastName,
    phone: input.phone.trim(),
    createdAt: new Date().toISOString(),
    lastReceiptAt: new Date().toISOString(),
  };
  MOCK_REGULAR_CUSTOMERS.unshift(created);
  return created;
}

export function addCreditCustomer(customer: CreditCustomer) {
  MOCK_CREDIT_CUSTOMERS.push(customer);
  return customer;
}

export function addSaleReceipt(input: AddSaleReceiptInput) {
  const date = new Date().toISOString();
  const receipt: Receipt = {
    id: nextReceiptId(),
    date,
    cashier: input.cashier,
    customerType: input.customerType,
    customerId: input.customerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    items: input.items,
    subtotal: input.subtotal,
    discount: input.discount,
    total: input.total,
    paidAmount: input.paidAmount,
    debtAmount: input.debtAmount,
    paymentBreakdown: input.paymentBreakdown,
  };

  MOCK_RECEIPTS.unshift(receipt);

  const oneTimeItems = input.items.filter((item) => item.source === "one-time");
  if (oneTimeItems.length > 0) {
    MOCK_ONE_TIME_ITEMS.unshift({
      id: nextOneTimeHistoryId(),
      date,
      receiptId: receipt.id,
      cashier: input.cashier,
      items: oneTimeItems.map((item) => ({
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        price: item.price,
        note: item.note,
      })),
      total: oneTimeItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    });
  }

  return receipt;
}

export function addCreditSale(
  customer: CreditCustomer,
  amount: number,
  options: {
    note?: string;
    dueDate?: string;
    paidAmount?: number;
    objectId?: string;
    objectName?: string;
    paymentLabel?: string;
  } = {},
) {
  const paidAmount = Math.min(Math.max(0, options.paidAmount ?? 0), amount);
  const debtAmount = Math.max(0, amount - paidAmount);
  const note = options.note?.trim() || "Savdo oynasidan qo'shildi";
  customer.currentDebt += debtAmount;
  if (debtAmount > 0 && options.objectId) {
    const objectDebt =
      customer.objects?.find((item) => item.id === options.objectId) ?? null;
    if (objectDebt) objectDebt.debt += debtAmount;
  }
  if (options.dueDate) customer.dueDate = options.dueDate;
  customer.receipts = customer.receipts ?? [];
  const noteParts = [note];
  if (paidAmount > 0) {
    noteParts.push(
      `${options.paymentLabel ?? "Hozir berildi"}: ${formatPlainSom(paidAmount)}`,
    );
  }
  if (options.dueDate) noteParts.push(`Muddat: ${options.dueDate}`);
  if (options.objectName) noteParts.push(`Obyekt: ${options.objectName}`);
  const receipt: CustomerDebtReceipt = {
    id: `N-${Date.now()}`,
    date: new Date().toISOString(),
    type: "sale",
    title: "Nasiya savdo",
    objectId: options.objectId,
    objectName: options.objectName,
    items: [
      { name: "Sotuv cheki", qty: 1, unit: "", amount },
      ...(paidAmount > 0
        ? [{ name: "Hozir berilgan", qty: 1, unit: "", amount: -paidAmount }]
        : []),
    ],
    amount: debtAmount,
    paidAmount,
    debtAmount,
    status: debtAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
    note: noteParts.join(" · "),
  };
  customer.receipts.unshift(receipt);
  if (customer.botEnabled) {
    dispatchReceiptMessage({
      recipientCategory: "nasiya",
      recipientId: customer.id,
      recipientName: fullCustomerName(customer),
      phone: customer.phone,
      receiptId: receipt.id,
      title: receipt.title,
      total: receipt.amount,
      note: receipt.note,
    });
  }
  return receipt;
}

export function recordDebtPayment(input: DebtPaymentInput) {
  const amount = Math.max(0, input.amount);
  const customer = input.customer;
  const remainingDebt = Math.max(0, customer.currentDebt - amount);
  const payment: DebtPayment = {
    id: `DP-${Date.now()}`,
    date: new Date().toISOString(),
    cashier: input.cashier ?? "Joriy foydalanuvchi",
    customerId: customer.id,
    customerName: fullCustomerName(customer),
    amount,
    method: input.method,
    cardType: input.cardType,
    currencyCode: input.currencyCode,
    note: input.note?.trim() || undefined,
  };

  MOCK_DEBT_PAYMENTS.push(payment);
  customer.currentDebt = remainingDebt;
  customer.receipts = customer.receipts ?? [];
  const debtReceipt: CustomerDebtReceipt = {
    id: `QS-${Date.now()}`,
    date: payment.date,
    type: "payment",
    title: "Qarz so'ndirish",
    items: [],
    amount: -amount,
    status: "paid",
    note: `${input.methodLabel ?? paymentLabel(payment)}${input.note?.trim() ? ` · ${input.note.trim()}` : ""}`,
  };
  customer.receipts.unshift(debtReceipt);

  updateDebtReceiptStatuses(customer);
  if (customer.botEnabled) {
    dispatchReceiptMessage({
      recipientCategory: "nasiya",
      recipientId: customer.id,
      recipientName: fullCustomerName(customer),
      phone: customer.phone,
      receiptId: debtReceipt.id,
      title: debtReceipt.title,
      total: Math.abs(debtReceipt.amount),
      note: debtReceipt.note,
    });
  }
  return { payment, remainingDebt };
}

export function applyDebtReturn(
  customer: CreditCustomer,
  amount: number,
  receipt: CustomerDebtReceipt,
) {
  customer.currentDebt = Math.max(0, customer.currentDebt - amount);
  customer.receipts = customer.receipts ?? [];
  customer.receipts.unshift(receipt);
  updateDebtReceiptStatuses(customer);
}

export function updateDebtReceiptStatuses(customer: CreditCustomer) {
  customer.receipts = customer.receipts ?? [];
  if (customer.currentDebt <= 0) {
    customer.receipts.forEach((receipt) => {
      if (receipt.type === "sale") receipt.status = "paid";
    });
    return;
  }

  customer.receipts.forEach((receipt) => {
    if (receipt.type === "sale" && receipt.status !== "paid") receipt.status = "partial";
  });
}

export function dispatchRegularSaleReceipt(
  receipt: Receipt,
  customer: Pick<RegularCustomer, "id" | "firstName" | "lastName" | "phone">,
) {
  return dispatchReceiptMessage({
    recipientCategory: "oddiy",
    recipientId: customer.id,
    recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
    phone: customer.phone,
    receiptId: receipt.id,
    title: "Oddiy xaridor cheki",
    total: receipt.total,
    note: receipt.customerName,
  });
}

export function dispatchSupplierReceipt(input: {
  report: Pick<
    SupplierReport,
    "agentId" | "agentName" | "agentPhone" | "totalAmount" | "paidAmount" | "remainingDebt"
  >;
  receiptId?: string;
  note?: string;
}) {
  return dispatchReceiptMessage({
    recipientCategory: "agent",
    recipientId: input.report.agentId,
    recipientName: input.report.agentName,
    phone: input.report.agentPhone,
    receiptId: input.receiptId ?? `AGENT-${Date.now()}`,
    title: "Agent hisob-kitob cheki",
    total: input.report.totalAmount,
    note:
      `Berilgan: ${formatPlainSom(input.report.paidAmount)} · ` +
      `Qoldiq: ${formatPlainSom(input.report.remainingDebt)}` +
      (input.note ? ` · ${input.note}` : ""),
  });
}

export function recordSupplierReturn(input: {
  cashier?: string;
  agentId: string;
  agentName: string;
  agentPhone?: string;
  items: { productName: string; qty: number; unit: string; amount: number }[];
  totalAmount: number;
  note?: string;
  vehicleName?: string;
  vehiclePlate?: string;
  driverName?: string;
  driverPhone?: string;
}) {
  const botEnabled = MOCK_SUPPLIER_REPORTS.some(
    (report) => report.agentId === input.agentId && Boolean(report.botEnabled),
  );

  const report: SupplierReport = {
    id: `sr-return-${Date.now()}`,
    date: new Date().toISOString(),
    addedBy: input.cashier ?? "Joriy foydalanuvchi",
    type: "return",
    agentId: input.agentId,
    agentName: input.agentName,
    agentPhone: input.agentPhone ?? "",
    botEnabled,
    items: input.items,
    totalAmount: -Math.abs(input.totalAmount),
    paidAmount: 0,
    remainingDebt: -Math.abs(input.totalAmount),
    note: `Tovar qaytarish${input.note?.trim() ? ` · ${input.note.trim()}` : ""}`,
    vehicleName: input.vehicleName?.trim() || undefined,
    vehiclePlate: input.vehiclePlate?.trim() || undefined,
    driverName: input.driverName?.trim() || undefined,
    driverPhone: input.driverPhone?.trim() || undefined,
  };

  MOCK_SUPPLIER_REPORTS.unshift(report);
  return report;
}

export type SupplierSource = {
  enabled: boolean;
  agentId: string;
  agentName: string;
  agentPhone: string;
  paidAmount: string;
  note: string;
  sendBotUpdate: boolean;
};

/**
 * Tovar qabuli tarixiga yozuv qo'shadi va agent ko'rsatilgan bo'lsa, unga
 * qarz sifatida `MOCK_SUPPLIER_REPORTS` ga yozuv qo'shadi.
 */
export function recordProductAddition(input: {
  productName: string;
  qty: number;
  unit: string;
  price: number;
  costPrice: number;
  warehouse: string;
  shelfLocation?: string;
  addedBy: string;
  source?: SupplierSource;
}) {
  const sourceEnabled = Boolean(input.source?.enabled && input.source.agentName.trim());
  const totalAmount = input.qty * input.costPrice;
  const paidAmount = sourceEnabled ? Math.max(0, Number(input.source?.paidAmount) || 0) : undefined;
  MOCK_PRODUCT_HISTORY.unshift({
    id: `ph${Date.now()}-${Math.random()}`,
    date: new Date().toISOString(),
    addedBy: input.addedBy,
    productName: input.productName,
    qty: input.qty,
    unit: input.unit,
    price: input.price,
    costPrice: input.costPrice,
    warehouse: input.warehouse,
    shelfLocation: input.shelfLocation,
    agentName: sourceEnabled ? input.source?.agentName.trim() : undefined,
    agentId: sourceEnabled ? input.source?.agentId || nextAgentId() : undefined,
    agentPhone: sourceEnabled ? input.source?.agentPhone.trim() : undefined,
    paidAmount,
    remainingDebt: sourceEnabled ? Math.max(0, totalAmount - (paidAmount ?? 0)) : undefined,
    totalAmount: sourceEnabled ? totalAmount : undefined,
    note: sourceEnabled ? input.source?.note.trim() : undefined,
  });
  if (input.source?.enabled && input.source.agentName.trim()) {
    MOCK_SUPPLIER_REPORTS.unshift({
      id: `sr${Date.now()}-${Math.random()}`,
      date: new Date().toISOString(),
      addedBy: input.addedBy,
      agentId: input.source.agentId || nextAgentId(),
      agentName: input.source.agentName.trim(),
      agentPhone: input.source.agentPhone.trim(),
      botEnabled: input.source.sendBotUpdate,
      items: [
        { productName: input.productName, qty: input.qty, unit: input.unit, amount: totalAmount },
      ],
      totalAmount,
      paidAmount: paidAmount ?? 0,
      remainingDebt: Math.max(0, totalAmount - (paidAmount ?? 0)),
      note: input.source.note.trim(),
    });
  }
}

export type MergeProductsWithAgentInput = {
  products: Product[];
  agentId?: string;
  agentName: string;
  agentPhone?: string;
  botEnabled?: boolean;
  /**
   * "current-stock" — joriy qoldiq tan narxda hisoblanib, agentga qarz sifatida yoziladi.
   * "zero-debt" — qarzsiz birlashtiriladi, faqat keyingi qabullardan boshlab qarz hisoblanadi.
   */
  mode: "current-stock" | "zero-debt";
  addedBy: string;
  note?: string;
};

/**
 * Tanlangan tovarlarni bitta agentga bog'laydi. `current-stock` rejimida joriy
 * qoldiq tan narxi bo'yicha agentga qarz yoziladi; `zero-debt` rejimida qarz
 * 0 dan boshlanadi — biroq tovar tarixiga agent yozilgani uchun shu tovar
 * keyingi safar qabul qilinganda (TovarQoshish) agent avtomatik aniqlanib,
 * o'sha qabuldan boshlab qarz hisoblana boshlaydi.
 */
export function mergeProductsWithAgent(input: MergeProductsWithAgentInput) {
  const date = new Date().toISOString();
  const agentId = input.agentId || nextAgentId();
  const agentName = input.agentName.trim();
  const agentPhone = input.agentPhone?.trim() ?? "";
  const isDebtMode = input.mode === "current-stock";

  const items: { productName: string; qty: number; unit: string; amount: number }[] = [];
  let totalAmount = 0;

  input.products.forEach((product) => {
    const qty = product.vitrinaQty + product.omborQty;
    const costPrice = costInSom(product);
    const amount = qty * costPrice;
    const paidAmount = isDebtMode ? 0 : amount;
    const remainingDebt = isDebtMode ? amount : 0;
    totalAmount += amount;
    items.push({ productName: product.name, qty, unit: product.unit, amount });

    MOCK_PRODUCT_HISTORY.unshift({
      id: `ph-merge-${Date.now()}-${product.id}`,
      date,
      addedBy: input.addedBy,
      productName: product.name,
      qty,
      unit: product.unit,
      price: product.price,
      costPrice,
      warehouse: product.warehouse,
      shelfLocation: product.shelfLocation,
      agentName,
      agentId,
      agentPhone,
      paidAmount,
      remainingDebt,
      totalAmount: amount,
      note:
        input.note?.trim() ||
        (isDebtMode
          ? "Joriy qoldiq bo'yicha agentga birlashtirildi"
          : "0 qarz bilan agentga birlashtirildi"),
    });
  });

  const report: SupplierReport = {
    id: `sr-merge-${Date.now()}`,
    date,
    addedBy: input.addedBy,
    agentId,
    agentName,
    agentPhone,
    botEnabled: Boolean(input.botEnabled),
    items,
    totalAmount,
    paidAmount: isDebtMode ? 0 : totalAmount,
    remainingDebt: isDebtMode ? totalAmount : 0,
    note:
      input.note?.trim() ||
      (isDebtMode
        ? "Tovarlar joriy qoldiq bo'yicha agentga birlashtirildi"
        : "Tovarlar 0 qarz bilan agentga birlashtirildi"),
  };

  MOCK_SUPPLIER_REPORTS.unshift(report);
  return report;
}

export type ApplyStockCountInput = {
  /** Sessiya boshida `nextStockCountId()` bilan olingan hujjat raqami. */
  id: string;
  countedBy: string;
  scope: StockCountScope;
  scopeValue?: string;
  note?: string;
  lines: StockCountLine[];
};

/**
 * Sanoq natijasini qo'llaydi: sanalgan tovarlarning qoldig'ini haqiqiy songa
 * tenglashtiradi, har bir farq uchun tarixga yozuv qo'yadi va sanoq hujjatini
 * saqlaydi. `countedQty === null` bo'lgan qatorlar sanalmagan hisoblanadi va
 * ularga tegilmaydi.
 */
export function applyStockCount(input: ApplyStockCountInput): StockCount {
  const date = new Date().toISOString();
  const counted = input.lines.filter((line) => line.countedQty !== null);

  counted.forEach((line) => {
    const product = MOCK_PRODUCTS.find((item) => item.id === line.productId);
    if (!product) return;
    const oldQty = product.vitrinaQty;
    const newQty = Math.max(0, Math.round(line.countedQty ?? 0));
    if (oldQty === newQty) return;

    product.vitrinaQty = newQty;

    MOCK_EDIT_HISTORY.unshift({
      id: `eh-sanoq-${Date.now()}-${line.productId}`,
      date,
      editedBy: input.countedBy,
      productName: product.name,
      oldQty,
      newQty,
      unit: product.unit,
      action: "sanoq",
      note: input.note?.trim() || undefined,
      changes: [{ field: "qty", label: "Miqdor", oldValue: oldQty, newValue: newQty }],
    });
  });

  const record: StockCount = {
    id: input.id,
    date,
    countedBy: input.countedBy,
    scope: input.scope,
    scopeValue: input.scopeValue,
    note: input.note?.trim() || undefined,
    lines: input.lines,
    ...stockCountTotals(input.lines),
  };

  MOCK_STOCK_COUNTS.unshift(record);
  return record;
}

/** Sanoq qatorlaridan jamlanma ko'rsatkichlarni hisoblaydi. */
export function stockCountTotals(lines: StockCountLine[]) {
  const counted = lines.filter((line) => line.countedQty !== null);
  const shortage = counted.filter((line) => line.diff < 0);
  const surplus = counted.filter((line) => line.diff > 0);
  const shortageAmount = shortage.reduce((sum, line) => sum + Math.abs(line.diffAmount), 0);
  const surplusAmount = surplus.reduce((sum, line) => sum + line.diffAmount, 0);

  return {
    totalLines: lines.length,
    countedLines: counted.length,
    matchedLines: counted.filter((line) => line.diff === 0).length,
    shortageQty: shortage.reduce((sum, line) => sum + Math.abs(line.diff), 0),
    surplusQty: surplus.reduce((sum, line) => sum + line.diff, 0),
    shortageAmount,
    surplusAmount,
    netAmount: surplusAmount - shortageAmount,
    countedValue: counted.reduce((sum, line) => sum + line.systemQty * line.costPrice, 0),
  };
}

export type EditStockCountInput = {
  record: StockCount;
  editedBy: string;
  note?: string;
  /** productId -> yangi haqiqiy son. `null` — sanalmagan holatiga qaytarish. */
  countedQtys: Record<string, number | null>;
};

/**
 * Yakunlangan sanoqni tuzatadi. Tovar qoldig'i **farq qadar** siljitiladi
 * (mutlaq qiymatga tenglashtirilmaydi), shuning uchun sanoqdan keyin bo'lgan
 * savdolar yo'qolmaydi. Har bir tuzatish alohida tarix yozuvi bo'lib qoladi.
 */
export function editStockCount(input: EditStockCountInput): StockCountEdit | null {
  const { record } = input;
  const date = new Date().toISOString();
  const changes: StockCountEdit["changes"] = [];

  record.lines.forEach((line) => {
    if (!(line.productId in input.countedQtys)) return;
    const raw = input.countedQtys[line.productId];
    const newCounted = raw === null ? null : Math.max(0, Math.round(raw));
    const oldCounted = line.countedQty;
    if (newCounted === oldCounted) return;

    // Qoldiqni faqat farq qadar siljitamiz.
    const stockDelta = (newCounted ?? line.systemQty) - (oldCounted ?? line.systemQty);
    const product = MOCK_PRODUCTS.find((item) => item.id === line.productId);

    if (product && stockDelta !== 0) {
      const oldQty = product.vitrinaQty;
      product.vitrinaQty = Math.max(0, oldQty + stockDelta);
      MOCK_EDIT_HISTORY.unshift({
        id: `eh-sanoq-edit-${Date.now()}-${line.productId}`,
        date,
        editedBy: input.editedBy,
        productName: product.name,
        oldQty,
        newQty: product.vitrinaQty,
        unit: product.unit,
        action: "sanoq",
        note: `${record.id} tahrirlandi${input.note?.trim() ? ` · ${input.note.trim()}` : ""}`,
        changes: [
          { field: "qty", label: "Miqdor", oldValue: oldQty, newValue: product.vitrinaQty },
        ],
      });
    }

    changes.push({
      productId: line.productId,
      productName: line.productName,
      unit: line.unit,
      oldCountedQty: oldCounted,
      newCountedQty: newCounted,
      stockDelta,
      amountDelta: stockDelta * line.costPrice,
    });

    line.countedQty = newCounted;
    line.diff = newCounted === null ? 0 : newCounted - line.systemQty;
    line.diffAmount = line.diff * line.costPrice;
  });

  if (changes.length === 0) return null;

  const oldNetAmount = record.netAmount;
  Object.assign(record, stockCountTotals(record.lines));
  record.editedAt = date;
  record.editCount = (record.editCount ?? 0) + 1;

  const edit: StockCountEdit = {
    id: `SNE-${Date.now()}`,
    stockCountId: record.id,
    date,
    editedBy: input.editedBy,
    note: input.note?.trim() || undefined,
    oldNetAmount,
    newNetAmount: record.netAmount,
    changes,
  };

  MOCK_STOCK_COUNT_EDITS.unshift(edit);
  return edit;
}

export function dispatchReceiptMessage(input: {
  recipientCategory: ReceiptDispatchLog["recipientCategory"];
  recipientId?: string;
  recipientName: string;
  phone?: string;
  receiptId: string;
  title: string;
  total: number;
  note?: string;
}) {
  const phone = input.phone?.trim();
  if (!phone) return null;
  const log: ReceiptDispatchLog = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    recipientCategory: input.recipientCategory,
    recipientId: input.recipientId,
    recipientName: input.recipientName,
    phone,
    receiptId: input.receiptId,
    title: input.title,
    total: input.total,
    note: input.note?.trim() || "Chek botga yuborildi",
  };
  MOCK_RECEIPT_DISPATCHES.unshift(log);
  return log;
}

function paymentLabel(payment: DebtPayment) {
  if (payment.method === "naqd") return "Naqd pul";
  if (payment.method === "karta") return `Karta (${payment.cardType ?? "karta"})`;
  return `Valyuta (${payment.currencyCode ?? "valyuta"})`;
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function nextReceiptId() {
  const max = MOCK_RECEIPTS.reduce((largest, receipt) => {
    const value = Number(receipt.id.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(largest, value) : largest;
  }, 100000);
  return `CHK-${max + 1}`;
}

/**
 * Yangi sanoq hujjati uchun unikal raqam: `SN-YYMMDD-NN`.
 * Sana prefiksi tufayli raqamlar kunlar orasida takrorlanmaydi, NN esa
 * o'sha kun ichidagi tartib raqami.
 */
export function nextStockCountId(now = new Date()) {
  const prefix = `SN-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const todayCount = MOCK_STOCK_COUNTS.filter((record) => record.id.startsWith(prefix)).length;
  return `${prefix}-${String(todayCount + 1).padStart(2, "0")}`;
}

function nextOneTimeHistoryId() {
  const max = MOCK_ONE_TIME_ITEMS.reduce((largest, record) => {
    const value = Number(record.id.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(largest, value) : largest;
  }, 0);
  return `BM-${String(max + 1).padStart(4, "0")}`;
}

function formatPlainSom(value: number) {
  return `${Math.round(value).toLocaleString("uz-UZ")} so'm`;
}
