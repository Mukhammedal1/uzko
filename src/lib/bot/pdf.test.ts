import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./period";
import { buildCashPdf, buildDebtsPdf, buildSalesPdf, buildStockPdf } from "./pdf";

const FAR_PAST_RANGE = { start: new Date("2000-01-01"), end: new Date("2100-01-01"), label: "Test" };

describe("PDF generatorlar", () => {
  it("buildSalesPdf — xatosiz PDF blob va nomini qaytaradi", () => {
    const pdf = buildSalesPdf(FAR_PAST_RANGE, "all");
    expect(pdf.blob).toBeInstanceOf(Blob);
    expect(pdf.blob.size).toBeGreaterThan(0);
    expect(pdf.filename).toMatch(/^savdo_barcha_.*\.pdf$/);
  });

  it("buildCashPdf — xatosiz PDF blob qaytaradi", () => {
    const pdf = buildCashPdf(FAR_PAST_RANGE);
    expect(pdf.blob.size).toBeGreaterThan(0);
    expect(pdf.filename).toMatch(/^kassa_.*\.pdf$/);
  });

  it("buildDebtsPdf — xatosiz PDF blob qaytaradi", () => {
    const pdf = buildDebtsPdf("all");
    expect(pdf.blob.size).toBeGreaterThan(0);
  });

  it("buildStockPdf — xatosiz PDF blob qaytaradi", () => {
    const pdf = buildStockPdf("low", 7);
    expect(pdf.blob.size).toBeGreaterThan(0);
  });

  it("bo'sh davrda ham (qatorlar yo'q) yiqilmaydi", () => {
    const emptyRange = resolvePeriod("today", new Date("2019-01-01T12:00:00+05:00"));
    const pdf = buildSalesPdf(emptyRange, "all");
    expect(pdf.blob.size).toBeGreaterThan(0);
  });
});
