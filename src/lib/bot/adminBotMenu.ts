/**
 * Admin Telegram botining 4 ta doimiy tugmasi (📊 Bugun · 💰 Kassa · 👥 Qarzlar
 * · ⚠️ Zaxira) + inline davr/filtr klaviaturalari shu yerda boshqariladi.
 * Barcha raqamlar `reports.ts`dan olinadi — kelajakdagi PDF/AI chat ham xuddi
 * shu funksiyalarni chaqiradi, shu bilan raqamlar hamma joyda mos keladi.
 */
import {
  answerTelegramCallback,
  editTelegramMessageText,
  sendTelegramChatAction,
  sendTelegramDocument,
  sendTelegramMessage,
  type ReplyMarkup,
  type TelegramUpdate,
} from "@/lib/telegram";
import { formatSom } from "./format";
import {
  formatDateUz,
  formatPercentChange,
  parseCustomRangeInput,
  percentChange,
  resolvePeriod,
  resolvePreviousPeriod,
  type PeriodKind,
} from "./period";
import {
  findCustomer,
  getCashSummary,
  getCustomerDebt,
  getDebts,
  getSalesSummary,
  getStock,
  type DebtStatus,
  type SaleType,
  type StockFilter,
} from "./reports";
import { buildCashPdf, buildCustomerActPdf, buildDebtsPdf, buildSalesPdf, buildStockPdf } from "./pdf";

export const ADMIN_MENU_KEYBOARD: ReplyMarkup = {
  keyboard: [
    ["📊 Bugun", "💰 Kassa"],
    ["👥 Qarzlar", "⚠️ Zaxira"],
  ],
  resize_keyboard: true,
};

type View = "sales" | "cash" | "debts" | "stock";

export type ChatState = {
  view: View;
  period: PeriodKind;
  customRange?: { from: string; to: string };
  saleType: SaleType;
  debtStatus: DebtStatus;
  stockFilter: StockFilter;
  stockDeadDays: 7 | 30;
  awaiting?: "customDate" | "customerSearch";
};

export function defaultChatState(): ChatState {
  return {
    view: "sales",
    period: "today",
    saleType: "all",
    debtStatus: "all",
    stockFilter: "low",
    stockDeadDays: 7,
  };
}

const PERIOD_LABELS: Record<PeriodKind, string> = {
  today: "Bugun",
  yesterday: "Kecha",
  week: "Hafta",
  month: "Oy",
  custom: "📅",
};

const SALE_TYPE_LABELS: Record<SaleType, string> = {
  all: "Barchasi",
  paid: "To'langan",
  credit: "Nasiya",
};

const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  all: "Barchasi",
  overdue: "Muddati o'tgan",
  paidToday: "Bugun to'laganlar",
};

function mark(active: boolean, label: string) {
  return active ? `✓ ${label}` : label;
}

function periodRow(state: ChatState, ns: string): { text: string; callback_data: string }[] {
  return (["today", "yesterday", "week", "month", "custom"] as PeriodKind[]).map((kind) => ({
    text: mark(state.period === kind, PERIOD_LABELS[kind]),
    callback_data: `${ns}:period:${kind}`,
  }));
}

// ─── 📊 Savdo (Bugun) ────────────────────────────────────────────────────────

function buildSalesView(state: ChatState, now: Date) {
  const range = resolvePeriod(state.period, now, state.customRange);
  const prevRange = resolvePreviousPeriod(state.period, range, now);
  const summary = getSalesSummary(range.start, range.end, state.saleType);
  const prevSummary = getSalesSummary(prevRange.start, prevRange.end, state.saleType);
  const pct = percentChange(summary.total, prevSummary.total);

  const lines = [
    `📊 <b>Savdo — ${range.label}</b>`,
    `Filtr: ${SALE_TYPE_LABELS[state.saleType]}`,
    "",
    `💰 Jami: ${formatSom(summary.total)}  ${formatPercentChange(pct)}`,
    `   ├ To'langan: ${formatSom(summary.paidTotal)}`,
    `   └ Nasiya: ${formatSom(summary.creditTotal)} (${summary.creditCount} ta)`,
    `🧾 Cheklar: ${summary.receiptsCount} · O'rtacha chek: ${formatSom(summary.avgReceipt)}`,
    `📈 Foyda: ${formatSom(summary.profit)}`,
  ];

  const keyboard: ReplyMarkup = {
    inline_keyboard: [
      periodRow(state, "sales"),
      (["all", "paid", "credit"] as SaleType[]).map((t) => ({
        text: mark(state.saleType === t, SALE_TYPE_LABELS[t]),
        callback_data: `sales:filter:${t}`,
      })),
      [{ text: "📄 PDF", callback_data: "sales:pdf" }],
    ],
  };

  return { text: lines.join("\n"), keyboard };
}

