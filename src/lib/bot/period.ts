/**
 * Barcha sana hisoblari O'zbekiston vaqti (Asia/Tashkent, doim UTC+5, DST yo'q)
 * bo'yicha olib boriladi. Chek `date` maydoni ISO (UTC) formatida saqlanadi —
 * shu sababli kun chegarasi doim aniq "+05:00" surish bilan hisoblanadi, bu
 * 23:59 / 00:01 kabi kun chegarasidagi savdolarni to'g'ri kunga tushiradi.
 */

const TASHKENT_OFFSET = "+05:00";

export type PeriodKind = "today" | "yesterday" | "week" | "month" | "custom";

export type PeriodRange = {
  /** Davr boshlanishi (dona, inclusive) — UTC instant */
  start: Date;
  /** Davr tugashi (dona, exclusive) — UTC instant */
  end: Date;
  /** Foydalanuvchiga ko'rsatiladigan nom, masalan "Bugun (18.09.2026)" */
  label: string;
};

/** Berilgan (istalgan timezone'dagi) Date'ni Toshkent kuni "YYYY-MM-DD" ko'rinishida qaytaradi. */
export function tashkentDateKey(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "YYYY-MM-DD" Toshkent kunining boshlanishi (00:00) va tugashi (keyingi kun 00:00). */
export function tashkentDayBounds(dateKey: string): { start: Date; end: Date } {
  const start = new Date(`${dateKey}T00:00:00${TASHKENT_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function addDaysToKey(dateKey: string, deltaDays: number): string {
  const { start } = tashkentDayBounds(dateKey);
  const shifted = new Date(start.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return tashkentDateKey(shifted);
}

/**
 * Dushanba=0 ... Yakshanba=6 (haftani dushanbadan boshlash uchun).
 * `Date.UTC` bilan sof kalendar sanadan hisoblanadi — "+05:00" surish bilan
 * yasalgan instant'ning `getUTCDay()`'ini ishlatish XATO bo'lardi, chunki
 * 00:00+05:00 = oldingi UTC kunining 19:00'i, ya'ni hafta kuni bir kunga
 * siljib qoladi.
 */
function mondayIndexedWeekday(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function formatDateUz(date: Date): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** `01.09.2026` yoki `01.09` (yil joriy yilga teng bo'lsa) formatidagi sanani parse qiladi. */
export function parseUzDate(input: string, referenceYear: number): string | null {
  const match = input.trim().match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = match[3] ? Number(match[3]) : referenceYear;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const { start } = tashkentDayBounds(key);
  if (tashkentDateKey(start) !== key) return null; // masalan 31.02 kabi mavjud bo'lmagan sana
  return key;
}

/** "01.09.2026-15.09.2026" yoki "01.09-15.09" ko'rinishidagi ixtiyoriy davrni parse qiladi. */
export function parseCustomRangeInput(
  input: string,
  now: Date = new Date(),
): { from: string; to: string } | null {
  const referenceYear = Number(tashkentDateKey(now).slice(0, 4));
  const parts = input
    .split(/[–—-]/)
    .map((p) => p.trim())
    .filter(Boolean);
  // "01.09.2026-15.09.2026" dagi ichki "." bilan chalkashmasligi uchun oddiy split yetarli emas,
  // shuning uchun ikkita sana chegarasini alohida regex bilan ajratamiz.
  const rangeMatch = input
    .trim()
    .match(/^(\d{1,2}\.\d{1,2}(?:\.\d{4})?)\s*[–—-]\s*(\d{1,2}\.\d{1,2}(?:\.\d{4})?)$/);
  if (!rangeMatch) {
    if (parts.length === 2) {
      const from = parseUzDate(parts[0], referenceYear);
      const to = parseUzDate(parts[1], referenceYear);
      if (from && to && from <= to) return { from, to };
    }
    return null;
  }
  const from = parseUzDate(rangeMatch[1], referenceYear);
  const to = parseUzDate(rangeMatch[2], referenceYear);
  if (!from || !to || from > to) return null;
  const days = daysBetween(from, to);
  if (days > 366) return null;
  return { from, to };
}

function daysBetween(fromKey: string, toKey: string): number {
  const a = tashkentDayBounds(fromKey).start.getTime();
  const b = tashkentDayBounds(toKey).start.getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

/** Joriy davr uchun sana oralig'ini hisoblaydi. */
export function resolvePeriod(
  kind: PeriodKind,
  now: Date = new Date(),
  custom?: { from: string; to: string },
): PeriodRange {
  const todayKey = tashkentDateKey(now);

  if (kind === "yesterday") {
    const key = addDaysToKey(todayKey, -1);
    const { start, end } = tashkentDayBounds(key);
    return { start, end, label: `Kecha (${formatDateUz(start)})` };
  }

  if (kind === "week") {
    const mondayKey = addDaysToKey(todayKey, -mondayIndexedWeekday(todayKey));
    const start = tashkentDayBounds(mondayKey).start;
    const end = tashkentDayBounds(todayKey).end;
    return { start, end, label: `Bu hafta (${formatDateUz(start)} – ${formatDateUz(now)})` };
  }

  if (kind === "month") {
    const monthStartKey = `${todayKey.slice(0, 7)}-01`;
    const start = tashkentDayBounds(monthStartKey).start;
    const end = tashkentDayBounds(todayKey).end;
    return { start, end, label: `Bu oy (${formatDateUz(start)} – ${formatDateUz(now)})` };
  }

  if (kind === "custom" && custom) {
    const start = tashkentDayBounds(custom.from).start;
    const end = tashkentDayBounds(custom.to).end;
    return {
      start,
      end,
      label: `${formatDateUz(start)} – ${formatDateUz(new Date(end.getTime() - 1))}`,
    };
  }

  const { start, end } = tashkentDayBounds(todayKey);
  return { start, end, label: `Bugun (${formatDateUz(start)})` };
}

/**
 * Taqqoslash uchun oldingi (teng uzunlikdagi yoki mos) davrni qaytaradi:
 * bugun↔kecha, hafta↔o'tgan hafta, oy↔o'tgan oyning shu kunigacha,
 * ixtiyoriy davr↔oldingi teng davr.
 */
export function resolvePreviousPeriod(
  kind: PeriodKind,
  range: PeriodRange,
  now: Date = new Date(),
): PeriodRange {
  if (kind === "today") return resolvePeriod("yesterday", now);

  if (kind === "week") {
    const shiftedStart = new Date(range.start.getTime() - 7 * 24 * 60 * 60 * 1000);
    const shiftedEnd = new Date(range.end.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start: shiftedStart, end: shiftedEnd, label: "O'tgan hafta (shu kunigacha)" };
  }

  if (kind === "month") {
    const todayKey = tashkentDateKey(now);
    const [y, m, d] = todayKey.split("-").map(Number);
    const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
    const prevYear = prevMonthDate.getUTCFullYear();
    const prevMonth = prevMonthDate.getUTCMonth() + 1;
    const prevMonthStartKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const daysInPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
    const clampedDay = Math.min(d, daysInPrevMonth);
    const prevMonthEndKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
    return {
      start: tashkentDayBounds(prevMonthStartKey).start,
      end: tashkentDayBounds(prevMonthEndKey).end,
      label: "O'tgan oy (shu kunigacha)",
    };
  }

  // custom (yoki kecha) — oldingi teng uzunlikdagi davr
  const lengthMs = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - lengthMs),
    end: new Date(range.start.getTime()),
    label: "Oldingi davr",
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function formatPercentChange(pct: number | null): string {
  if (pct === null) return "—";
  const arrow = pct >= 0 ? "▲" : "▼";
  const sign = pct >= 0 ? "+" : "−";
  return `${arrow} ${sign}${Math.abs(Math.round(pct))}%`;
}
