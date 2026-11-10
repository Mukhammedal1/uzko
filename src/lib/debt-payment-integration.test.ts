import { beforeEach, describe, expect, it } from "vitest";
import { getOpenCustomerDebts, getOpenSupplierDebts, settleDebtPayment } from "./data-actions";
import {
  MOCK_CREDIT_CUSTOMERS,
  MOCK_PARTY_ADVANCES,
  MOCK_SUPPLIER_REPORTS,
  MOCK_WITHDRAWALS,
  type CreditCustomer,
  type SupplierReport,
} from "./mock-data";

function makeSupplierReport(overrides: Partial<SupplierReport>): SupplierReport {
  return {
    id: `sr-test-${Math.random()}`,
    date: new Date().toISOString(),
    addedBy: "test",
    type: "receipt",
    supplierId: "SUP-TEST",
    supplierName: "Test taminotchi",
    supplierPhone: "+998900000000",
    items: [{ productName: "Sement", qty: 10, unit: "dona", amount: 1_000_000 }],
    totalAmount: 1_000_000,
    paidAmount: 0,
    remainingDebt: 1_000_000,
    ...overrides,
  };
}

function makeCustomer(overrides: Partial<CreditCustomer>): CreditCustomer {
  return {
    id: "CUST-TEST",
    firstName: "Test",
    lastName: "Mijoz",
    phone: "+998900000001",
    role: "mijoz",
    limit: 0,
    currentDebt: 0,
    receipts: [],
    ...overrides,
  };
}

describe("settleDebtPayment — supplier integration", () => {
  beforeEach(() => {
    MOCK_SUPPLIER_REPORTS.length = 0;
    MOCK_WITHDRAWALS.length = 0;
    MOCK_PARTY_ADVANCES.length = 0;
  });

  it("ikkita qarzni ikki valyutada bir yo'la yopadi va kassa chiqimini yozadi", () => {
    MOCK_SUPPLIER_REPORTS.push(
      makeSupplierReport({ id: "sr-1", remainingDebt: 200 * 12_650, totalAmount: 200 * 12_650 }),
    );
    const openBefore = getOpenSupplierDebts("SUP-TEST");
    expect(openBefore).toHaveLength(1);
    expect(openBefore[0].amount).toBe(200 * 12_650);

    const result = settleDebtPayment({
      partyType: "supplier",
      partyId: "SUP-TEST",
      partyName: "Test taminotchi",
      moneyLines: [{ currency: "USD", amount: 300 }],
      rates: [],
      leftovers: [{ currency: "USD", action: "avans" }],
      outflowSource: "kassa",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalClosed).toBe(200 * 12_650);

    const report = MOCK_SUPPLIER_REPORTS.find((r) => r.id === "sr-1")!;
    expect(report.remainingDebt).toBe(0);
    expect(getOpenSupplierDebts("SUP-TEST")).toHaveLength(0);

    expect(MOCK_WITHDRAWALS).toHaveLength(1);
    expect(MOCK_WITHDRAWALS[0].currencies).toEqual([{ code: "USD", amount: 300 }]);

    expect(MOCK_PARTY_ADVANCES).toHaveLength(1);
    expect(MOCK_PARTY_ADVANCES[0]).toMatchObject({
      party: "yetkazib_beruvchi",
      partyId: "SUP-TEST",
      currency: "USD",
      amount: 100,
    });
  });

  it("qaytim tanlansa — kassadan faqat sarflangan summa chiqadi", () => {
    MOCK_SUPPLIER_REPORTS.push(
      makeSupplierReport({ id: "sr-2", remainingDebt: 200 * 12_650, totalAmount: 200 * 12_650 }),
    );
    settleDebtPayment({
      partyType: "supplier",
      partyId: "SUP-TEST",
      partyName: "Test taminotchi",
      moneyLines: [{ currency: "USD", amount: 300 }],
      rates: [],
      leftovers: [{ currency: "USD", action: "qaytim" }],
      outflowSource: "kassa",
    });
    expect(MOCK_WITHDRAWALS[0].currencies).toEqual([{ code: "USD", amount: 200 }]);
    expect(MOCK_PARTY_ADVANCES).toHaveLength(0);
  });

  it("tizimda kursi bo'lmagan valyuta uchun kurs berilmasa xato qaytaradi va mock-data o'zgarmaydi", () => {
    MOCK_SUPPLIER_REPORTS.push(makeSupplierReport({ id: "sr-3", remainingDebt: 1_000_000 }));
    const result = settleDebtPayment({
      partyType: "supplier",
      partyId: "SUP-TEST",
      partyName: "Test taminotchi",
      moneyLines: [{ currency: "XXX", amount: 10 }],
      rates: [],
      leftovers: [],
    });
    expect(result.ok).toBe(false);
    expect(MOCK_SUPPLIER_REPORTS.find((r) => r.id === "sr-3")!.remainingDebt).toBe(1_000_000);
  });
});

describe("settleDebtPayment — customer integration", () => {
  beforeEach(() => {
    MOCK_CREDIT_CUSTOMERS.length = 0;
    MOCK_PARTY_ADVANCES.length = 0;
  });

  it("belgilangan bitta qarzni (1-rejim) qisman yopadi va currentDebt'ni yangilaydi", () => {
    const customer = makeCustomer({
      currentDebt: 150_000,
      receipts: [
        {
          id: "QS-1",
          date: new Date().toISOString(),
          type: "sale",
          title: "Savdo 1",
          items: [],
          amount: 100_000,
          debtAmount: 100_000,
        },
        {
          id: "QS-2",
          date: new Date(Date.now() + 1000).toISOString(),
          type: "sale",
          title: "Savdo 2",
          items: [],
          amount: 50_000,
          debtAmount: 50_000,
        },
      ],
    });
    MOCK_CREDIT_CUSTOMERS.push(customer);

    const open = getOpenCustomerDebts("CUST-TEST");
    expect(open).toHaveLength(2);

    const result = settleDebtPayment({
      partyType: "customer",
      partyId: "CUST-TEST",
      partyName: "Test Mijoz",
      selectedDebtIds: ["QS-1"],
      moneyLines: [{ currency: "UZS", amount: 100_000 }],
      rates: [],
      leftovers: [],
    });

    expect(result.ok).toBe(true);
    expect(customer.currentDebt).toBe(50_000);
    const receipt1 = customer.receipts!.find((r) => r.id === "QS-1")!;
    expect(receipt1.paidSoFar).toBe(100_000);
    expect(receipt1.status).toBe("paid");
    expect(getOpenCustomerDebts("CUST-TEST")).toHaveLength(1);
    expect(getOpenCustomerDebts("CUST-TEST")[0].id).toBe("QS-2");
  });
});