// ─── 💰 Kassa ────────────────────────────────────────────────────────────────

function buildCashView(state: ChatState, now: Date) {
  const range = resolvePeriod(state.period, now, state.customRange);
  const cash = getCashSummary(range.start, range.end);

  const lines = [`💰 <b>Kassa — ${range.label}</b>`, ""];
  if (cash.byPaymentType.length === 0) {
    lines.push("To'lovlar yo'q");
  } else {
    for (const row of cash.byPaymentType) lines.push(`${row.method}: ${formatSom(row.amount)}`);
  }
  lines.push("");
  lines.push(`Qarz to'lovlaridan kirim: ${formatSom(cash.debtPayments)}`);
  lines.push(`Xarajatlar: ${formatSom(cash.expenses)}`);
  if (cash.cashBalance !== null) lines.push(`Kassada qoldi: ${formatSom(cash.cashBalance)}`);

  const keyboard: ReplyMarkup = {
    inline_keyboard: [periodRow(state, "cash"), [{ text: "📄 PDF", callback_data: "cash:pdf" }]],
  };
  return { text: lines.join("\n"), keyboard };
}

// ─── 👥 Qarzlar ──────────────────────────────────────────────────────────────

function buildDebtsView(state: ChatState, now: Date) {
  const { totalDebt, customersCount, rows } = getDebts(state.debtStatus, { now });

  const lines = [
    `👥 <b>Qarzlar</b>`,
    `Filtr: ${DEBT_STATUS_LABELS[state.debtStatus]}`,
    `Jami qarz: ${formatSom(totalDebt)} (${customersCount} mijoz)`,
    "",
    "Top-5:",
  ];
  if (rows.length === 0) {
    lines.push("Ma'lumot yo'q");
  } else {
    rows.slice(0, 5).forEach((r, i) => {
      const overdue = r.overdueDays > 0 ? ` (${r.overdueDays} kun kechikdi)` : "";
      lines.push(`${i + 1}. ${r.customer} — ${formatSom(r.debt)}${overdue}`);
    });
  }

  const keyboard: ReplyMarkup = {
    inline_keyboard: [
      (["all", "overdue", "paidToday"] as DebtStatus[]).map((s) => ({
        text: mark(state.debtStatus === s, DEBT_STATUS_LABELS[s]),
        callback_data: `debts:status:${s}`,
      })),
      [{ text: "🔍 Mijoz qidirish", callback_data: "debts:search" }, { text: "📄 PDF", callback_data: "debts:pdf" }],
    ],
  };

  return { text: lines.join("\n"), keyboard };
}

function buildCustomerCard(customerId: string): { text: string; keyboard?: ReplyMarkup } {
  const detail = getCustomerDebt(customerId);
  if (!detail) return { text: "Mijoz topilmadi" };
  const lines = [`👤 <b>${detail.customer}</b>`, `Joriy qarz: ${formatSom(detail.debt)}`];
  if (detail.lastPurchase) lines.push(`Oxirgi xarid: ${formatDateUz(new Date(detail.lastPurchase))}`);
  if (detail.lastPayment) lines.push(`Oxirgi to'lov: ${formatDateUz(new Date(detail.lastPayment))}`);
  lines.push("", "Oxirgi nasiya savdolar:");
  if (detail.creditSales.length === 0) {
    lines.push("Yo'q");
  } else {
    for (const sale of detail.creditSales) {
      lines.push(`• ${formatDateUz(new Date(sale.date))} — ${sale.title}: ${formatSom(sale.amount)}`);
    }
  }
  return {
    text: lines.join("\n"),
    keyboard: { inline_keyboard: [[{ text: "📄 PDF (akt-sverka)", callback_data: `debts:customerpdf:${customerId}` }]] },
  };
}

// ─── ⚠️ Zaxira ───────────────────────────────────────────────────────────────

const STOCK_FILTER_LABELS: Record<StockFilter, string> = {
  low: "Tugayotgan",
  out: "Tugagan",
  dead: "Sotilmayotgan",
  all: "Barcha qoldiq",
};

