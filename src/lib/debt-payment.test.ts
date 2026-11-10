import { describe, expect, it } from "vitest";
import { allocatePayment, r4, systemSuggestedRate, type Debt, type MoneyLine } from "./debt-payment";

const SYS_RATE = { UZS: 1, USD: 12800 };

function rateOf(pair: { moneyCurrency: string; debtCurrency: string }) {
  return systemSuggestedRate(SYS_RATE, pair);
}

describe("allocatePayment", () => {
  it("1. ikkala qarz bir xil valyutada to'liq yopiladi, ortiqcha ikki valyutada qoladi", () => {
    const debts: Debt[] = [
      { id: "usd-debt", currency: "USD", amount: 200 },
      { id: "uzs-debt", currency: "UZS", amount: 50_000 },
    ];
    const moneyLines: MoneyLine[] = [
      { id: "m-usd", currency: "USD", amount: 300 },
      { id: "m-uzs", currency: "UZS", amount: 200_000 },
    ];
    const result = allocatePayment({ debts, moneyLines, rateOf });
    expect(result.bad).toBe(false);
    expect(result.debtRemaining["usd-debt"]).toBe(0);
    expect(result.debtRemaining["uzs-debt"]).toBe(0);
    expect(result.moneyLeftover["m-usd"]).toBe(100);
    expect(result.moneyLeftover["m-uzs"]).toBe(150_000);
    expect(result.requiredPairs).toHaveLength(0);
  });

  it("2. pul qolmaydi, ikkala qarzda ham qoldiq qoladi", () => {
    const debts: Debt[] = [
      { id: "usd-debt", currency: "USD", amount: 500 },
      { id: "uzs-debt", currency: "UZS", amount: 400_000 },
    ];
    const moneyLines: MoneyLine[] = [
      { id: "m-usd", currency: "USD", amount: 300 },
      { id: "m-uzs", currency: "UZS", amount: 200_000 },
    ];
    const result = allocatePayment({ debts, moneyLines, rateOf });
    expect(result.bad).toBe(false);
    expect(result.debtRemaining["usd-debt"]).toBe(200);
    expect(result.debtRemaining["uzs-debt"]).toBe(200_000);
    expect(result.moneyLeftover["m-usd"]).toBe(0);
    expect(result.moneyLeftover["m-uzs"]).toBe(0);
    // Qolgan pul yo'q — kross-valyuta kurs talab qilinmaydi.
    expect(result.requiredPairs).toHaveLength(0);
  });

  it("3. USD qarz to'liq, UZS qarz qisman USD pulidan konvertatsiya bilan yopiladi", () => {
    const debts: Debt[] = [
      { id: "usd-debt", currency: "USD", amount: 100 },
      { id: "uzs-debt", currency: "UZS", amount: 1_000_000 },
    ];
    const moneyLines: MoneyLine[] = [
      { id: "m-usd", currency: "USD", amount: 300 },
      { id: "m-uzs", currency: "UZS", amount: 200_000 },
    ];
    const result = allocatePayment({ debts, moneyLines, rateOf });
    expect(result.bad).toBe(false);
    expect(result.debtRemaining["usd-debt"]).toBe(0);
    expect(result.debtRemaining["uzs-debt"]).toBe(0);
    expect(result.moneyLeftover["m-uzs"]).toBe(0);
    expect(result.moneyLeftover["m-usd"]).toBeCloseTo(137.5, 4);
    const crossAlloc = result.allocations.find(
      (a) => a.moneyLineId === "m-usd" && a.debtId === "uzs-debt",
    );
    expect(crossAlloc?.rate).toBeCloseTo(1 / 12800, 10);
    expect(crossAlloc?.spent).toBeCloseTo(62.5, 4);
    expect(crossAlloc?.closed).toBe(800_000);
  });

  it("4a. 1-rejim: faqat USD qarz tanlangan, UZS puldan konvertatsiya bilan yopiladi", () => {
    const debts: Debt[] = [{ id: "usd-debt", currency: "USD", amount: 200 }];
    const moneyLines: MoneyLine[] = [{ id: "m-uzs", currency: "UZS", amount: 3_000_000 }];
    const result = allocatePayment({ debts, moneyLines, rateOf });
    expect(result.bad).toBe(false);
    expect(result.debtRemaining["usd-debt"]).toBe(0);
    expect(result.moneyLeftover["m-uzs"]).toBe(440_000);
  });

  it("4b. 'Boshqa qarzni ham yopish' — ikkala qarz tanlanganda ortiqcha kamayadi", () => {
    const debts: Debt[] = [
      { id: "usd-debt", currency: "USD", amount: 200 },
      { id: "uzs-debt", currency: "UZS", amount: 50_000 },
    ];
    const moneyLines: MoneyLine[] = [{ id: "m-uzs", currency: "UZS", amount: 3_000_000 }];
    const result = allocatePayment({ debts, moneyLines, rateOf });
    expect(result.bad).toBe(false);
    expect(result.debtRemaining["usd-debt"]).toBe(0);
    expect(result.debtRemaining["uzs-debt"]).toBe(0);
    expect(result.moneyLeftover["m-uzs"]).toBe(390_000);
  });

  it("5. qisman to'lov — UZS qarz to'liq, USD qarzdan qisman yopiladi", () => {
    const debts: Debt[] = [
      { id: "usd-debt", currency: "USD", amount: 200 },
      { id: "uzs-debt", currency: "UZS", amount: 50_000 },
    ];
    const moneyLines: MoneyLine[] = [{ id: "m-uzs", currency: "UZS", amount: 1_000_000 }];
    const result = allocatePayment({ debts, moneyLines, rateOf });
    expect(result.bad).toBe(false);
    expect(result.debtRemaining["uzs-debt"]).toBe(0);
    expect(result.debtRemaining["usd-debt"]).toBeCloseTo(125.7813, 3);
    expect(result.moneyLeftover["m-uzs"]).toBe(0);
    const closedUsd = 200 - (result.debtRemaining["usd-debt"] ?? 0);
    expect(closedUsd).toBeCloseTo(74.22, 1);
  });

  it("6. kurs o'zgartirilganda natija o'zgaradi", () => {
    const debts: Debt[] = [{ id: "uzs-debt", currency: "UZS", amount: 1_000_000 }];
    const moneyLines: MoneyLine[] = [{ id: "m-usd", currency: "USD", amount: 200 }];
    const withSystemRate = allocatePayment({ debts, moneyLines, rateOf });
    const withManualRate = allocatePayment({
      debts,
      moneyLines,
      rateOf: () => 12_900,
    });
    expect(withSystemRate.debtRemaining["uzs-debt"]).not.toBe(
      withManualRate.debtRemaining["uzs-debt"],
    );
  });

  it("7. kurs 0 yoki yo'q bo'lsa — bad true, 2-o'tish bajarilmaydi", () => {
    const debts: Debt[] = [{ id: "uzs-debt", currency: "UZS", amount: 1_000_000 }];
    const moneyLines: MoneyLine[] = [{ id: "m-usd", currency: "USD", amount: 200 }];
    const result = allocatePayment({ debts, moneyLines, rateOf: () => 0 });
    expect(result.bad).toBe(true);
    expect(result.debtRemaining["uzs-debt"]).toBe(1_000_000);
    expect(result.moneyLeftover["m-usd"]).toBe(200);
    expect(result.requiredPairs).toEqual([{ moneyCurrency: "USD", debtCurrency: "UZS" }]);
  });

  it("8. pul yo'q bo'lsa kerakli juftlik ro'yxati bo'sh (flicker bo'lmasin uchun tuzilma asosida hisoblanadi)", () => {
    const debts: Debt[] = [{ id: "uzs-debt", currency: "UZS", amount: 1_000_000 }];
    const result = allocatePayment({ debts, moneyLines: [], rateOf });
    expect(result.requiredPairs).toEqual([]);
    expect(result.bad).toBe(false);
  });
});

describe("r4", () => {
  it("4 xonaga yaxlitlaydi", () => {
    expect(r4(62.500049)).toBe(62.5);
    expect(r4(1 / 3)).toBe(0.3333);
  });
});
