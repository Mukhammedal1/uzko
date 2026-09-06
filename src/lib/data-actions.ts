import {
  MOCK_CREDIT_CUSTOMERS,
  MOCK_DEBT_PAYMENTS,
  MOCK_EDIT_HISTORY,
  MOCK_LOYAL_CUSTOMERS,
  MOCK_MONEY_OPERATIONS,
  MOCK_ONE_TIME_ITEMS,
  MOCK_PRODUCTS,
  MOCK_PRODUCT_HISTORY,
  MOCK_RECEIPT_DISPATCHES,
  MOCK_RECEIPTS,
  MOCK_REGULAR_CUSTOMERS,
  MOCK_STOCK_COUNTS,
  MOCK_STOCK_COUNT_EDITS,
  MOCK_SUPPLIER_REPORTS,
  MOCK_WITHDRAWALS,
  costInSom,
  nextAgentId,
  nextInvoiceNumber,
  type CreditCustomer,
  type CustomerDebtReceipt,
  type CustomerType,
  type DebtPayment,
  type MoneyOperation,
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

export function fullCustomerName(customer: { firstName: string; lastName: string }) {
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

export function searchLoyalCustomers(query: string, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MOCK_LOYAL_CUSTOMERS.filter((customer) =>
    `${customer.cardNumber} ${customer.id} ${customer.firstName} ${customer.lastName} ${customer.phone}`
      .toLowerCase()
      .includes(q),
  ).slice(0, limit);
}

export function findLoyalCustomerByCard(cardNumber: string) {
  const normalized = cardNumber.trim().toLowerCase();
  if (!normalized) return null;
  return MOCK_LOYAL_CUSTOMERS.find((c) => c.cardNumber.toLowerCase() === normalized) ?? null;
}

/** Savdo yakunlanganda sodiq mijozga cashback yozadi va xarid summasini yangilaydi. */
export function accrueLoyalCashback(customerId: string, saleTotal: number): number {
  const customer = MOCK_LOYAL_CUSTOMERS.find((c) => c.id === customerId);
  if (!customer || saleTotal <= 0) return 0;
  const earned = Math.round((saleTotal * customer.cashbackPercent) / 100);
  customer.cashbackBalance += earned;
  customer.totalSpent += saleTotal;
  return earned;
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
    const objectDebt = customer.objects?.find((item) => item.id === options.objectId) ?? null;
    if (objectDebt) objectDebt.debt += debtAmount;
  }
  if (options.dueDate) customer.dueDate = options.dueDate;
  customer.receipts = customer.receipts ?? [];
  const noteParts = [note];
  if (paidAmount > 0) {
    noteParts.push(`${options.paymentLabel ?? "Hozir berildi"}: ${formatPlainSom(paidAmount)}`);
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

export type MoneyOperationInput = {
  /** "nasiyachi" — mijoz bizga qarzdor (qarz so'ndirish); "agent" — biz agentga qarzdormiz (to'lov) */
  party: "nasiyachi" | "agent";
  partyId: string;
  partyName: string;
  partyPhone?: string;
  botEnabled?: boolean;
  amount: number;
  method: DebtPayment["method"];
  cardType?: string;
  currencyCode?: string;
  /** Faqat agent uchun: "kassa" — kassadan chiqim; "boshqa" — ixtiyoriy tashqi manba. */
  source?: "kassa" | "boshqa";
  note?: string;
  cashier?: string;
};

function agentRemainingDebt(agentId: string) {
  return MOCK_SUPPLIER_REPORTS.filter((report) => report.agentId === agentId).reduce(
    (sum, report) => sum + report.remainingDebt,
    0,
  );
}

function moneyMethodLabel(
  input: Pick<MoneyOperationInput, "method" | "cardType" | "currencyCode">,
) {
  if (input.method === "naqd") return "Naqd pul";
  if (input.method === "karta") return `Karta (${input.cardType ?? "karta"})`;
  return `Valyuta (${input.currencyCode ?? "valyuta"})`;
}

/**
 * Nasiyachi yoki agent bilan bitta pul operatsiyasini bajaradi:
 * tegishli qarz balansini yangilaydi, kassaga yozuv qo'shadi (chiqim/kirim),
 * shaxsning cheklar tarixiga yozadi va `MOCK_MONEY_OPERATIONS` ga saqlaydi.
 */
export function recordMoneyOperation(input: MoneyOperationInput) {
  const amount = Math.max(0, Math.round(input.amount));
  const cashier = input.cashier?.trim() || "Joriy foydalanuvchi";
  const date = new Date().toISOString();
  const note = input.note?.trim() || undefined;
  const methodLabel = moneyMethodLabel(input);
  // Nasiyachi to'lovi — kassaga kirim; agentga to'lov — chiqim.
  const direction: MoneyOperation["direction"] = input.party === "nasiyachi" ? "in" : "out";
  const source: MoneyOperation["source"] =
    input.party === "agent" ? (input.source ?? "kassa") : undefined;

  let balanceAfter = 0;

  if (input.party === "nasiyachi") {
    const customer = MOCK_CREDIT_CUSTOMERS.find((item) => item.id === input.partyId);
    if (customer) {
      customer.currentDebt = Math.max(0, customer.currentDebt - amount);
      balanceAfter = customer.currentDebt;
      customer.receipts = customer.receipts ?? [];
      customer.receipts.unshift({
        id: `QS-${Date.now()}`,
        date,
        type: "payment",
        title: "Qarz so'ndirish",
        items: [],
        amount: -amount,
        status: "paid",
        note: [methodLabel, note].filter(Boolean).join(" · "),
      });
      updateDebtReceiptStatuses(customer);
    }

    MOCK_DEBT_PAYMENTS.push({
      id: `DP-${Date.now()}`,
      date,
      cashier,
      customerId: input.partyId,
      customerName: input.partyName,
      amount,
      method: input.method,
      cardType: input.cardType,
      currencyCode: input.currencyCode,
      note,
    });
  } else {
    // agent — faqat to'lov (chiqim); bizning qarzimiz kamayadi
    MOCK_SUPPLIER_REPORTS.unshift({
      id: `sr-pay-${Date.now()}`,
      date,
      addedBy: cashier,
      type: "payment",
      agentId: input.partyId,
      agentName: input.partyName,
      agentPhone: input.partyPhone ?? "",
      botEnabled: Boolean(input.botEnabled),
      items: [],
      totalAmount: 0,
      paidAmount: amount,
      remainingDebt: -amount,
      note: ["To'lov", methodLabel, source === "boshqa" ? "Ixtiyoriy manba" : "Kassadan", note]
        .filter(Boolean)
        .join(" · "),
    });
    balanceAfter = agentRemainingDebt(input.partyId);

    if (source === "kassa") {
      MOCK_WITHDRAWALS.push({
        id: `WD-${Date.now()}`,
        date,
        cashier,
        category: "Agentlarga to'lov",
        cash: input.method === "naqd" ? amount : 0,
        cardAmount: input.method === "karta" ? amount : 0,
        currencies:
          input.method === "valyuta" ? [{ code: input.currencyCode ?? "USD", amount }] : [],
        note: [`Agent: ${input.partyName}`, note].filter(Boolean).join(" · "),
        agentId: input.partyId,
      });
    }
  }

  const operation: MoneyOperation = {
    id: `MO-${Date.now()}`,
    date,
    cashier,
    party: input.party,
    partyId: input.partyId,
    partyName: input.partyName,
    partyPhone: input.partyPhone,
    direction,
    source,
    amount,
    method: input.method,
    cardType: input.cardType,
    currencyCode: input.currencyCode,
    note,
    balanceAfter,
  };
  MOCK_MONEY_OPERATIONS.unshift(operation);

  if (input.botEnabled && input.partyPhone?.trim()) {
    dispatchReceiptMessage({
      recipientCategory: input.party === "nasiyachi" ? "nasiya" : "agent",
      recipientId: input.partyId,
      recipientName: input.partyName,
      phone: input.partyPhone,
      receiptId: operation.id,
      title: input.party === "nasiyachi" ? "Qarz so'ndirildi" : "Agentga to'lov",
      total: amount,
      note: [methodLabel, `Balans: ${formatPlainSom(balanceAfter)}`, note]
        .filter(Boolean)
        .join(" · "),
    });
  }

  return { operation, balanceAfter };
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
  const invoiceNumber = nextInvoiceNumber();
  MOCK_PRODUCT_HISTORY.unshift({
    id: `ph${Date.now()}-${Math.random()}`,
    invoiceNumber,
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
  return { invoiceNumber };
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
      invoiceNumber: nextInvoiceNumber(),
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
  /** true bo'lsa — farqlar zarar/foyda sifatida hisoblanmaydi, faqat
   * bazadagi qoldiq to'g'irlanadi (shortage/surplus/net summasi 0 yoziladi). */
  noLoss?: boolean;
};

/**
 * Sanoq natijasini qo'llaydi: sanalgan tovarlarning qoldig'ini haqiqiy songa
 * tenglashtiradi, har bir farq uchun tarixga yozuv qo'yadi va sanoq hujjatini
 * saqlaydi. `countedQty === null` bo'lgan qatorlar sanalmagan hisoblanadi va
 * ularga tegilmaydi. `noLoss` bo'lsa — qoldiq baribir to'g'irlanadi, lekin
 * hujjat moliyaviy zarar/foyda sifatida hisoblanmaydi (summalar 0 yoziladi).
 */
export function applyStockCount(input: ApplyStockCountInput): StockCount {
  const date = new Date().toISOString();
  const counted = input.lines.filter((line) => line.countedQty !== null);
  const noteSuffix = input.noLoss ? " (zararsiz to'g'irlash)" : "";

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
      note: input.note?.trim()
        ? `${input.note.trim()}${noteSuffix}`
        : input.noLoss
          ? "Zararsiz to'g'irlash"
          : undefined,
      changes: [{ field: "qty", label: "Miqdor", oldValue: oldQty, newValue: newQty }],
    });
  });

  const totals = stockCountTotals(input.lines);

  const record: StockCount = {
    id: input.id,
    date,
    countedBy: input.countedBy,
    scope: input.scope,
    scopeValue: input.scopeValue,
    note: input.note?.trim() || undefined,
    lines: input.lines,
    noLoss: input.noLoss || undefined,
    ...totals,
    ...(input.noLoss ? { shortageAmount: 0, surplusAmount: 0, netAmount: 0 } : {}),
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
