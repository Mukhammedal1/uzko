import {
  MOCK_CREDIT_CUSTOMERS,
  MOCK_DEBT_PAYMENTS,
  MOCK_ONE_TIME_ITEMS,
  MOCK_RECEIPT_DISPATCHES,
  MOCK_RECEIPTS,
  MOCK_REGULAR_CUSTOMERS,
  type CreditCustomer,
  type CustomerDebtReceipt,
  type CustomerType,
  type DebtPayment,
  type ReceiptDispatchLog,
  type Receipt,
  type ReceiptItem,
  type RegularCustomer,
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
