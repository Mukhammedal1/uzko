/**
 * Ko'p-valyutali qarz to'lash — sof hisoblash mexanizmi.
 *
 * Qarz qaysi valyutada paydo bo'lsa, shu valyutada saqlanadi (valyutalar
 * bir-biriga qo'shilmaydi, qarz kursga qarab qayta baholanmaydi). Bitta
 * to'lov bir nechta pul qatoridan iborat bo'lishi mumkin; har bir pul
 * qatoridan sarflangan/qolgan summa alohida kuzatiladi.
 *
 * Bu fayl UI'dan butunlay ajratilgan — frontend ham, (agar bo'lsa) backend
 * ham aynan shu funksiyani chaqirishi kerak, shunda natija har doim bir xil
 * bo'ladi.
 */

export type Currency = string;

export type Debt = {
  id: string;
  currency: Currency;
  /** Qarz qoldig'i — shu valyutaning o'z birligida (so'mga aylantirilmagan). */
  amount: number;
};

export type MoneyLine = {
  id: string;
  currency: Currency;
  amount: number;
};

export type RatePair = { moneyCurrency: Currency; debtCurrency: Currency };

/** `moneyCurrency`ning nechta birligi 1 `debtCurrency` birligiga teng. */
export type RateOf = (pair: RatePair) => number | undefined;

export type Allocation = {
  moneyLineId: string;
  debtId: string;
  /** Pul valyutasida sarflangan summa. */
  spent: number;
  /** Qarz valyutasida yopilgan summa. */
  closed: number;
  /** Konvertatsiyasiz (bir xil valyuta) bo'lsa — null. */
  rate: number | null;
};

export type AllocateResult = {
  allocations: Allocation[];
  /** debtId -> qolgan qarz (qarz valyutasida). */
  debtRemaining: Record<string, number>;
  /** moneyLineId -> ortiqcha qolgan pul (pul valyutasida). */
  moneyLeftover: Record<string, number>;
  /** Kurs kerak bo'lgan juftliklar — 1-o'tishdan keyin, tuzilma bo'yicha. */
  requiredPairs: RatePair[];
  /** true — kerakli juftliklardan birortasi uchun kurs berilmagan yoki <= 0. */
  bad: boolean;
};

/** Ichki hisoblash uchun 4 xonali yaxlitlash — ko'rsatishda valyutaga mos xona alohida qo'llanadi. */
export function r4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Ko'rsatishda qancha xona kerak: UZS — 0, boshqa valyutalar — 2. */
export function displayDecimals(currency: Currency): number {
  return currency === "UZS" ? 0 : 2;
}

export function roundForDisplay(value: number, currency: Currency): number {
  const factor = 10 ** displayDecimals(currency);
  return Math.round(value * factor) / factor;
}

function pairKey(pair: RatePair): string {
  return `${pair.moneyCurrency}::${pair.debtCurrency}`;
}

export function allocatePayment(params: {
  /** Eskisidan yangisiga tartiblangan, faqat ishtirok etadigan qarzlar. */
  debts: Debt[];
  /** Tartib bilan — pul qatorlari. */
  moneyLines: MoneyLine[];
  rateOf: RateOf;
}): AllocateResult {
  const { debts, moneyLines, rateOf } = params;

  const left: Record<string, number> = {};
  for (const m of moneyLines) left[m.id] = Math.max(0, m.amount);

  const rem: Record<string, number> = {};
  for (const d of debts) rem[d.id] = Math.max(0, d.amount);

  const allocations: Allocation[] = [];

  // 1-o'tish: konvertatsiyasiz (bir xil valyuta).
  for (const debt of debts) {
    for (const money of moneyLines) {
      if (money.currency !== debt.currency) continue;
      if (left[money.id] <= 0 || rem[debt.id] <= 0) continue;
      const t = Math.min(left[money.id], rem[debt.id]);
      if (t <= 0) continue;
      allocations.push({ moneyLineId: money.id, debtId: debt.id, spent: t, closed: t, rate: null });
      left[money.id] = r4(left[money.id] - t);
      rem[debt.id] = r4(rem[debt.id] - t);
    }
  }

  // Kerakli juftliklar — 1-o'tish tugagandan keyin, TUZILMA bo'yicha aniqlanadi
  // (natijaga qarab emas), aks holda kurs 0 qilinganda input yo'qolib qoladi.
  const seenPairs = new Set<string>();
  const requiredPairs: RatePair[] = [];
  for (const debt of debts) {
    if (rem[debt.id] <= 0) continue;
    for (const money of moneyLines) {
      if (money.currency === debt.currency) continue;
      if (left[money.id] <= 0) continue;
      const pair: RatePair = { moneyCurrency: money.currency, debtCurrency: debt.currency };
      const key = pairKey(pair);
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      requiredPairs.push(pair);
    }
  }

  let bad = false;
  const resolvedRates = new Map<string, number>();
  for (const pair of requiredPairs) {
    const rate = rateOf(pair);
    if (!rate || !(rate > 0)) {
      bad = true;
    } else {
      resolvedRates.set(pairKey(pair), rate);
    }
  }

  // 2-o'tish: konvertatsiya bilan — faqat `bad` bo'lmasa.
  if (!bad) {
    for (const debt of debts) {
      for (const money of moneyLines) {
        if (money.currency === debt.currency) continue;
        if (left[money.id] <= 0 || rem[debt.id] <= 0) continue;
        const rate = resolvedRates.get(
          pairKey({ moneyCurrency: money.currency, debtCurrency: debt.currency }),
        );
        if (!rate) continue;
        const cost = r4(rem[debt.id] * rate);
        if (left[money.id] >= cost) {
          allocations.push({
            moneyLineId: money.id,
            debtId: debt.id,
            spent: cost,
            closed: rem[debt.id],
            rate,
          });
          left[money.id] = r4(left[money.id] - cost);
          rem[debt.id] = 0;
        } else {
          const spent = left[money.id];
          const closed = r4(spent / rate);
          allocations.push({ moneyLineId: money.id, debtId: debt.id, spent, closed, rate });
          rem[debt.id] = r4(rem[debt.id] - closed);
          left[money.id] = 0;
        }
      }
    }
  }

  return { allocations, debtRemaining: rem, moneyLeftover: left, requiredPairs, bad };
}

/**
 * Tizim taklif qilgan kurs: `sysRate[debtCurrency] / sysRate[moneyCurrency]`
 * (UZS asos, `sysRate["UZS"] === 1`). Mavjud `MOCK_RATES` jadvali shu shaklda.
 */
export function systemSuggestedRate(
  sysRate: Record<Currency, number>,
  pair: RatePair,
): number | undefined {
  const moneyRate = sysRate[pair.moneyCurrency];
  const debtRate = sysRate[pair.debtCurrency];
  if (!moneyRate || !debtRate) return undefined;
  return debtRate / moneyRate;
}
