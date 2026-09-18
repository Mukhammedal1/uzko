import { describe, expect, it } from "vitest";
import { MOCK_RECEIPTS } from "@/lib/mock-data";
import { getSalesSummary, getStock } from "./reports";

const FAR_PAST = new Date("2000-01-01T00:00:00Z");
const FAR_FUTURE = new Date("2100-01-01T00:00:00Z");

describe("getSalesSummary", () => {
  it("Jami har doim To'langan + Nasiya ga teng (butun mock davr bo'yicha)", () => {
    const summary = getSalesSummary(FAR_PAST, FAR_FUTURE, "all");
    expect(summary.paidTotal + summary.creditTotal).toBe(summary.total);
  });

  it("saleType='paid' va 'credit' bo'linishi 'all' bilan mos keladi", () => {
    const all = getSalesSummary(FAR_PAST, FAR_FUTURE, "all");
    const paid = getSalesSummary(FAR_PAST, FAR_FUTURE, "paid");
    const credit = getSalesSummary(FAR_PAST, FAR_FUTURE, "credit");
    expect(paid.total + credit.total).toBe(all.total);
    expect(paid.receiptsCount + credit.receiptsCount).toBe(all.receiptsCount);
  });

  it("bo'sh davrda (savdo yo'q) hammasi nolga teng", () => {
    const summary = getSalesSummary(new Date("2019-01-01"), new Date("2019-01-02"));
    expect(summary).toMatchObject({
      total: 0,
      paidTotal: 0,
      creditTotal: 0,
      creditCount: 0,
      receiptsCount: 0,
      avgReceipt: 0,
      profit: 0,
    });
  });

  it("mock CHK-100232 (nasiya, skidkali) to'g'ri hisoblanadi", () => {
    const receipt = MOCK_RECEIPTS.find((r) => r.id === "CHK-100232");
    expect(receipt).toBeTruthy();
    const start = new Date(receipt!.date);
    const end = new Date(start.getTime() + 1000);
    const summary = getSalesSummary(new Date(start.getTime() - 1000), end, "all");
    expect(summary.total).toBe(receipt!.total);
    expect(summary.receiptsCount).toBe(1);
  });
});

describe("getStock", () => {
  it("'out' filtri faqat qoldig'i nolga teng yoki manfiy tovarlarni qaytaradi", () => {
    const { rows } = getStock("out");
    for (const row of rows) expect(row.qty).toBeLessThanOrEqual(0);
  });

  it("'all' filtri barcha tovarlarni qaytaradi", () => {
    const { totalCount } = getStock("all");
    expect(totalCount).toBeGreaterThan(0);
  });
});
