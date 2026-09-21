import * as React from "react";
import { useApp } from "@/lib/app-context";
import { pollBotUpdates } from "@/lib/telegram";
import { defaultChatState, handleAdminBotUpdate, type ChatState } from "./adminBotMenu";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Admin Telegram botining "server"i — 4 ta tugma va inline klaviaturalarga
 * javob berish uchun Telegramni doimiy so'rab turadi (long polling).
 *
 * MUHIM CHEKLOV: UZKO'da alohida backend/server yo'q (frontend-only ilova),
 * shuning uchun bu faqat UZKO brauzer tab'ida ochiq turgan paytda ishlaydi.
 * Bu komponent butun ilova bo'ylab bir marta, `__root.tsx`da (AppProvider
 * ichida) render qilinadi — shuning uchun sahifadan sahifaga o'tganda ham
 * bot ishlashda davom etadi.
 *
 * BIR NECHTA TAB MUAMMOSI: agar shu sayt bir nechta tab/oynada ochiq bo'lsa,
 * har biri bir xil bot token bilan `getUpdates` so'rasa, Telegram 409
 * Conflict qaytaradi va javoblar takrorlanadi/aralashadi. Buning oldini olish
 * uchun Web Locks API orqali "faqat bitta tab navbatchi bo'lsin" qulfi
 * ishlatiladi — qulfni ushlagan tab yopilishi bilan navbatdagi tab avtomatik
 * uni oladi. API mavjud bo'lmagan brauzerlarda (juda eski) qulfsiz ishlaydi.
 */
export function AdminBotRuntime() {
  const { settings } = useApp();
  const { adminEnabled, adminToken, adminChatId } = settings.telegramBot;

  React.useEffect(() => {
    if (!adminEnabled || !adminToken || !adminChatId) return;

    let stopped = false;
    const state: { current: ChatState } = { current: defaultChatState() };

    async function runPollingLoop() {
      // Ilova qayta ochilganda eski (allaqachon ko'rilgan) xabarlarni qayta
      // ishlamaslik uchun avval navbatdagi eng oxirgi update_id'ni topamiz.
      let offset: number | undefined;
      const bootstrap = await pollBotUpdates(adminToken, undefined, 0);
      if (bootstrap.ok && bootstrap.result && bootstrap.result.length > 0) {
        offset = bootstrap.result[bootstrap.result.length - 1].update_id + 1;
      }

      while (!stopped) {
        const res = await pollBotUpdates(adminToken, offset, 25);
        if (stopped) break;
        if (!res.ok || !res.result) {
          await sleep(3000);
          continue;
        }
        for (const update of res.result) {
          offset = update.update_id + 1;
          try {
            state.current = await handleAdminBotUpdate(update, adminToken, adminChatId, state.current);
          } catch {
            // Bitta update ishlov berishda xato bo'lsa ham navbat davom etadi.
          }
        }
      }
    }

    // Qulf nomi tokenga bog'liq — shunda faqat bir xil bot uchun navbat hosil bo'ladi.
    const lockName = `uzko-admin-bot-poll:${adminToken}`;
    if (typeof navigator !== "undefined" && "locks" in navigator) {
      navigator.locks.request(lockName, { mode: "exclusive" }, () => {
        if (stopped) return Promise.resolve();
        return runPollingLoop();
      });
    } else {
      void runPollingLoop();
    }

    return () => {
      stopped = true;
    };
  }, [adminEnabled, adminToken, adminChatId]);

  return null;
}