function buildStockView(state: ChatState) {
  const { rows, totalCount } = getStock(state.stockFilter, {
    deadDays: state.stockDeadDays,
    limit: 5,
  });
  const title =
    state.stockFilter === "dead"
      ? `${STOCK_FILTER_LABELS.dead} (${state.stockDeadDays} kun)`
      : STOCK_FILTER_LABELS[state.stockFilter];

  const lines = [`⚠️ <b>Zaxira — ${title}</b>`, `Jami: ${totalCount} ta`, ""];
  if (rows.length === 0) {
    lines.push("Ma'lumot yo'q");
  } else {
    rows.forEach((r, i) => lines.push(`${i + 1}. ${r.name} — ${r.qty} ${r.unit}`));
  }
  if (state.stockFilter === "dead") {
    const frozen = rows.reduce((sum, r) => sum + (r.frozenValue ?? 0), 0);
    lines.push("", `Muzlagan pul: ${formatSom(frozen)}`);
  }

  const keyboard: ReplyMarkup = {
    inline_keyboard: [
      [
        { text: mark(state.stockFilter === "low", "Tugayotgan"), callback_data: "stock:filter:low" },
        { text: mark(state.stockFilter === "out", "Tugagan"), callback_data: "stock:filter:out" },
      ],
      [
        {
          text: mark(state.stockFilter === "dead" && state.stockDeadDays === 7, "Sotilmayotgan 7 kun"),
          callback_data: "stock:filter:dead:7",
        },
        {
          text: mark(state.stockFilter === "dead" && state.stockDeadDays === 30, "30 kun"),
          callback_data: "stock:filter:dead:30",
        },
      ],
      [{ text: mark(state.stockFilter === "all", "Barcha qoldiq"), callback_data: "stock:filter:all" }],
      [{ text: "📄 PDF", callback_data: "stock:pdf" }],
    ],
  };

  return { text: lines.join("\n"), keyboard };
}

// ─── Umumiy render ───────────────────────────────────────────────────────────

function buildView(state: ChatState, now: Date): { text: string; keyboard: ReplyMarkup } {
  if (state.view === "cash") return buildCashView(state, now);
  if (state.view === "debts") return buildDebtsView(state, now);
  if (state.view === "stock") return buildStockView(state);
  return buildSalesView(state, now);
}

async function sendView(token: string, chatId: string, state: ChatState) {
  const { text, keyboard } = buildView(state, new Date());
  await sendTelegramMessage(token, chatId, text, keyboard);
}

