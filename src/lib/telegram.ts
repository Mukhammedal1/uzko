import { APP_SETTINGS_STORAGE_KEY, type TelegramBotSettings } from "@/lib/app-context";
import type { Receipt } from "@/lib/mock-data";
import { formatSom } from "@/lib/bot/format";

const TELEGRAM_API = "https://api.telegram.org";

type TelegramApiResult<T> = { ok: boolean; result?: T; description?: string };

export type TelegramChat = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type InlineKeyboardButton = { text: string; callback_data: string };
export type ReplyMarkup =
  | { inline_keyboard: InlineKeyboardButton[][] }
  | { keyboard: string[][]; resize_keyboard?: boolean }
  | { remove_keyboard: true };

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: TelegramChat;
    text?: string;
    contact?: { phone_number: string; first_name?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: TelegramChat };
  };
};

async function callTelegramApi<T>(
  token: string,
  method: string,
  params?: Record<string, unknown>,
): Promise<TelegramApiResult<T>> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: params ? JSON.stringify(params) : undefined,
    });
    const data = await res.json();
    return data as TelegramApiResult<T>;
  } catch (err) {
    return { ok: false, description: err instanceof Error ? err.message : "Tarmoq xatosi" };
  }
}

export function getBotInfo(token: string) {
  return callTelegramApi<{ id: number; username: string; first_name: string }>(token, "getMe");
}

/**
 * Yangi xabarlarni oladi. `offset` berilsa — shundan oldingi update'lar
 * Telegram navbatidan "ko'rilgan" deb belgilanadi (qayta qaytarilmaydi).
 * `timeoutSeconds` > 0 bo'lsa — uzun so'rov (long polling): server shuncha
 * vaqt yangi update kutib turadi, keyin bo'sh yoki topilgan natija bilan javob beradi.
 */
export function pollBotUpdates(token: string, offset?: number, timeoutSeconds = 0) {
  return callTelegramApi<TelegramUpdate[]>(token, "getUpdates", {
    offset,
    timeout: timeoutSeconds,
    allowed_updates: ["message", "callback_query"],
  });
}

