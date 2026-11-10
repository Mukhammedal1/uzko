# Admin Telegram bot — sxema mapping va arxitektura qarorlari

Bu hujjat "Telegram ERP bot" texnik topshirig'ining 1-bosqichi doirasida
yozildi: UZKO'dagi mavjud ma'lumot manbalarini o'rganib, tushunchalarni real
fayl/tip/maydonlarga bog'lash.

## 0. Arxitektura qarori (topshiriqdan chetlanish, sabab bilan)

Asl topshiriq **alohida backend** (Node.js + PostgreSQL + grammY + node-cron +
Gemini) taxmin qiladi. Foydalanuvchi bilan aniqlashtirilgach quyidagi qaror
qabul qilindi:

> **Bot hozircha shu UZKO frontend loyihasi ichida ishlaydi.** Alohida
> backend/PostgreSQL yaratilmaydi. "Baza" vazifasini `src/lib/mock-data.ts`
> dagi massivlar bajaradi (xuddi butun ilova UI'si ular bilan ishlagani kabi).

Bundan kelib chiqadigan cheklovlar (foydalanuvchiga ma'lum qilingan):

- **Server yo'q → doimiy fon jarayoni yo'q.** Bot tugmalariga javob berish
  (`getUpdates` polling) faqat UZKO ilovasi biror brauzer tab'ida ochiq
  turgan paytda ishlaydi. Do'kon kompyuterida ilova doim ochiq tursa — bot
  amalda "doim onlayn" bo'ladi, lekin bu server emas, brauzer sessiyasi.
- **node-cron yo'q.** Ertalabki hisobot (5-bosqich) va 5-daqiqalik
  ogohlantirishlar ham xuddi shunday — faqat ilova ochiq bo'lganda ishga
  tushadi (`setInterval` orqali). 24/7 kafolat kerak bo'lsa, kelajakda kichik
  doim-ishlaydigan backend (masalan Cloudflare Worker + cron trigger) qo'shish
  kerak bo'ladi — bu alohida qaror va alohida ish.
- **PostgreSQL yo'q → real ko'p-tenant yo'q.** UZKO — bitta do'kon uchun
  frontend-only ilova, `tenant_id` tushunchasi hozircha kerak emas (pastga
  qarang: "Ochiq savollar").
- **Gemini/AI chat, PDF, cron ogohlantirish — keyingi bosqichlar.**
  Foydalanuvchi hozircha faqat Telegram bot tokenini berdi ("shuning o'zi
  yetadi"), Gemini kaliti yo'q — shuning uchun 4-bosqich (AI chat + ovoz)
  keyinga qoldirildi.

**Muhim printsip saqlanadi:** tugmalar, kelajakdagi AI tool'lar va PDF bir xil
`src/lib/bot/reports.ts` funksiyalarini chaqiradi — shu orqali bir xil
davr/filtr uchun raqamlar hamma joyda 100% bir xil bo'lishi kafolatlanadi
(qabul mezoni, 12-band).

## 1. Tushuncha → fayl/tip/maydon mapping

| Tushuncha | UZKO'dagi manba |
|---|---|
| Savdo (chek) | `mock-data.ts` → `Receipt` (`MOCK_RECEIPTS`): `date, cashier, customerType, total, paidAmount, debtAmount, paymentBreakdown` |
| Savdo qatorlari | `Receipt.items: ReceiptItem[]` — `productId, name, qty, unit, price` |
| Tovar | `Product` (`MOCK_PRODUCTS`): `name, barcode, customCode, unit, minStockAlert, warehouse` |
| Qoldiq | `Product.vitrinaQty + Product.omborQty` (ikkalasi yig'indisi = umumiy qoldiq) |
| Mijoz (nasiya) | `CreditCustomer` (`MOCK_CREDIT_CUSTOMERS`): `firstName, lastName, phone, currentDebt, dueDate, receipts` |
| Mijoz (oddiy, doimiy) | `RegularCustomer` (`MOCK_REGULAR_CUSTOMERS`) — botning "Qarzlar" bo'limiga aloqasi yo'q, faqat nasiya mijozlar bilan ishlaydi |
| Nasiya / qarz | `CreditCustomer.currentDebt`, `CreditCustomer.receipts[]` (`CustomerDebtReceipt`, `type: "sale" | "payment" | "return"`), to'lovlar tarixi: `MOCK_DEBT_PAYMENTS` (`DebtPayment`) |
| Kassa | To'lov turlari bo'yicha: `Receipt.paymentBreakdown` (cash/card/transfer/wallet + `rows[]` — metod nomi bo'yicha batafsil); xarajatlar: `MOCK_WITHDRAWALS` (`CashWithdrawal`); kassa yopilishi/qoldig'i: `MOCK_CASH_CLOSES` (`CashClose.leftInRegister`) |
| Tenant | **Yo'q** — UZKO bitta do'kon uchun frontend-only ilova. `tenant_id` filtri kerak emas (pastga qarang). |

## 2. Biznes ta'riflari — qanday implementatsiya qilindi

Barchasi `src/lib/bot/reports.ts` va `src/lib/bot/period.ts` da:

| Atama | Qoida (kodda) |
|---|---|
| Nasiya savdo | `receipt.debtAmount > 0` (spec'dagi 1-variant: to'langan < umumiy) |
| To'langan savdo | `debtAmount` yo'q yoki `0` |
| Qisman to'langan nasiya | `debtAmount > 0` va `paidAmount > 0` — baribir "nasiya" guruhida, lekin to'langan qismi `paidTotal`ga qo'shiladi |
| Jami = To'langan + Nasiya | Har bir chek uchun `paid = paidAmount ?? (total - debt)`, `debt = debtAmount ?? 0` — shu ikkisi yig'indisi har doim `total`ga teng (test: `reports.test.ts`) |
| Muddati o'tgan qarz | `customer.dueDate < bugungi kun (Asia/Tashkent)` va `currentDebt > 0` |
| Tugagan tovar | `vitrinaQty + omborQty <= 0` |
| Tugayotgan tovar | qoldiq > 0 va (`qoldiq <= minStockAlert` **yoki** oxirgi 14 kunlik o'rtacha kunlik sotuvga nisbatan qolgan kun < 3) |
| Sotilmayotgan tovar (N kun) | qoldiq > 0 va oxirgi sotilgan sanadan beri >= N kun o'tgan |
| Muzlagan pul | sotilmayotgan tovar qoldig'i × `costPrice` |
| Foyda | `Σ (item.price − product.costPrice) × item.qty` — **⚠️ pastga qarang: taxminiy** |

Kun chegaralari, hafta (dushanbadan), oy, taqqoslash (bugun↔kecha va h.k.) —
barchasi `Asia/Tashkent` (doim UTC+5, DST yo'q) bo'yicha `period.ts`da, va
23:59/00:01 chegara holatlari `period.test.ts`da tekshirilgan.

## 3. Ochiq savollar / taxminlar (tasdiqlash kerak)

Topshiriqda "noaniq narsani taxmin qilma, so'ra" deyilgan — quyidagilarni
**taxmin qilib qo'ydim**, lekin ular tasdiqlanishi kerak:

1. **Foyda hisobi tarixiy emas.** `Receipt.items` da sotuv payti narxi (`price`)
   saqlanadi, lekin o'sha paytdagi **tannarx** saqlanmaydi. Hozir foyda joriy
   `Product.costPrice` bilan hisoblanmoqda — agar tannarx keyinchalik
   o'zgargan bo'lsa, eski davrlar uchun foyda noaniq bo'lishi mumkin. To'g'ri
   yechim: sotuv payti tannarxni ham chekka yozib qo'yish (`ReceiptItem`ga
   `costPriceAtSale` qo'shish) — bu alohida o'zgarish, hozircha qilinmadi.
2. **"Bekor qilingan savdo" tushunchasi yo'q.** `Receipt` da `cancelled`
   maydoni yo'q; `MOCK_RECEIPT_EDIT_HISTORY`da `action: "delete"` bor, lekin
   bu hozir `MOCK_RECEIPTS`dan haqiqiy o'chirish bilan bog'lanmagan. Hozircha
   barcha `MOCK_RECEIPTS` hisoblarga kiritiladi.
3. **"Kategoriya" = Ombor (`warehouse`).** Alohida tovar kategoriyasi maydoni
   yo'q — `get_stock`dagi `category` filtri `Product.warehouse` bo'yicha
   ishlaydi.
4. **Owner / Manager rollari hali yo'q.** Hozirgi UZKO'da qurilma darajasida
   `PermissionKey[]` tizimi bor (`boshqaruv.manage` va h.k.), lekin "profit
   ko'rish/ko'rmaslik" darajasidagi granulярlik yo'q. 2-bosqichda (auth) buni
   qanday belgilashni hal qilish kerak — masalan yangi `PermissionKey`:
   `"bot.viewProfit"`.
5. **Multi-tenant kerak emas deb qabul qilindi** — UZKO bitta do'kon uchun.
   Agar kelajakda bir nechta do'kon/filial UZKO'ning bitta nusxasini
   ishlatadigan bo'lsa, bu qarorni qayta ko'rib chiqish kerak bo'ladi.

## 4. Fayl tuzilmasi (hozirgacha)

```
src/lib/bot/
  period.ts         # Asia/Tashkent davr hisoblari, taqqoslash, sana parsing
  period.test.ts
  reports.ts         # get_sales_summary, get_sales_list, get_top_products,
                      # get_cash_summary, get_debts, find_customer,
                      # get_customer_debt, get_stock, find_product
  reports.test.ts
src/lib/telegram.ts   # Telegram Bot API (getMe, getUpdates, sendMessage) —
                       # admin bot ulash va real-vaqt sotuv xabarnomasi uchun
                       # (Boshqaruv → Integratsiya → Telegram bot)
```

## 5. Test qanday ishga tushiriladi

```bash
npm run test
```

`vitest.config.ts` — asosiy `vite.config.ts`dan alohida (TanStack Start/Nitro
plaginlari test muhitida keraksiz), faqat `@` alias va `src/**/*.test.ts`.

## 6. Keyingi bosqich (2-bosqich)

4 ta doimiy tugma (📊 Bugun · 💰 Kassa · 👥 Qarzlar · ⚠️ Zaxira) + inline
davr/filtr klaviaturalari + `getUpdates` polling — mavjud
"Boshqaruv → Integratsiya → Telegram bot → Admin uchun" ulanishiga ulanadi.
Hozircha shu bosqich boshlanmagan.