async function editView(token: string, chatId: string, messageId: number, state: ChatState) {
  const { text, keyboard } = buildView(state, new Date());
  await editTelegramMessageText(token, chatId, messageId, text, keyboard);
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

const MENU_TEXT_TO_VIEW: Record<string, View> = {
  "📊 Bugun": "sales",
  "💰 Kassa": "cash",
  "👥 Qarzlar": "debts",
  "⚠️ Zaxira": "stock",
};

/**
 * Bitta Telegram update'ni (matn xabar yoki callback_query) qayta ishlaydi.
 * `state` — chaqiruvchi tomonidan saqlab turiladigan (masalan React ref)
 * o'zgaruvchi holat, chunki bitta admin chat uchun bitta suhbat konteksti yetarli.
 */
export async function handleAdminBotUpdate(
  update: TelegramUpdate,
  token: string,
  chatId: string,
  state: ChatState,
): Promise<ChatState> {
  const next = { ...state };

  if (update.callback_query) {
    const cq = update.callback_query;
    if (String(cq.message?.chat.id) !== chatId || !cq.message) return next;
    await answerTelegramCallback(token, cq.id);
    return handleCallback(cq.data ?? "", token, chatId, cq.message.message_id, next);
  }

  const msg = update.message;
  if (!msg || String(msg.chat.id) !== chatId) return next;
  const text = msg.text?.trim();
  if (!text) return next;

  if (text === "/start") {
    await sendTelegramMessage(
      token,
      chatId,
      "Assalomu alaykum! UZKO admin bot ishga tushdi. Tugmalardan birini tanlang.",
      ADMIN_MENU_KEYBOARD,
    );
    return defaultChatState();
  }

  if (text in MENU_TEXT_TO_VIEW) {
    const view = MENU_TEXT_TO_VIEW[text];
    const fresh = { ...defaultChatState(), view };
    await sendView(token, chatId, fresh);
    return fresh;
  }

  if (next.awaiting === "customDate") {
    const parsed = parseCustomRangeInput(text);
    if (!parsed) {
      await sendTelegramMessage(
        token,
        chatId,
        "Sana formati noto'g'ri. Masalan: 01.09.2026-15.09.2026 yoki 01.09-15.09 (max 366 kun).",
      );
      return next;
    }
    next.period = "custom";
    next.customRange = parsed;
    next.awaiting = undefined;
    await sendView(token, chatId, next);
    return next;
  }

  if (next.awaiting === "customerSearch") {
    next.awaiting = undefined;
    const matches = findCustomer(text);
    if (matches.length === 0) {
      await sendTelegramMessage(token, chatId, "Mijoz topilmadi.");
      return next;
    }
    if (matches.length === 1) {
      const card = buildCustomerCard(matches[0].id);
      await sendTelegramMessage(token, chatId, card.text, card.keyboard);
      return next;
    }
    const keyboard: ReplyMarkup = {
      inline_keyboard: matches.map((m) => [
        { text: `${m.name} — ${formatSom(m.debt)}`, callback_data: `debts:customer:${m.id}` },
      ]),
    };
    await sendTelegramMessage(token, chatId, "Bir nechta mijoz topildi, birini tanlang:", keyboard);
    return next;
  }

  await sendTelegramMessage(
    token,
    chatId,
    "Iltimos, quyidagi tugmalardan birini tanlang. Erkin savol-javob (AI chat) keyingi bosqichda qo'shiladi.",
    ADMIN_MENU_KEYBOARD,
  );
  return next;
}

async function handleCallback(
  data: string,
  token: string,
  chatId: string,
  messageId: number,
  state: ChatState,
): Promise<ChatState> {
  const [ns, action, ...rest] = data.split(":");
  const next = { ...state };

  if ((ns === "sales" || ns === "cash") && action === "pdf") {
    const range = resolvePeriod(next.period, new Date(), next.customRange);
    if (ns === "sales") await sendPdf(token, chatId, buildSalesPdf(range, next.saleType));
    else await sendPdf(token, chatId, buildCashPdf(range));
    return next;
  }

  if (ns === "sales" || ns === "cash") {
    if (action === "period") {
      const period = rest[0] as PeriodKind;
      if (period === "custom") {
        next.awaiting = "customDate";
        await sendTelegramMessage(
          token,
          chatId,
          "Sanani yozing: 01.09.2026-15.09.2026 yoki 01.09-15.09",
        );
        return next;
      }
      next.period = period;
      next.customRange = undefined;
    } else if (ns === "sales" && action === "filter") {
      next.saleType = rest[0] as SaleType;
    }
    next.view = ns;
    await editView(token, chatId, messageId, next);
    return next;
  }

  if (ns === "debts") {
    if (action === "status") {
      next.debtStatus = rest[0] as DebtStatus;
      next.view = "debts";
      await editView(token, chatId, messageId, next);
      return next;
    }
    if (action === "search") {
      next.awaiting = "customerSearch";
      await sendTelegramMessage(token, chatId, "Mijoz ismi yoki telefon raqamini yozing:");
      return next;
    }
    if (action === "customer") {
      const card = buildCustomerCard(rest[0]);
      await sendTelegramMessage(token, chatId, card.text, card.keyboard);
      return next;
    }
    if (action === "customerpdf") {
      await sendPdf(token, chatId, buildCustomerActPdf(rest[0]));
      return next;
    }
    if (action === "pdf") {
      await sendPdf(token, chatId, buildDebtsPdf(next.debtStatus));
      return next;
    }
  }

  if (ns === "stock") {
    if (action === "pdf") {
      await sendPdf(token, chatId, buildStockPdf(next.stockFilter, next.stockDeadDays));
      return next;
    }
    if (action === "filter") {
      const filter = rest[0] as StockFilter;
      if (filter === "dead") next.stockDeadDays = Number(rest[1]) === 30 ? 30 : 7;
      next.stockFilter = filter;
      if (filter === "all") {
        // "Barcha qoldiq" ro'yxati katta bo'lishi mumkin — chatda ko'rsatilmaydi,
        // to'g'ridan-to'g'ri PDF sifatida yuboriladi.
        await sendPdf(token, chatId, buildStockPdf(filter, next.stockDeadDays));
        return next;
      }
      next.view = "stock";
      await editView(token, chatId, messageId, next);
      return next;
    }
  }

  return next;
}

async function sendPdf(
  token: string,
  chatId: string,
  pdf: { blob: Blob; filename: string } | null,
) {
  if (!pdf) {
    await sendTelegramMessage(token, chatId, "Hisobot tayyorlanmadi.");
    return;
  }
  await sendTelegramChatAction(token, chatId, "upload_document");
  await sendTelegramDocument(token, chatId, pdf.blob, pdf.filename);
}