export function sendTelegramMessage(
  token: string,
  chatId: string | number,
  text: string,
  replyMarkup?: ReplyMarkup,
) {
  return callTelegramApi(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

export function editTelegramMessageText(
  token: string,
  chatId: string | number,
  messageId: number,
  text: string,
  replyMarkup?: ReplyMarkup,
) {
  return callTelegramApi(token, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

export function answerTelegramCallback(token: string, callbackQueryId: string, text?: string) {
  return callTelegramApi(token, "answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

export function sendTelegramChatAction(token: string, chatId: string | number, action: string) {
  return callTelegramApi(token, "sendChatAction", { chat_id: chatId, action });
}

/** PDF va boshqa fayllarni Telegramga multipart/form-data orqali yuboradi. */
export async function sendTelegramDocument(
  token: string,
  chatId: string | number,
  file: Blob,
  filename: string,
  caption?: string,
): Promise<TelegramApiResult<unknown>> {
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    if (caption) form.append("caption", caption);
    form.append("document", file, filename);
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendDocument`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    return data as TelegramApiResult<unknown>;
  } catch (err) {
    return { ok: false, description: err instanceof Error ? err.message : "Tarmoq xatosi" };
  }
}

function normalizePhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  // Kod (masalan 998) turlicha kiritilishi mumkin — oxirgi 9 ta raqam (mahalliy raqam) bo'yicha solishtiramiz.
  return digits.slice(-9);
}

function chatDisplayName(chat: TelegramChat) {
  return [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || "";
}

export type FindAdminChatResult =
  | { ok: true; chatId: number; name: string; approximate?: boolean }
  | { ok: false; description: string };

/**
 * Admin kiritgan telefon raqami bo'yicha Telegram chat ID'ni topadi.
 * Buning uchun admin botga avval /start yozib, kontaktini ulashgan bo'lishi kerak
 * (Telegramda 📎 > Kontakt > "O'zimni ulashish"). Agar kontakt topilmasa, botga
 * oxirgi /start yozgan foydalanuvchi taxminiy natija sifatida qaytariladi.
 */
export async function findAdminChatByPhone(
  token: string,
  phone: string,
): Promise<FindAdminChatResult> {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return { ok: false, description: "Telefon raqamni to'g'ri kiriting" };

  const updates = await pollBotUpdates(token);
  if (!updates.ok || !updates.result) {
    return { ok: false, description: updates.description || "Botdan javob kelmadi (token xato?)" };
  }
  if (updates.result.length === 0) {
    return {
      ok: false,
      description:
        "Bot hali hech qanday xabar olmagan. Avval Telegramda botni oching, /start yozing va kontaktingizni ulashing.",
    };
  }

  for (let i = updates.result.length - 1; i >= 0; i--) {
    const contact = updates.result[i].message?.contact;
    const chat = updates.result[i].message?.chat;
    if (contact?.phone_number && chat) {
      if (normalizePhoneDigits(contact.phone_number) === digits) {
        return { ok: true, chatId: chat.id, name: chatDisplayName(chat) };
      }
    }
  }

  for (let i = updates.result.length - 1; i >= 0; i--) {
    const msg = updates.result[i].message;
    if (msg?.text?.trim() === "/start" && msg.chat) {
      return { ok: true, chatId: msg.chat.id, name: chatDisplayName(msg.chat), approximate: true };
    }
  }

  return {
    ok: false,
    description:
      "Bu raqamga mos chat topilmadi. Telegramda botga /start yozib, kontaktingizni ulashing va qayta urinib ko'ring.",
  };
}

function readStoredTelegramBotSettings(): TelegramBotSettings | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.telegramBot ?? null;
  } catch {
    return null;
  }
}

function customerTypeLabel(type: Receipt["customerType"]) {
  return type === "nasiya" ? "Nasiya" : "Oddiy";
}

/** Kunlik sotuv chekining Telegramga yuboriladigan elektron ko'rinishi. */
export function formatReceiptForTelegram(receipt: Receipt): string {
  const lines: string[] = [];
  lines.push(`🧾 <b>Yangi sotuv — ${receipt.id}</b>`);
  lines.push(`🕒 ${new Date(receipt.date).toLocaleString("uz-UZ")}`);
  lines.push(`👤 Kassir: ${receipt.cashier}`);
  lines.push(
    `👥 Mijoz: ${customerTypeLabel(receipt.customerType)}${
      receipt.customerName ? ` — ${receipt.customerName}` : ""
    }`,
  );
  lines.push("");
  receipt.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.name} — ${item.qty} ${item.unit} × ${formatSom(item.price)} = ${formatSom(item.qty * item.price)}`,
    );
  });
  lines.push("");
  lines.push(`Oraliq summa: ${formatSom(receipt.subtotal)}`);
  if (receipt.discount > 0) lines.push(`Skidka: -${formatSom(receipt.discount)}`);
  lines.push(`<b>Jami: ${formatSom(receipt.total)}</b>`);
  if (receipt.customerType === "nasiya") {
    if (receipt.paidAmount) lines.push(`To'langan: ${formatSom(receipt.paidAmount)}`);
    if (receipt.debtAmount) lines.push(`Qarzga yozildi: ${formatSom(receipt.debtAmount)}`);
  }
  return lines.join("\n");
}

/**
 * Sotuv yakunlanganda admin Telegram botiga real vaqtda elektron chek yuboradi.
 * Bot ulanmagan/yoqilmagan bo'lsa — jim o'tkazib yuboriladi (xatolik chiqarilmaydi).
 */
export async function notifyAdminNewSale(receipt: Receipt): Promise<void> {
  const bot = readStoredTelegramBotSettings();
  if (!bot?.adminEnabled || !bot.adminToken || !bot.adminChatId) return;
  await sendTelegramMessage(bot.adminToken, bot.adminChatId, formatReceiptForTelegram(receipt));
}
