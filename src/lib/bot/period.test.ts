import { describe, expect, it } from "vitest";
import {
  formatPercentChange,
  parseCustomRangeInput,
  parseUzDate,
  percentChange,
  resolvePeriod,
  resolvePreviousPeriod,
  tashkentDateKey,
} from "./period";

describe("tashkentDateKey", () => {
  it("23:59 va 00:01 (UTC) dagi lahzalarni to'g'ri Toshkent kuniga tushiradi", () => {
    // 2026-09-18 23:59 Toshkent vaqti = 2026-09-18 18:59 UTC
    expect(tashkentDateKey(new Date("2026-09-18T18:59:00.000Z"))).toBe("2026-09-18");
    // 2026-09-19 00:01 Toshkent vaqti = 2026-09-18 19:01 UTC
    expect(tashkentDateKey(new Date("2026-09-18T19:01:00.000Z"))).toBe("2026-09-19");
  });
});

describe("resolvePeriod", () => {
  const now = new Date("2026-09-18T10:00:00+05:00"); // Juma, 2026-09-18

  it("bugun — kun boshi va oxiri to'g'ri", () => {
    const range = resolvePeriod("today", now);
    expect(range.start.toISOString()).toBe(new Date("2026-09-18T00:00:00+05:00").toISOString());
    expect(range.end.toISOString()).toBe(new Date("2026-09-19T00:00:00+05:00").toISOString());
  });

  it("hafta — dushanbadan boshlanadi", () => {
    // 2026-09-18 Juma bo'lsa, shu haftaning dushanbasi 2026-09-14
    const range = resolvePeriod("week", now);
    expect(range.start.toISOString()).toBe(new Date("2026-09-14T00:00:00+05:00").toISOString());
    expect(range.end.toISOString()).toBe(new Date("2026-09-19T00:00:00+05:00").toISOString());
  });

  it("oy — 1-sanadan boshlanadi", () => {
    const range = resolvePeriod("month", now);
    expect(range.start.toISOString()).toBe(new Date("2026-09-01T00:00:00+05:00").toISOString());
  });
});

describe("resolvePreviousPeriod", () => {
  it("bugun uchun — kecha", () => {
    const now = new Date("2026-09-18T10:00:00+05:00");
    const range = resolvePeriod("today", now);
    const prev = resolvePreviousPeriod("today", range, now);
    expect(prev.start.toISOString()).toBe(new Date("2026-09-17T00:00:00+05:00").toISOString());
  });

  it("hafta uchun — 7 kun oldingi teng oraliq", () => {
    const now = new Date("2026-09-18T10:00:00+05:00");
    const range = resolvePeriod("week", now);
    const prev = resolvePreviousPeriod("week", range, now);
    expect(prev.start.toISOString()).toBe(new Date("2026-09-07T00:00:00+05:00").toISOString());
    expect(prev.end.toISOString()).toBe(new Date("2026-09-12T00:00:00+05:00").toISOString());
  });
});

describe("percentChange / formatPercentChange", () => {
  it("o'sish va pasayishni to'g'ri hisoblaydi", () => {
    expect(percentChange(108, 100)).toBeCloseTo(8);
    expect(percentChange(95, 100)).toBeCloseTo(-5);
    expect(formatPercentChange(8)).toBe("▲ +8%");
    expect(formatPercentChange(-5)).toBe("▼ −5%");
  });

  it("oldingi davr 0 bo'lsa — aniqlanmagan", () => {
    expect(percentChange(100, 0)).toBeNull();
    expect(formatPercentChange(null)).toBe("—");
  });
});

describe("parseUzDate / parseCustomRangeInput", () => {
  it("01.09.2026 formatini parse qiladi", () => {
    expect(parseUzDate("01.09.2026", 2026)).toBe("2026-09-01");
  });

  it("yilsiz 01.09 formatini joriy yil bilan to'ldiradi", () => {
    expect(parseUzDate("01.09", 2026)).toBe("2026-09-01");
  });

  it("mavjud bo'lmagan sanani rad etadi", () => {
    expect(parseUzDate("31.02.2026", 2026)).toBeNull();
  });

  it("davr oralig'ini parse qiladi: 01.09.2026-15.09.2026", () => {
    expect(parseCustomRangeInput("01.09.2026-15.09.2026")).toEqual({
      from: "2026-09-01",
      to: "2026-09-15",
    });
  });

  it("366 kundan uzun oraliqni rad etadi", () => {
    expect(parseCustomRangeInput("01.01.2025-01.01.2027")).toBeNull();
  });

  it("teskari oraliqni rad etadi", () => {
    expect(parseCustomRangeInput("15.09.2026-01.09.2026")).toBeNull();
  });
});
