import type { PermissionKey } from "./app-context";

export type Currency = string;

export type Product = {
  id: string;
  name: string;
  image?: string;
  shelfLocation?: string;
  minStockAlert?: number;
  price: number; // sotuv narx — priceCurrency da
  priceCurrency?: Currency; // sotuv narx valyutasi (yo'q bo'lsa UZS)
  /** Tan narx ustiga qo'yilgan foiz — saqlansa, tan narx keyinchalik (masalan
   * prixod qilinganda) o'zgarganda sotuv narx shu foiz asosida qayta hisoblanadi. */
  priceMarkupPercent?: number;
  /** Vaqtinchalik chegirma — bo'lsa, `price` chegirmali narx, `originalPrice` esa asl narx.
   * `endDate` o'tgach chegirma avtomatik bekor qilinadi (bu haqda lib/discounts.ts ga qarang). */
  discount?: {
    originalPrice: number;
    percent: number;
    startDate: string; // yyyy-mm-dd
    endDate: string; // yyyy-mm-dd
  };
  wholesalePrice?: number; // optom narx — wholesaleCurrency da
  wholesaleCurrency?: Currency; // optom narx valyutasi (yo'q bo'lsa UZS)
  /** Tan narx ustiga qo'yilgan foiz — optom narx uchun, priceMarkupPercent kabi. */
  wholesaleMarkupPercent?: number;
  costPrice: number; // tan narx — costCurrency da (oxirgi prixod narxi)
  costCurrency: Currency; // tan narx valyutasi
  /** Og'irlikli o'rtacha tan narx — so'mda. Foyda/hisobotlar faqat shundan
   * hisoblanadi. Har bir prixodda `applyPurchaseToProduct` orqali qayta hisoblanadi;
   * qoldiq kamayganda (sotuv, qaytarish, komplekt) o'zgarmaydi. */
  avgCostPriceSom?: number;
  /** Faqat ma'lumot/monitoring uchun — oxirgi hisoblangan kursga nisbatan
   * `avgCostPriceSom`ning dollar ekvivalenti. Hisob-kitobga ta'sir qilmaydi. */
  avgCostPriceUsd?: number;
  /** Oxirgi prixodda qo'llanilgan valyuta kursi (tahlil uchun, ixtiyoriy). */
  avgCostCurrencyRate?: number;
  /** true bo'lsa — bu tovar tan narxidan past narxda sotilishiga yo'l qo'yilmaydi. */
  preventBelowCost?: boolean;
  barcode: string;
  customCode: string;
  unit: string;
  /**
   * Ikkinchi (qadoq) birligi — masalan tovar "dona | karobka" birlikda sotilsa,
   * `unit` = "dona", `packUnit` = "karobka". `perBox` — bitta qadoqdagi dona soni.
   */
  packUnit?: string;
  warehouse: string;
  vitrinaQty: number;
  omborQty: number;
  perBox?: number;
  /** POS UI'dagi "Tezkor tovarlar" panelida doim ko'rinib turadigan mahsulot */
  quick?: boolean;
  // sotuvlar tarixi (oddiy demo) — kunlik sotilgan miqdor (oxirgi N kun)
  salesHistory?: { date: string; qty: number }[];
  /**
   * Bitta tovarning bir necha ko'rinishi (rang / razmer / SKU). Bo'sh yoki
   * aniqlanmagan bo'lsa — tovar oddiy, variantsiz hisoblanadi. Har bir variant
   * o'z qoldig'i, shtrix-kodi va (ixtiyoriy) narxiga ega; ko'rsatilmagan
   * maydonlar ota-tovardan olinadi.
   */
  variants?: ProductVariant[];
  /** true bo'lsa — bu haqiqiy tovar emas, balki bir komplektni sotuvda
   * ko'rsatish uchun yaratilgan sintetik yozuv (`resolveKomplekt` natijasi). */
  isKomplekt?: boolean;
  /** `isKomplekt` true bo'lsa — qaysi `Komplekt.id`dan yasalganini bildiradi. */
  komplektId?: string;
};

export type ProductVariant = {
  id: string;
  /** Ko'rinadigan nom, masalan "Oq", "Qora", "3kg" */
  label: string;
  /** Ko'p o'lchovli atributlar, masalan { Rang: "Oq", Razmer: "3kg" } */
  attrs?: Record<string, string>;
  barcode?: string;
  customCode?: string;
  image?: string;
  price?: number;
  priceCurrency?: Currency;
  wholesalePrice?: number;
  wholesaleCurrency?: Currency;
  costPrice?: number;
  costCurrency?: Currency;
  avgCostPriceSom?: number;
  avgCostPriceUsd?: number;
  avgCostCurrencyRate?: number;
  vitrinaQty: number;
  omborQty?: number;
  minStockAlert?: number;
  perBox?: number;
};

export type Master = {
  cardNumber: string;
  firstName: string;
  lastName: string;
  balance: number;
};

export type CustomerType = "oddiy" | "nasiya";

export type CustomerObjectDebt = {
  id: string;
  name: string;
  debt: number;
};

export type CustomerDebtReceipt = {
  id: string;
  date: string;
  type: "sale" | "payment" | "return";
  status?: "paid" | "partial" | "unpaid";
  objectId?: string;
  objectName?: string;
  title: string;
  items: { name: string; qty: number; unit: string; amount: number }[];
  amount: number;
  paidAmount?: number;
  debtAmount?: number;
  note?: string;
};

export type CreditCustomer = {
  id: string;
  /** "individual" — jismoniy shaxs; "legal" — yuridik shaxs (tashkilot). */
  kind?: "individual" | "legal";
  /** Yuridik shaxs bo'lsa — tashkilot nomi. */
  companyName?: string;
  /** Yuridik shaxs bo'lsa — tashkilot STIR (INN). */
  inn?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  /** Qo'shimcha (qarindosh/ikkinchi) telefon raqami — eski format. */
  altPhone?: string;
  /** Qo'shimcha telefon raqamlari (istalgancha). */
  altPhones?: string[];
  /** JSHSHIR (PINFL) — 14 raqam. */
  jshshir?: string;
  /** Passport seriya va raqami, masalan "AA1234567". */
  passport?: string;
  /** Manzil yoki mo'ljal. */
  address?: string;
  /** Erkin qo'shimcha izoh. */
  note?: string;
  /** Mijoz rasmi — data URL yoki tashqi havola. */
  photo?: string;
  botEnabled?: boolean;
  role: "prorab" | "usta" | "mijoz";
  limit: number;
  limitCurrency?: Currency;
  currentDebt: number;
  dueDate?: string; // ISO yyyy-mm-dd — qarzni so'ndirish kuni
  objects?: CustomerObjectDebt[];
  receipts?: CustomerDebtReceipt[];
};

// === Kassa / sotuv tarixi ===

export type ReceiptItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  unit: string;
  source?: "catalog" | "one-time";
  note?: string;
  /** Sotuv paytidagi tovarning o'rtacha tan narxi (so'mda) — muhrlangan, o'zgarmas
   * qiymat. Keyinchalik `avgCostPriceSom` yangilansa ham, bu yozuv o'z vaqtidagi
   * tan narxini saqlab qoladi — shunda o'tgan davr hisobotlari buzilmaydi. */
  costPriceAtSaleSom?: number;
};

/** Bitta to'lov usuli bo'yicha real yozuv — kassa hisobotlarida batafsil ko'rsatish uchun. */
export type PaymentBreakdownRow = {
  methodId: string;
  methodName: string;
  amountSom: number;
  currency?: string;
  currencyAmount?: number;
  rate?: number;
  rateSource?: "system" | "manual";
  /** Terminal (karta) to'lovlarida — "Humo" | "Uzcard" */
  cardType?: string;
};

export type Receipt = {
  id: string; // chek raqami
  date: string; // ISO datetime
  cashier: string;
  /** Savdoni yakunlagan xodim (kod orqali tasdiqlangan) — sotuv hisobotlari uchun. */
  employeeId?: string;
  employeeName?: string;
  /** Pul kirimi qaysi qo'shimcha kassaga tegishli ekani — smena yopishda shu kassa bo'yicha hisoblanadi. */
  kassaId?: string;
  customerType: "oddiy" | "nasiya";
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount?: number;
  debtAmount?: number;
  paymentBreakdown?: {
    cash: number;
    card: number;
    /** Bank orqali o'tkazma */
    transfer?: number;
    /** Elektron hamyon (Click, Payme va h.k.) */
    wallet?: number;
    currencyAmount: number;
    currencyCode?: string;
    currencyInSom: number;
    rows?: PaymentBreakdownRow[];
  };
  editedAt?: string;
};

export type EditedReceiptHistory = {
  id: string;
  date: string; // tahrir/o'chirish vaqti
  editedBy: string;
  receiptId: string;
  action: "edit" | "delete";
  oldTotal: number;
  newTotal: number;
  changes?: { field: string; label: string; oldValue: string; newValue: string }[];
};

export const MOCK_RECEIPT_EDIT_HISTORY: EditedReceiptHistory[] = [];

export type OneTimeItemHistory = {
  id: string;
  date: string;
  receiptId: string;
  cashier: string;
  items: {
    name: string;
    qty: number;
    unit: string;
    price: number;
    note?: string;
  }[];
  total: number;
};

export type CashClose = {
  id: string;
  date: string;
  cashier: string;
  /** Yopilgan qo'shimcha kassa. */
  kassaId?: string;
  cash: number;
  cards: { type: string; amount: number }[];
  currencies: { code: Currency; amount: number }[];
  shortage: number; // kamomat
  leftInRegister: number; // kassada qoldi
  /** Shu kassadan shu kun ichida qilingan chiqimlar (harajatlar) yig'indisi — yopish vaqtida hisoblab qotiriladi. */
  expenses?: number;
  /** Shu kassa bo'yicha shu kunlik jami tushum (naqd + karta + o'tkazma + hamyon + valyuta). */
  totalSales?: number;
  note?: string;
};

// ─── Kassalar (asosiy kassa + qo'shimcha kassalar) ─────────────────────────
//
// Do'konda kunlik savdolar qo'shimcha kassa(lar) orqali o'tadi. Kun yakunida
// kassir ertasi kun uchun o'zida qoldirmoqchi bo'lgan summadan tashqarisini
// asosiy kassaga o'tkazadi. Har bir kassaning joriy balansi shu kassaga
// tegishli KassaTransaction'lar yig'indisidan hisoblanadi (kassaBalance()).

export type Kassa = {
  id: string;
  name: string;
  kind: "asosiy" | "qoshimcha";
  createdAt: string;
  /** Smena yopilishida kassada standart qoldiriladigan summa (so'm). Admin belgilaydi. */
  defaultLeftover?: number;
  /** Kassir yopish paytida shu summani o'zi o'zgartira olsinmi — standart holatda yo'q (admin ruxsat bersa yoqiladi). */
  allowSelfLeftover?: boolean;
};

export type KassaTransaction = {
  id: string;
  kassaId: string;
  date: string;
  type: "kirim" | "chiqim";
  amount: number; // doim musbat — ishora `type` orqali aniqlanadi
  note?: string;
  cashier: string;
  /** Kassalar orasidagi o'tkazma bo'lsa — qarama-qarshi kassa */
  counterpartKassaId?: string;
  counterpartKassaName?: string;
};

export const MOCK_KASSALAR: Kassa[] = [
  {
    id: "kassa-asosiy",
    name: "Asosiy kassa",
    kind: "asosiy",
    createdAt: new Date("2026-01-01T00:00:00").toISOString(),
  },
  {
    id: "kassa-1",
    name: "Do'kon kassasi",
    kind: "qoshimcha",
    createdAt: new Date("2026-01-01T00:00:00").toISOString(),
    defaultLeftover: 500_000,
    allowSelfLeftover: false,
  },
];

export const MOCK_KASSA_TRANSACTIONS: KassaTransaction[] = [
  {
    id: "KT-0001",
    kassaId: "kassa-1",
    date: new Date("2026-05-07T09:00:00").toISOString(),
    type: "kirim",
    amount: 3_250_000,
    note: "Boshlang'ich balans",
    cashier: "Sardor",
  },
];

export function kassaBalance(kassaId: string): number {
  return MOCK_KASSA_TRANSACTIONS.filter((t) => t.kassaId === kassaId).reduce(
    (s, t) => s + (t.type === "kirim" ? t.amount : -t.amount),
    0,
  );
}

/** Qurilmaga biriktirilgan kassa yo'q/bo'lmasa — birinchi qo'shimcha kassaga tushadi. */
export function resolveKassaId(deviceKassaId: string | undefined): string | undefined {
  if (deviceKassaId && MOCK_KASSALAR.some((k) => k.id === deviceKassaId)) return deviceKassaId;
  return MOCK_KASSALAR.find((k) => k.kind === "qoshimcha")?.id;
}

export type CashWithdrawal = {
  id: string;
  date: string;
  cashier: string;
  category: string;
  /** Pul qaysi qo'shimcha kassadan chiqqani — kassa yopishda harajat sifatida hisoblanadi. */
  kassaId?: string;
  cash: number;
  cardAmount: number;
  currencies: { code: Currency; amount: number }[];
  note?: string;
  supplierId?: string;
  employeeId?: string;
  employeeName?: string;
};

export type Employee = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  role: string;
  roles?: string[];
  status: "active" | "vacation" | "inactive";
  phone?: string;
  phone2?: string;
  birthDate: string;
  passport?: string;
  /** Ishga kirgan sana — "faoliyat muddati" shundan hisoblanadi. */
  hireDate?: string;
  monthlySalary: number;
  workDays?: number;
  workHoursPerDay?: number;
  payType?: "fixed" | "fixed_plus_sales";
  salesPercent?: number;
  source: "device" | "manual";
  deviceLogin?: string;
  devicePassword?: string;
  /** Savdoni yakunlashda kiritiladigan tasdiqlash kodi — shu orqali sotuv xodimga biriktiriladi. */
  code?: string;
};

// ─── Xodimga pul operatsiyasi (oylik / avans / bonus / jarima) ─────────────

export type EmployeePaymentKind = "Oylik" | "Avans" | "Bonus" | "Jarima";

export type EmployeePayment = {
  id: string;
  employeeId: string;
  employeeName: string;
  kind: EmployeePaymentKind;
  amount: number;
  date: string; // ISO datetime
  note?: string;
  cashier: string;
  /** kassa — summa kassadan chiqim sifatida yoziladi; boshqa — kassaga tegilmaydi. */
  source: "kassa" | "boshqa";
};

export const MOCK_EMPLOYEE_PAYMENTS: EmployeePayment[] = [
  {
    id: "EP-0001",
    employeeId: "X-001",
    employeeName: "Akmal Karimov",
    kind: "Bonus",
    amount: 250000,
    date: new Date("2026-05-03T18:30:00").toISOString(),
    note: "Reja bajarilgani uchun",
    cashier: "Sardor",
    source: "kassa",
  },
  {
    id: "EP-0002",
    employeeId: "X-002",
    employeeName: "Madina Sobirova",
    kind: "Avans",
    amount: 300000,
    date: new Date("2026-05-06T12:05:00").toISOString(),
    note: "Avans",
    cashier: "Aziz",
    source: "kassa",
  },
];

// ─── Modul ruxsatlari (qurilma → xodim) ─────────────────────────────────────

export const PERMISSION_GROUPS: {
  module: string;
  perms: { key: PermissionKey; label: string }[];
}[] = [
  {
    module: "Sotuv",
    perms: [
      { key: "sotuv.create", label: "Sotuv qilish" },
      { key: "sotuv.view", label: "Sotuvlarni ko'rish" },
    ],
  },
  {
    module: "Kassa",
    perms: [
      { key: "kassa.view", label: "Kassani ko'rish" },
      { key: "kassa.close", label: "Kassani yopish" },
      { key: "kassa.withdraw", label: "Kassadan pul chiqarish" },
    ],
  },
  {
    module: "Tovarlar",
    perms: [
      { key: "tovarlar.view", label: "Tovarlarni ko'rish" },
      { key: "tovarlar.create", label: "Tovar qo'shish" },
      { key: "tovarlar.edit", label: "Tovarni tahrirlash" },
    ],
  },
  {
    module: "Nasiya",
    perms: [
      { key: "nasiya.view", label: "Nasiyalarni ko'rish" },
      { key: "nasiya.close", label: "Qarzdorlikni yopish" },
    ],
  },
  {
    module: "Hisobotlar",
    perms: [{ key: "hisobotlar.view", label: "Hisobotlarni ko'rish" }],
  },
  {
    module: "Boshqaruv",
    perms: [{ key: "boshqaruv.manage", label: "Boshqaruv (to'liq)" }],
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  Kassir: ["sotuv.create", "sotuv.view", "kassa.view", "kassa.close"],
  Sotuvchi: ["sotuv.create", "sotuv.view"],
  Omborchi: ["tovarlar.view", "tovarlar.create", "tovarlar.edit"],
  Menejer: ["sotuv.view", "kassa.view", "tovarlar.view", "nasiya.view", "hisobotlar.view"],
};

export type DebtPayment = {
  id: string;
  date: string;
  cashier: string;
  customerId: string;
  customerName: string;
  amount: number;
  method: "naqd" | "karta" | "valyuta" | "otkazma" | "click" | "payme";
  cardType?: string;
  currencyCode?: string;
  note?: string;
  objectId?: string;
  objectName?: string;
};

/**
 * Nasiyachi yoki yetkazib beruvchi bilan qilingan pul operatsiyasi.
 * Nasiyachi uchun — faqat qarz so'ndirish (kassaga kirim).
 * Yetkazib beruvchi uchun — faqat to'lov (kassadan yoki ixtiyoriy manbadan chiqim).
 * Har bir operatsiya shu yerda saqlanadi va lupa ("cheklarni ko'rish") oynasida
 * tarix sifatida ko'rsatiladi.
 */
export type MoneyOperation = {
  id: string;
  date: string;
  cashier: string;
  party: "nasiyachi" | "yetkazib_beruvchi";
  partyId: string;
  partyName: string;
  partyPhone?: string;
  /** in — pul kassaga kirdi (nasiyachi to'lovi), out — chiqim (yetkazib beruvchiga to'lov) */
  direction: "in" | "out";
  /** yetkazib beruvchi uchun: "kassa" — kassadan chiqim; "boshqa" — ixtiyoriy tashqi manba */
  source?: "kassa" | "boshqa";
  amount: number;
  method: "naqd" | "karta" | "valyuta" | "otkazma" | "click" | "payme";
  cardType?: string;
  currencyCode?: string;
  note?: string;
  /** Operatsiyadan keyingi qarz balansi (nasiyachi qarzi yoki bizning yetkazib beruvchiga qarzimiz) */
  balanceAfter: number;
};

export const MOCK_MONEY_OPERATIONS: MoneyOperation[] = [];

export type ReturnReceipt = {
  id: string;
  date: string;
  cashier: string;
  customerType: "oddiy" | "nasiya" | "yetkazib_beruvchi";
  customerId?: string;
  customerName: string;
  supplierId?: string;
  supplierName?: string;
  supplierPhone?: string;
  objectId?: string;
  objectName?: string;
  items: ReceiptItem[];
  subtotal: number;
  total: number;
  reason?: string;
  cashWithdrawalId?: string;
  editedAt?: string;
  editedBy?: string;
};

export type RegularCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string;
  lastReceiptAt?: string;
};

/**
 * Skidka qaysi tovarlarga qo'llanishini belgilaydi:
 * - "all": barcha tovarlarga
 * - "selected": faqat `discountProductIds`da ko'rsatilgan tovarlarga
 * - "excluded": barcha tovarlarga, `discountProductIds`dagilardan tashqari
 */
export type LoyalDiscountScope = "all" | "selected" | "excluded";

/** Sodiq mijoz — doimiy savdodan cashback to'playdi va mahsulotlardan doimiy skidkaga ega. */
export type LoyalCustomer = {
  id: string;
  /** Cashback karta raqami — mijoz shu orqali (yoki tel/ism-familya bo'yicha) topiladi
   * va savdo yakunida shu raqam bilan sodiq mijoz ekanini tasdiqlaydi. */
  cardNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  discountPercent: number; // mahsulotlardan doimiy skidka, %
  discountScope: LoyalDiscountScope;
  discountProductIds?: string[]; // scope "selected"/"excluded" bo'lganda ishlatiladigan tovar id'lari
  cashbackPercent: number; // har bir savdodan to'planadigan cashback, %
  cashbackBalance: number; // hozircha ishlatilmagan, to'plangan cashback (so'mda)
  totalSpent: number; // umumiy xarid summasi (so'mda)
  joinedAt: string;
  note?: string;
};

/** Berilgan mahsulotga sodiq mijoz skidkasi tegishlimi — scope'ga qarab hisoblaydi. */
export function loyalDiscountAppliesTo(customer: LoyalCustomer, productId: string): boolean {
  const ids = customer.discountProductIds ?? [];
  if (customer.discountScope === "selected") return ids.includes(productId);
  if (customer.discountScope === "excluded") return !ids.includes(productId);
  return true;
}

export type ReceiptDispatchLog = {
  id: string;
  date: string;
  recipientCategory: "oddiy" | "nasiya" | "yetkazib_beruvchi";
  recipientId?: string;
  recipientName: string;
  phone: string;
  receiptId: string;
  title: string;
  total: number;
  note?: string;
};

export const MOCK_RECEIPTS: Receipt[] = [
  {
    id: "CHK-100231",
    date: new Date("2026-05-07T09:14:00").toISOString(),
    cashier: "Sardor",
    customerType: "oddiy",
    items: [
      { productId: "p1", name: "Sement M400 50kg", price: 12000, qty: 2, unit: "dona" },
      { productId: "p4", name: "Gipsokarton 12.5mm", price: 5000, qty: 3, unit: "dona" },
      {
        productId: "one-time-demo-1",
        name: "Yetkazib berish xizmati",
        price: 25000,
        qty: 1,
        unit: "dona",
        source: "one-time",
        note: "Mijoz manziliga olib borildi",
      },
    ],
    subtotal: 64000,
    discount: 0,
    total: 64000,
  },
  {
    id: "CHK-100232",
    date: new Date("2026-05-07T10:42:00").toISOString(),
    cashier: "Aziz",
    customerType: "nasiya",
    customerId: "c2",
    customerName: "Olim Yusupov",
    customerPhone: "+998901234567",
    items: [
      { productId: "p15", name: "Sement M500 50kg", price: 32000, qty: 4, unit: "litr" },
      {
        productId: "one-time-demo-2",
        name: "Mayda fiting komplekt",
        price: 7000,
        qty: 3,
        unit: "dona",
        source: "one-time",
        note: "Bazadagi aniq nom topilmadi",
      },
    ],
    subtotal: 149000,
    discount: 8000,
    total: 141000,
  },
  {
    id: "CHK-100233",
    date: new Date("2026-05-07T12:05:00").toISOString(),
    cashier: "Sardor",
    customerType: "oddiy",
    items: [
      { productId: "p13", name: "Kabel VVG 2x2.5", price: 35000, qty: 1, unit: "dona" },
      { productId: "p14", name: "Rozetka ichki", price: 48000, qty: 1, unit: "dona" },
      {
        productId: "one-time-demo-3",
        name: "Kesish xizmati",
        price: 12000,
        qty: 2,
        unit: "metr",
        source: "one-time",
        note: "Profil kesildi",
      },
      {
        productId: "one-time-demo-4",
        name: "Qo'shimcha bolt",
        price: 1500,
        qty: 8,
        unit: "dona",
        source: "one-time",
      },
    ],
    subtotal: 119000,
    discount: 0,
    total: 119000,
  },
];

export const MOCK_ONE_TIME_ITEMS: OneTimeItemHistory[] = [
  {
    id: "BM-0001",
    date: new Date("2026-05-07T09:36:00").toISOString(),
    receiptId: "CHK-100231",
    cashier: "Sardor",
    items: [
      {
        name: "Yetkazib berish xizmati",
        qty: 1,
        unit: "dona",
        price: 25000,
        note: "Mijoz manziliga olib borildi",
      },
    ],
    total: 25000,
  },
  {
    id: "BM-0002",
    date: new Date("2026-05-07T11:18:00").toISOString(),
    receiptId: "CHK-100232",
    cashier: "Aziz",
    items: [
      {
        name: "Mayda fiting komplekt",
        qty: 3,
        unit: "dona",
        price: 7000,
        note: "Bazadagi aniq nom topilmadi",
      },
    ],
    total: 21000,
  },
  {
    id: "BM-0003",
    date: new Date("2026-05-07T12:10:00").toISOString(),
    receiptId: "CHK-100233",
    cashier: "Sardor",
    items: [
      { name: "Kesish xizmati", qty: 2, unit: "metr", price: 12000, note: "Profil kesildi" },
      { name: "Qo'shimcha bolt", qty: 8, unit: "dona", price: 1500 },
    ],
    total: 36000,
  },
];

export const MOCK_CASH_CLOSES: CashClose[] = [
  {
    id: "KY-0001",
    date: new Date("2026-05-07T19:15:00").toISOString(),
    cashier: "Sardor",
    cash: 850000,
    cards: [
      { type: "Humo", amount: 420000 },
      { type: "Uzcard", amount: 310000 },
    ],
    currencies: [],
    shortage: 0,
    leftInRegister: 150000,
    note: "Kun oxiri yopildi",
  },
  {
    id: "KY-0002",
    date: new Date("2026-05-06T19:05:00").toISOString(),
    cashier: "Aziz",
    cash: 640000,
    cards: [{ type: "Visa", amount: 260000 }],
    currencies: [],
    shortage: 15000,
    leftInRegister: 100000,
    note: "Smena yopildi",
  },
];

export const MOCK_WITHDRAWALS: CashWithdrawal[] = [
  {
    id: "CH-0001",
    date: new Date("2026-05-07T13:20:00").toISOString(),
    cashier: "Sardor",
    category: "Kommunal",
    cash: 180000,
    cardAmount: 0,
    currencies: [],
    note: "Elektr to'lovi",
  },
  {
    id: "CH-0002",
    date: new Date("2026-05-07T15:40:00").toISOString(),
    cashier: "Aziz",
    category: "Yetkazib beruvchilarga to'lov",
    cash: 500000,
    cardAmount: 0,
    currencies: [],
    note: "Yetkazib beruvchi qarzi qisman yopildi",
    supplierId: "YB-0001",
  },
  {
    id: "CH-0003",
    date: new Date("2026-05-05T10:10:00").toISOString(),
    cashier: "Sardor",
    category: "Transport",
    cash: 75000,
    cardAmount: 0,
    currencies: [],
    note: "Yetkazib berish",
  },
  {
    id: "CH-0004",
    date: new Date("2026-05-07T17:20:00").toISOString(),
    cashier: "Sardor",
    category: "Oylik",
    cash: 1200000,
    cardAmount: 0,
    currencies: [],
    note: "May oyi uchun qisman oylik",
    employeeId: "X-001",
    employeeName: "Akmal Karimov",
  },
  {
    id: "CH-0005",
    date: new Date("2026-05-06T12:05:00").toISOString(),
    cashier: "Aziz",
    category: "Avans",
    cash: 300000,
    cardAmount: 0,
    currencies: [],
    note: "Avans",
    employeeId: "X-002",
    employeeName: "Madina Sobirova",
  },
  {
    id: "CH-0006",
    date: new Date("2026-05-03T18:30:00").toISOString(),
    cashier: "Sardor",
    category: "Premya",
    cash: 250000,
    cardAmount: 0,
    currencies: [],
    note: "Reja bajarilgani uchun",
    employeeId: "X-001",
    employeeName: "Akmal Karimov",
  },
];

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "X-001",
    name: "Akmal Karimov",
    role: "Sotuvchi",
    status: "active",
    phone: "+998901112200",
    birthDate: "1996-04-12",
    monthlySalary: 3500000,
    source: "manual",
    code: "1234",
    hireDate: "2023-03-10",
  },
  {
    id: "X-002",
    name: "Madina Sobirova",
    role: "Kassir",
    status: "active",
    phone: "+998935557700",
    birthDate: "1998-09-03",
    monthlySalary: 4200000,
    source: "manual",
    code: "2345",
    hireDate: "2022-07-01",
  },
  {
    id: "X-003",
    name: "Javohir Tursunov",
    role: "Omborchi",
    status: "vacation",
    phone: "+998977771122",
    birthDate: "1994-01-24",
    monthlySalary: 3000000,
    source: "manual",
    code: "3456",
    hireDate: "2024-01-15",
  },
  {
    id: "X-004",
    name: "Dilnoza Qodirova",
    role: "Menejer",
    status: "active",
    phone: "+998909998877",
    birthDate: "1992-11-18",
    monthlySalary: 5200000,
    source: "manual",
    code: "4567",
    hireDate: "2021-05-20",
  },
  {
    id: "X-005",
    name: "Admin",
    role: "Asosiy qurilma",
    status: "active",
    phone: "+998900000001",
    birthDate: "1990-02-08",
    monthlySalary: 6000000,
    source: "device",
    deviceLogin: "admin",
  },
  {
    id: "X-006",
    name: "Kassa 2",
    role: "Kassir qurilmasi",
    status: "active",
    phone: "+998900000002",
    birthDate: "1997-06-30",
    monthlySalary: 3800000,
    source: "device",
    deviceLogin: "kassa2",
  },
  {
    id: "X-007",
    name: "Ombor 3",
    role: "Ombor qurilmasi",
    status: "inactive",
    phone: "+998900000003",
    birthDate: "1995-12-05",
    monthlySalary: 3300000,
    source: "device",
    deviceLogin: "ombor3",
  },
  {
    id: "X-008",
    name: "Sardor Tursunov",
    role: "Sotuvchi",
    status: "active",
    phone: "+998946661010",
    birthDate: "1999-03-15",
    monthlySalary: 3600000,
    payType: "fixed_plus_sales",
    salesPercent: 2,
    source: "manual",
  },
  {
    id: "X-009",
    name: "Nodir Saidov",
    role: "Yetkazuvchi",
    status: "active",
    phone: "+998971112244",
    birthDate: "1993-08-21",
    monthlySalary: 3100000,
    source: "manual",
  },
  {
    id: "X-010",
    name: "Sevara Aliyeva",
    role: "Hisobchi",
    status: "vacation",
    phone: "+998901234400",
    birthDate: "1991-10-09",
    monthlySalary: 4800000,
    source: "manual",
  },
];

export const MOCK_DEBT_PAYMENTS: DebtPayment[] = [
  {
    id: "QS-0001",
    date: new Date("2026-05-07T11:30:00").toISOString(),
    cashier: "Sardor",
    customerId: "c1",
    customerName: "Olim Yusupov",
    amount: 350000,
    method: "naqd",
  },
  {
    id: "QS-0002",
    date: new Date("2026-05-06T16:25:00").toISOString(),
    cashier: "Aziz",
    customerId: "c2",
    customerName: "Jasur Rahimov",
    amount: 220000,
    method: "karta",
  },
];

export const EXPENSE_CATEGORIES = [
  "Tushlik",
  "Oylik",
  "Avans",
  "Premya",
  "Remont",
  "Tovar",
  "Kommunal",
  "Transport",
  "Tovar qaytarish",
  "Yetkazib beruvchilarga to'lov",
  "Boshqa",
];

// Demo sotuvlar tarixi generatori
function genHistory(days: number, avg: number): { date: string; qty: number }[] {
  const out: { date: string; qty: number }[] = [];
  const now = new Date("2026-05-06T00:00:00Z");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const noise = Math.round((Math.sin(i * 1.7 + avg) + 1) * avg);
    out.push({ date: d.toISOString().slice(0, 10), qty: Math.max(0, noise) });
  }
  return out;
}

// Demo mahsulot rasmi — ombor turi bo'yicha rangli SVG belgi (real rasm o'rniga, offline ishlaydi)
const CATEGORY_IMAGE: Record<string, { bg: string; emoji: string }> = {
  "Quruq aralashmalar": { bg: "#e4d9c4", emoji: "🧱" },
  "Bo'yoq ombori": { bg: "#cfe0f3", emoji: "🎨" },
  "Armatura ombori": { bg: "#d3d8e0", emoji: "🔩" },
  "Elektr ombori": { bg: "#f6ecb8", emoji: "💡" },
  "Santexnika ombori": { bg: "#c9e8ec", emoji: "🚿" },
  "Asosiy ombor": { bg: "#ddcdb2", emoji: "📦" },
  "Tashqi maydon": { bg: "#f0cda0", emoji: "🧱" },
  "Asboblar ombori": { bg: "#e0dce8", emoji: "🛠️" },
};

function placeholderProductImage(product: Pick<Product, "warehouse">): string {
  const category = CATEGORY_IMAGE[product.warehouse] ?? { bg: "#dde3ec", emoji: "📦" };
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">` +
    `<rect width="200" height="200" rx="20" fill="${category.bg}"/>` +
    `<text x="50%" y="54%" font-size="92" text-anchor="middle" dominant-baseline="middle">${category.emoji}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Sement M400 50kg",
    minStockAlert: 30,
    price: 65000,
    costPrice: 54000,
    costCurrency: "UZS",
    barcode: "4781000000001",
    customCode: "QM001",
    unit: "qop",
    warehouse: "Quruq aralashmalar",
    vitrinaQty: 83,
    omborQty: 420,
    perBox: 20,
    packUnit: "karobka",
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p2",
    name: "Plitka kley 25kg",
    price: 54000,
    costPrice: 42000,
    costCurrency: "UZS",
    barcode: "4781000000002",
    customCode: "QM002",
    unit: "qop",
    warehouse: "Quruq aralashmalar",
    vitrinaQty: 46,
    omborQty: 180,
    perBox: 40,
    packUnit: "karobka",
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p3",
    name: "Qum yuvilgan",
    price: 180000,
    costPrice: 140000,
    costCurrency: "UZS",
    barcode: "4781000000003",
    customCode: "QM003",
    unit: "kub",
    warehouse: "Asosiy ombor",
    vitrinaQty: 24,
    omborQty: 96,
    salesHistory: genHistory(60, 1),
  },
  {
    id: "p4",
    name: "Armatura 12mm",
    price: 14500,
    costPrice: 12200,
    costCurrency: "UZS",
    barcode: "4781000000004",
    customCode: "QM004",
    unit: "kg",
    warehouse: "Metall ombori",
    vitrinaQty: 640,
    omborQty: 2400,
    salesHistory: genHistory(60, 15),
  },
  {
    id: "p5",
    name: "Keramogranit 60x60",
    image: "/products/keramogranit.webp",
    price: 92000,
    costPrice: 74000,
    costCurrency: "UZS",
    barcode: "4781000000005",
    customCode: "QM005",
    unit: "kv.m",
    warehouse: "Kafel ombori",
    vitrinaQty: 58,
    omborQty: 210,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p6",
    name: "Truba PPR 20mm",
    price: 16500,
    costPrice: 12500,
    costCurrency: "UZS",
    barcode: "4781000000006",
    customCode: "SN006",
    unit: "metr",
    warehouse: "Santexnika ombori",
    vitrinaQty: 310,
    omborQty: 940,
    salesHistory: genHistory(60, 6),
  },
  {
    id: "p7",
    name: "Kran sharli 20mm",
    minStockAlert: 15,
    price: 38000,
    costPrice: 29000,
    costCurrency: "UZS",
    barcode: "4781000000007",
    customCode: "SN007",
    unit: "dona",
    warehouse: "Santexnika ombori",
    vitrinaQty: 27,
    omborQty: 95,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p8",
    name: "Smesitel oshxona",
    image: "/products/smesitel.webp",
    price: 165000,
    costPrice: 128000,
    costCurrency: "UZS",
    barcode: "4781000000008",
    customCode: "SN008",
    unit: "dona",
    warehouse: "Santexnika ombori",
    vitrinaQty: 16,
    omborQty: 40,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p9",
    name: "Unitaz komplekt",
    image: "/products/unitaz.webp",
    minStockAlert: 5,
    price: 890000,
    costPrice: 710000,
    costCurrency: "UZS",
    barcode: "4781000000009",
    customCode: "SN009",
    unit: "dona",
    warehouse: "Santexnika ombori",
    vitrinaQty: 9,
    omborQty: 22,
    salesHistory: genHistory(60, 1),
  },
  {
    id: "p10",
    name: "Samorez mix (turli o'lcham)",
    price: 42000,
    costPrice: 32000,
    costCurrency: "UZS",
    barcode: "4781000000010",
    customCode: "QM010",
    unit: "kg",
    warehouse: "Asosiy ombor",
    vitrinaQty: 98,
    omborQty: 410,
    salesHistory: genHistory(60, 6),
    variants: [
      {
        id: "v25",
        label: "25mm",
        barcode: "4781000000011",
        customCode: "QM010-25",
        price: 42000,
        wholesalePrice: 38640,
        costPrice: 32000,
        vitrinaQty: 26,
        omborQty: 110,
      },
      {
        id: "v35",
        label: "35mm",
        barcode: "4781000000012",
        customCode: "QM010-35",
        price: 44000,
        wholesalePrice: 40480,
        costPrice: 33500,
        vitrinaQty: 24,
        omborQty: 100,
      },
      {
        id: "v45",
        label: "45mm",
        barcode: "4781000000013",
        customCode: "QM010-45",
        price: 47000,
        wholesalePrice: 43240,
        costPrice: 36000,
        vitrinaQty: 28,
        omborQty: 115,
      },
      {
        id: "v50",
        label: "50mm",
        barcode: "4781000000014",
        customCode: "QM010-50",
        price: 49000,
        wholesalePrice: 45080,
        costPrice: 37500,
        vitrinaQty: 20,
        omborQty: 85,
      },
    ],
  },
].map((product: Product, index: number) => ({
  ...product,
  wholesalePrice:
    product.wholesalePrice ??
    Math.max(0, Math.round(product.price * (product.price > 5000 ? 0.92 : 0.95))),
  image: product.image ?? placeholderProductImage(product),
  // Demo: polka bo'yicha filtr ishlashi uchun har bir tovarga ombor kodi + raqamli polka biriktiriladi.
  shelfLocation:
    product.shelfLocation ||
    `${(product.warehouse.replace(/[^A-Za-z]/g, "").slice(0, 3) || "OMB").toUpperCase()}-${String(
      (index % 15) + 1,
    ).padStart(2, "0")}`,
}));

/** Demo ta'minotchi yetkazib beruvchilar — tovarlarni yetkazib beruvchi bo'yicha filtrlash uchun. */
const DEMO_SUPPLY_SUPPLIERS = ["Bekzod Ta'minot", "Sardor Ta'minot", "Jasur Logistika"];

/**
 * Tovar nomi bo'yicha uni yetkazib bergan yetkazib beruvchini qaytaradi: avval haqiqiy
 * prixod/ta'minot tarixidan, topilmasa — nom bo'yicha barqaror demo taqsimoti.
 */
export function getSupplierForProductName(productName: string): string {
  for (const entry of MOCK_PRODUCT_HISTORY) {
    if (entry.productName === productName && entry.supplierName) return entry.supplierName;
  }
  for (const report of MOCK_SUPPLIER_REPORTS) {
    if (report.supplierName && report.items.some((item) => item.productName === productName)) {
      return report.supplierName;
    }
  }
  let hash = 0;
  for (let i = 0; i < productName.length; i += 1) {
    hash = (hash * 31 + productName.charCodeAt(i)) | 0;
  }
  return DEMO_SUPPLY_SUPPLIERS[Math.abs(hash) % DEMO_SUPPLY_SUPPLIERS.length];
}

export const MOCK_MASTERS: Master[] = [
  { cardNumber: "1001", firstName: "Akmal", lastName: "Karimov", balance: 245000 },
  { cardNumber: "1002", firstName: "Sardor", lastName: "Tursunov", balance: 180000 },
  { cardNumber: "1003", firstName: "Bekzod", lastName: "Aliyev", balance: 92000 },
];

export const MOCK_CREDIT_CUSTOMERS: CreditCustomer[] = [
  {
    id: "c1",
    firstName: "Olim",
    lastName: "Yusupov",
    phone: "+998901234567",
    role: "prorab",
    limit: 5000000,
    limitCurrency: "UZS",
    currentDebt: 1250000,
    dueDate: "2026-05-20",
    receipts: [
      {
        id: "N-1001",
        date: new Date("2026-05-06T10:42:00").toISOString(),
        type: "sale",
        title: "Nasiya savdo",
        items: [{ name: "Sement M500 50kg", qty: 4, unit: "litr", amount: 120000 }],
        amount: 120000,
        note: "Chek CHK-100232",
      },
      {
        id: "T-1002",
        date: new Date("2026-05-07T11:30:00").toISOString(),
        type: "payment",
        title: "Qarz so'ndirish",
        items: [],
        amount: -350000,
        note: "Naqd to'lov",
      },
    ],
  },
  {
    id: "c2",
    firstName: "Jasur",
    lastName: "Rahimov",
    phone: "+998935551122",
    role: "usta",
    limit: 2000000,
    limitCurrency: "UZS",
    currentDebt: 1850000,
    dueDate: "2026-05-09",
    receipts: [
      {
        id: "N-2001",
        date: new Date("2026-05-05T09:20:00").toISOString(),
        type: "sale",
        title: "Nasiya savdo",
        items: [{ name: "Armatura 10mm", qty: 20, unit: "kg", amount: 340000 }],
        amount: 340000,
      },
    ],
  },
  {
    id: "c3",
    firstName: "Dilshod",
    lastName: "Saidov",
    phone: "+998901112233",
    role: "mijoz",
    limit: 60000000,
    limitCurrency: "UZS",
    currentDebt: 49000000,
    dueDate: "2026-06-15",
    receipts: [
      {
        id: "N-3001",
        date: new Date("2026-05-02T12:10:00").toISOString(),
        type: "sale",
        title: "Nasiya savdo",
        items: [{ name: "Sement", qty: 50, unit: "qop", amount: 21000000 }],
        amount: 21000000,
      },
      {
        id: "N-3002",
        date: new Date("2026-05-03T14:20:00").toISOString(),
        type: "sale",
        title: "Nasiya savdo",
        items: [{ name: "Armatura", qty: 120, unit: "metr", amount: 10000000 }],
        amount: 10000000,
      },
      {
        id: "N-3003",
        date: new Date("2026-05-04T16:40:00").toISOString(),
        type: "sale",
        title: "Nasiya savdo",
        items: [{ name: "Gipsokarton", qty: 90, unit: "dona", amount: 18000000 }],
        amount: 18000000,
      },
    ],
  },
  {
    id: "c4",
    firstName: "Murod",
    lastName: "Ergashev",
    phone: "+998977778899",
    role: "prorab",
    limit: 8000000,
    limitCurrency: "UZS",
    currentDebt: 7950000,
    dueDate: "2026-05-08",
    receipts: [],
  },
];

export const MOCK_LOYAL_CUSTOMERS: LoyalCustomer[] = [
  {
    id: "l1",
    cardNumber: "SM-10001",
    firstName: "Dilshod",
    lastName: "Ergashev",
    phone: "+998901112233",
    discountPercent: 5,
    discountScope: "all",
    cashbackPercent: 3,
    cashbackBalance: 84000,
    totalSpent: 12400000,
    joinedAt: new Date("2026-01-15T09:00:00").toISOString(),
  },
  {
    id: "l2",
    cardNumber: "SM-10002",
    firstName: "Nodira",
    lastName: "Yusupova",
    phone: "+998933334455",
    discountPercent: 10,
    discountScope: "all",
    cashbackPercent: 5,
    cashbackBalance: 215000,
    totalSpent: 28900000,
    joinedAt: new Date("2025-11-02T14:20:00").toISOString(),
    note: "VIP mijoz — har oyda muntazam xarid qiladi",
  },
  {
    id: "l3",
    cardNumber: "SM-10003",
    firstName: "Aziz",
    lastName: "Karimov",
    phone: "+998977778899",
    discountPercent: 5,
    discountScope: "selected",
    discountProductIds: ["p1", "p2", "p5"],
    cashbackPercent: 3,
    cashbackBalance: 0,
    totalSpent: 3200000,
    joinedAt: new Date("2026-04-10T11:45:00").toISOString(),
    note: "Faqat sement va gips mahsulotlariga skidka",
  },
];

/** Keyingi sodiq mijoz uchun avtomatik cashback karta raqami. */
export function nextLoyalCardNumber(): string {
  const maxSeq = MOCK_LOYAL_CUSTOMERS.reduce((max, c) => {
    const match = /^SM-(\d+)$/.exec(c.cardNumber);
    const seq = match ? Number.parseInt(match[1], 10) : 0;
    return Math.max(max, seq);
  }, 10000);
  return `SM-${maxSeq + 1}`;
}

export const MOCK_REGULAR_CUSTOMERS: RegularCustomer[] = [
  {
    id: "rc1",
    firstName: "Jahongir",
    lastName: "Rasulov",
    phone: "+998901234001",
    createdAt: new Date("2026-05-01T10:00:00").toISOString(),
    lastReceiptAt: new Date("2026-05-07T09:14:00").toISOString(),
  },
  {
    id: "rc2",
    firstName: "Madina",
    lastName: "Qodirova",
    phone: "+998901234002",
    createdAt: new Date("2026-05-03T13:20:00").toISOString(),
    lastReceiptAt: new Date("2026-05-07T12:05:00").toISOString(),
  },
];

export type SupplierReport = {
  id: string;
  date: string;
  addedBy: string;
  type?: "receipt" | "return" | "payment";
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  /** Qo'shimcha (ikkinchi) telefon raqami — eski format. */
  supplierAltPhone?: string;
  /** Qo'shimcha telefon raqamlari (istalgancha). */
  supplierAltPhones?: string[];
  /** Yetkazib beruvchi rasmi — data URL yoki tashqi havola. */
  supplierPhoto?: string;
  /** Tashkilot / firma nomi. */
  companyName?: string;
  /** Tashkilot STIR (INN) raqami. */
  inn?: string;
  /** Korxona hisob raqami (bank hisobi). */
  accountNumber?: string;
  /** Manzil yoki mo'ljal. */
  address?: string;
  botEnabled?: boolean;
  items: { productName: string; qty: number; unit: string; amount: number }[];
  totalAmount: number;
  paidAmount: number;
  remainingDebt: number;
  note?: string;
  vehicleName?: string;
  vehiclePlate?: string;
  driverName?: string;
  driverPhone?: string;
};

export type ProductHistory = {
  id: string;
  /** Har bir prixod uchun unikal nakladnoy/prixod raqami — masalan "PRX-000123". */
  invoiceNumber: string;
  date: string;
  addedBy: string;
  productName: string;
  qty: number;
  unit: string;
  price: number;
  costPrice: number;
  warehouse: string;
  shelfLocation?: string;
  supplierName?: string;
  supplierId?: string;
  supplierPhone?: string;
  paidAmount?: number;
  remainingDebt?: number;
  note?: string;
  totalAmount?: number;
};

/** "Yangi tovar qo'shish" orqali bazaga yaratilgan mahsulot yozuvi haqida tarix —
 * "Tovar prixod qilish" (qoldiq kirimi) tarixidan alohida. */
export type NewProductLog = {
  id: string;
  date: string;
  addedBy: string;
  productName: string;
  unit: string;
  price: number;
  costPrice: number;
  costCurrency: Currency;
  wholesalePrice?: number;
  barcode: string;
  image?: string;
};

export const MOCK_NEW_PRODUCT_LOG: NewProductLog[] = [];

export type EditedProductHistory = {
  id: string;
  date: string;
  editedBy: string;
  productName: string;
  oldQty: number;
  newQty: number;
  unit: string;
  action: "edit" | "delete" | "writeoff" | "sanoq";
  note?: string;
  changes?: {
    field:
      | "name"
      | "barcode"
      | "customCode"
      | "price"
      | "costPrice"
      | "wholesalePrice"
      | "qty"
      | "unit"
      | "warehouse"
      | "shelfLocation"
      | "minStockAlert";
    label: string;
    oldValue: number | string;
    newValue: number | string;
  }[];
  oldPrice?: number;
  newPrice?: number;
  oldCostPrice?: number;
  newCostPrice?: number;
  oldUnit?: string;
  newUnit?: string;
  oldWarehouse?: string;
  newWarehouse?: string;
};

export const MOCK_SUPPLIER_REPORTS: SupplierReport[] = [
  {
    id: "sr1",
    date: new Date("2026-05-05T11:20:00").toISOString(),
    addedBy: "Admin",
    supplierId: "YB-0001",
    supplierName: "Bekzod Ta'minot",
    supplierPhone: "+998901112233",
    items: [
      { productName: "Sement M400 50kg", qty: 40, unit: "dona", amount: 320000 },
      { productName: "Shpaklovka start 25kg", qty: 30, unit: "dona", amount: 195000 },
    ],
    totalAmount: 515000,
    paidAmount: 200000,
    remainingDebt: 315000,
    note: "Demo qarzga olingan prixod",
  },
];

export const MOCK_RECEIPT_DISPATCHES: ReceiptDispatchLog[] = [
  {
    id: "msg1",
    date: new Date("2026-05-07T09:15:00").toISOString(),
    recipientCategory: "oddiy",
    recipientId: "rc1",
    recipientName: "Jahongir Rasulov",
    phone: "+998901234001",
    receiptId: "CHK-100231",
    title: "Oddiy xaridor cheki",
    total: 64000,
    note: "Telegram botga yuborilgan",
  },
  {
    id: "msg2",
    date: new Date("2026-05-07T10:45:00").toISOString(),
    recipientCategory: "nasiya",
    recipientId: "c2",
    recipientName: "Olim Yusupov",
    phone: "+998901234567",
    receiptId: "N-3001",
    title: "Nasiya savdo cheki",
    total: 21000000,
    note: "Telegram botga yuborilgan",
  },
];

export const MOCK_PRODUCT_HISTORY: ProductHistory[] = [
  {
    id: "ph1",
    invoiceNumber: "PRX-000001",
    date: new Date("2026-05-06T09:30:00").toISOString(),
    addedBy: "Admin",
    productName: "Sement M400 50kg",
    qty: 24,
    unit: "dona",
    price: 12000,
    costPrice: 8000,
    warehouse: "Asosiy ombor",
    supplierName: "Bekzod Ta'minot",
    supplierId: "YB-0001",
    supplierPhone: "+998901112233",
    paidAmount: 100000,
    remainingDebt: 92000,
    totalAmount: 192000,
    note: "Demo qarzga olingan prixod",
  },
  {
    id: "ph2",
    invoiceNumber: "PRX-000002",
    date: new Date("2026-05-06T10:10:00").toISOString(),
    addedBy: "Omborchi",
    productName: "Armatura 10mm",
    qty: 50,
    unit: "kg",
    price: 17000,
    costPrice: 12000,
    warehouse: "Asosiy ombor",
  },
];

export const MOCK_EDIT_HISTORY: EditedProductHistory[] = [
  {
    id: "eh1",
    date: new Date("2026-05-06T15:40:00").toISOString(),
    editedBy: "Admin",
    productName: "Shpaklovka start 25kg",
    oldQty: 18,
    newQty: 25,
    unit: "dona",
    action: "edit",
  },
];

/** "Tovar qo'shish tarixi" (kirim/nakladnoy) yozuvi tahrirlangan yoki o'chirilganda qayd qilinadigan alohida audit tarixi. */
export type ProductHistoryEditLog = {
  id: string;
  date: string; // tahrir/o'chirish vaqti
  editedBy: string;
  entryId: string; // ProductHistory.id (qaysi nakladnoy)
  invoiceNumber?: string;
  productName: string;
  action: "edit" | "delete";
  oldTotal: number;
  newTotal: number;
  changes?: { field: string; label: string; oldValue: string; newValue: string }[];
};

export const MOCK_PRODUCT_HISTORY_EDIT_LOG: ProductHistoryEditLog[] = [];

// ─── Sanoq (reviziya) ───────────────────────────────────────────────────────

/** Sanoq qaysi qamrovda o'tkazildi: butun baza, bitta ombor yoki qo'lda tanlangan tovarlar. */
export type StockCountScope = "all" | "warehouse" | "custom";

export type StockCountLine = {
  productId: string;
  productName: string;
  customCode: string;
  barcode: string;
  unit: string;
  warehouse: string;
  shelfLocation?: string;
  /** Sanoq boshlangandagi dasturdagi qoldiq. */
  systemQty: number;
  /** Xodim kiritgan haqiqiy son. `null` — bu tovar sanalmagan. */
  countedQty: number | null;
  /** countedQty - systemQty. Sanalmaganda 0. */
  diff: number;
  /** Bir donaning tan narxi so'mda. */
  costPrice: number;
  /** diff * costPrice. */
  diffAmount: number;
};

export type StockCount = {
  id: string;
  date: string;
  countedBy: string;
  scope: StockCountScope;
  /** scope "warehouse" bo'lsa — ombor nomi; scope "custom" bo'lsa — tanlangan tovar soni. */
  scopeValue?: string;
  totalLines: number;
  countedLines: number;
  matchedLines: number;
  /** Kamomad — donada (musbat son). */
  shortageQty: number;
  /** Ortiqcha — donada (musbat son). */
  surplusQty: number;
  /** Kamomad summasi (musbat son). */
  shortageAmount: number;
  /** Ortiqcha summasi (musbat son). */
  surplusAmount: number;
  /** surplusAmount - shortageAmount. Manfiy bo'lsa — zarar. */
  netAmount: number;
  /** Sanalgan tovarlarning dasturdagi qiymati (tan narxda) — aniqlik foizi uchun baza. */
  countedValue: number;
  note?: string;
  /** Oxirgi tahrir sanasi — hech tahrirlanmagan bo'lsa yo'q. */
  editedAt?: string;
  /** Nechta marta tahrirlangan. */
  editCount?: number;
  /** true bo'lsa — bu hujjat zarar/foyda sifatida hisoblanmaydi, faqat bazadagi
   * qoldiqni to'g'irlash uchun ishlatilgan (shortage/surplus summalari 0 yoziladi). */
  noLoss?: boolean;
  lines: StockCountLine[];
};

export const MOCK_STOCK_COUNTS: StockCount[] = [];

/** Yakunlangan sanoq hujjatiga keyin kiritilgan tuzatish. */
export type StockCountEdit = {
  id: string;
  stockCountId: string;
  date: string;
  editedBy: string;
  note?: string;
  /** Tahrirdan oldingi va keyingi sof natija. */
  oldNetAmount: number;
  newNetAmount: number;
  changes: {
    productId: string;
    productName: string;
    unit: string;
    oldCountedQty: number | null;
    newCountedQty: number | null;
    /** Tovar qoldig'iga qo'llangan farq. */
    stockDelta: number;
    /** stockDelta * tan narx. */
    amountDelta: number;
  }[];
};

export const MOCK_STOCK_COUNT_EDITS: StockCountEdit[] = [];

export const MOCK_MONTHLY_DISCOUNT = 185000;

export const MOCK_RETURN_RECEIPTS: ReturnReceipt[] = [
  {
    id: "QT-0001",
    date: new Date("2026-05-07T17:10:00").toISOString(),
    cashier: "Sardor",
    customerType: "oddiy",
    customerName: "Oddiy mijoz",
    items: [{ productId: "p1", name: "Sement M400 50kg", price: 12000, qty: 2, unit: "dona" }],
    subtotal: 24000,
    total: 24000,
    reason: "Ortib qolgan tovar",
    cashWithdrawalId: "CH-QT-0001",
  },
  {
    id: "QT-0002",
    date: new Date("2026-05-06T13:00:00").toISOString(),
    cashier: "Aziz",
    customerType: "nasiya",
    customerId: "c3",
    customerName: "Dilshod Saidov",
    items: [{ productId: "p17", name: "Armatura 10mm", price: 17000, qty: 5, unit: "kg" }],
    subtotal: 85000,
    total: 85000,
    reason: "Ortib qolgan tovar",
  },
];

export const MOCK_RATES: Record<Currency, number> = {
  UZS: 1,
  USD: 12650,
  RUB: 135.5,
  EUR: 13780,
};

// === To'lov usullari ===
// TODO: backendda sozlamalar bo'limi tayyor bo'lganda shu ro'yxat
// API/hook orqali keladi (kassir tartibini, nomini o'zgartira oladigan
// sozlama sifatida). Hozircha frontendda konstanta.

export type PaymentKind = "cash" | "card" | "currency" | "transfer" | "wallet";

export type PaymentMethod = {
  id: string;
  name: string;
  subtitle?: string;
  kind: PaymentKind;
  isPinned: boolean;
  sortOrder: number;
  commissionPercent?: number;
};

export const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cash", name: "Naqd", kind: "cash", isPinned: true, sortOrder: 1 },
  {
    id: "terminal",
    name: "Terminal",
    subtitle: "Humo / Uzcard",
    kind: "card",
    isPinned: true,
    sortOrder: 2,
  },
  { id: "currency", name: "Valyuta", kind: "currency", isPinned: true, sortOrder: 3 },
  { id: "transfer", name: "Bank orqali o'tkazma", kind: "transfer", isPinned: false, sortOrder: 4 },
  { id: "click", name: "Click", kind: "wallet", isPinned: false, sortOrder: 5 },
  { id: "payme", name: "Payme", kind: "wallet", isPinned: false, sortOrder: 6 },
];

export const MOCK_WAREHOUSES = [
  "Asosiy ombor",
  "Quruq aralashmalar",
  "Armatura ombori",
  "Bo'yoq ombori",
  "Elektr ombori",
  "Santexnika ombori",
  "Tashqi maydon",
];

type DemoProductGroup = {
  warehouse: string;
  unit: string;
  names: string[];
  basePrice: number;
  step: number;
  vitrina: number;
  ombor: number;
  perBox?: number;
};

const DEMO_PRODUCT_GROUPS: DemoProductGroup[] = [
  {
    warehouse: "Quruq aralashmalar",
    unit: "qop",
    basePrice: 46000,
    step: 4200,
    vitrina: 34,
    ombor: 180,
    perBox: 10,
    names: [
      "Sement PC400 25kg",
      "Sement PC400 50kg",
      "Sement PC500 25kg",
      "Sement PC500 50kg",
      "Ohak 20kg",
      "Ohak 40kg",
      "Gips alebastr 25kg",
      "Gips satengips 25kg",
      "Shpaklovka universal 20kg",
      "Shpaklovka fasad 25kg",
      "Plitka kley kuchli 25kg",
      "Plitka kley standart 25kg",
      "Beton kontakt 20kg",
      "Suvoq aralashma 30kg",
    ],
  },
  {
    warehouse: "Asosiy ombor",
    unit: "dona",
    basePrice: 19000,
    step: 5200,
    vitrina: 42,
    ombor: 210,
    perBox: 20,
    names: [
      "Gipsokarton standart 9.5mm",
      "Gipsokarton standart 12.5mm",
      "Gipsokarton namga chidamli 9.5mm",
      "Gipsokarton yonginga chidamli",
      "Profil UD 4m",
      "Profil CD 4m",
      "Profil CW 50mm",
      "Profil UW 50mm",
      "Podves to'g'ri",
      "Krestovina profil uchun",
      "Shurup gipsokarton 25mm",
      "Shurup gipsokarton 35mm",
    ],
  },
  {
    warehouse: "Armatura ombori",
    unit: "metr",
    basePrice: 18000,
    step: 3800,
    vitrina: 80,
    ombor: 620,
    perBox: 100,
    names: [
      "Armatura A500 6mm",
      "Armatura A500 8mm",
      "Armatura A500 10mm",
      "Armatura A500 12mm",
      "Armatura A500 14mm",
      "Armatura A500 16mm",
      "Katanka 5.5mm",
      "Kvadrat truba 20x20",
      "Kvadrat truba 40x40",
      "Ugolok 25x25",
      "Polosa metall 20mm",
      "Setka payvand 50x50",
    ],
  },
  {
    warehouse: "Bo'yoq ombori",
    unit: "dona",
    basePrice: 28000,
    step: 7600,
    vitrina: 24,
    ombor: 96,
    perBox: 4,
    names: [
      "Emulsiya oq 5kg",
      "Emulsiya oq 10kg",
      "Emulsiya oq 25kg",
      "Fasad bo'yoq 10kg",
      "Fasad bo'yoq 25kg",
      "Akril lak 1L",
      "Akril lak 5L",
      "Gruntovka chuqur 5L",
      "Gruntovka chuqur 10L",
      "Emal PF-115 oq 2.7kg",
      "Emal PF-115 qora 2.7kg",
      "Rang pigment sariq",
      "Rang pigment ko'k",
      "Rang pigment yashil",
    ],
  },
  {
    warehouse: "Elektr ombori",
    unit: "dona",
    basePrice: 6500,
    step: 2500,
    vitrina: 70,
    ombor: 360,
    perBox: 50,
    names: [
      "Kabel VVG 2x1.5",
      "Kabel VVG 2x2.5",
      "Kabel VVG 3x1.5",
      "Kabel VVG 3x2.5",
      "Avtomat 16A",
      "Avtomat 25A",
      "Avtomat 32A",
      "Rozetka ichki oq",
      "Rozetka tashqi oq",
      "Viklyuchatel birlik",
      "Viklyuchatel ikki kalit",
      "LED lampa 12W",
      "LED panel 18W",
      "Izolyenta qora",
    ],
  },
  {
    warehouse: "Santexnika ombori",
    unit: "dona",
    basePrice: 4200,
    step: 3400,
    vitrina: 58,
    ombor: 260,
    perBox: 25,
    names: [
      "Truba PPR 20mm 4m",
      "Truba PPR 25mm 4m",
      "Truba PPR 32mm 4m",
      "Ugolok PPR 25mm",
      "Ugolok PPR 32mm",
      "T-krest PPR 20mm",
      "Mufta PPR 25mm",
      "Kran sharli 25mm",
      "Kran sharli 32mm",
      "Kanalizatsiya truba 50mm",
      "Kanalizatsiya truba 110mm",
      "Sifon rakovina",
      "Gofra unitaz",
      "FUM lenta",
    ],
  },
  {
    warehouse: "Asosiy ombor",
    unit: "dona",
    basePrice: 34000,
    step: 11800,
    vitrina: 18,
    ombor: 70,
    perBox: 8,
    names: [
      "Keramogranit 60x60",
      "Kafel devor 30x60",
      "Metlax pol 33x33",
      "Laminat 8mm",
      "Plintus MDF 2.5m",
      "Eshik MDF oq",
      "Eshik MDF yong'oq",
      "Eshik qulfi komplekt",
      "Eshik ruchka komplekt",
      "Deraza tokchasi 20cm",
    ],
  },
  {
    warehouse: "Tashqi maydon",
    unit: "dona",
    basePrice: 12000,
    step: 6900,
    vitrina: 26,
    ombor: 115,
    perBox: 10,
    names: [
      "Lopata belkurak",
      "Masterok 180mm",
      "Shpatel 100mm",
      "Shpatel 300mm",
      "Valik bo'yoq 180mm",
      "Kist 50mm",
      "Chelak qurilish 20L",
      "Qolqop ishchi",
      "Ko'zoynak himoya",
      "Ruletka 5m",
    ],
  },
];

const DEMO_EMPLOYEE_NAMES = [
  "Bekzod Aliyev",
  "Shahzod Nurmatov",
  "Feruza Ismoilova",
  "Diyorbek Hasanov",
  "Gulnoza Rasulova",
  "Azamat Qahhorov",
  "Malika Rustamova",
  "Sirojiddin Komilov",
  "Umida Karimova",
  "Bobur Mirzayev",
  "Rayhona Akbarova",
  "Ibrohim Sodiqov",
  "Zarina Murodova",
  "Temur Xolmatov",
  "Nilufar Hamidova",
  "Sherzod Abdullayev",
  "Durdona Yo'ldosheva",
  "Jamshid To'raev",
  "Munisa Safarova",
  "Rustam Qo'chqorov",
];

const DEMO_CREDIT_CUSTOMER_NAMES = [
  "Anvar Tojiboyev",
  "Shavkat Oripov",
  "Zafar Bozorov",
  "Sherali Mamatov",
  "Farrux Xudoyberdiyev",
  "Aziza Saidova",
  "Nodira Erkinova",
  "Javlon Karimov",
  "Ulug'bek Hamroyev",
  "Sardorbek Qurbanov",
  "Oybek Shukurov",
  "Doston Nabiyev",
  "G'ayrat Soliyev",
  "Maftuna Zokirova",
  "Islomjon Raxmonov",
  "Muxlisa Yoqubova",
  "Abbos Tohirov",
  "Bahrom Akmalov",
  "Kamola Nosirova",
  "Lazizbek Usmonov",
  "Sanjar Ganiev",
  "Elyor Xakimov",
  "Muhammadali Baratov",
  "Shahnoza Ro'ziyeva",
];

const DEMO_REGULAR_CUSTOMER_NAMES = [
  "Jahongir Usmonov",
  "Ozoda Mirjalolova",
  "Behruz Ergashev",
  "Ziyoda Xamidova",
  "Jasmina Normatova",
  "Akobir Xolboyev",
  "Daler Qosimov",
  "Mohira Abdukarimova",
  "Yusufjon Olimov",
  "Nargiza Meliyeva",
  "Suhrob Ismatov",
  "Shirin Tursunova",
  "Firdavs Qodirov",
  "Dilafruz Nematova",
  "Asadbek Rahimov",
  "Zuhra Karimova",
  "Miraziz Po'latov",
  "Lola Abdullayeva",
  "Nurbek Jamolov",
  "Sevinch To'xtayeva",
];

const DEMO_SUPPLIER_NAMES = [
  "Bunyod Qurilish Ta'minot",
  "Grand Sement Servis",
  "Mega Profil Savdo",
  "Atlas Bo'yoq Market",
  "Oltin Armatura",
  "Nur Elektr Ta'minot",
  "Suvtex Santexnika",
  "Fasad Plus",
  "Master Keramika",
  "Qurilish Bazasi 24",
  "Temir Universal",
  "Euro Mix Trade",
  "Beton Max",
  "Ideal Dekor",
  "Profi Tools",
  "Samarkand Build",
  "Express Ombor",
  "Milliy Ta'minot",
];

function demoDate(day: number, hour: number, minute: number) {
  return new Date(
    `2026-05-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(
      minute,
    ).padStart(2, "0")}:00`,
  ).toISOString();
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

function splitFullName(name: string) {
  const [firstName, ...rest] = name.split(" ");
  return { firstName, lastName: rest.join(" ") };
}

function demoPhone(index: number, prefix = 90) {
  return `+998${prefix}${String(3000000 + index * 13791).padStart(7, "0")}`;
}

function generateDemoProducts(): Product[] {
  let serial = 57;
  return DEMO_PRODUCT_GROUPS.flatMap((group, groupIndex) =>
    group.names.map((name, index) => {
      const productNo = serial++;
      const price = roundTo(group.basePrice + group.step * index + groupIndex * 1250, 500);
      const costPrice = roundTo(price * (0.72 + ((index + groupIndex) % 5) * 0.025), 500);
      return {
        id: `p${productNo}`,
        name,
        minStockAlert: index % 3 === 0 ? Math.max(8, Math.round(group.vitrina * 0.45)) : undefined,
        price,
        wholesalePrice: roundTo(price * (price > 20000 ? 0.91 : 0.94), 500),
        costPrice,
        costCurrency: "UZS",
        barcode: `4781000000${String(productNo).padStart(3, "0")}`,
        customCode: `QM${String(productNo).padStart(3, "0")}`,
        unit: group.unit,
        warehouse: group.warehouse,
        vitrinaQty: Math.max(3, group.vitrina - (index % 8) * 2 + groupIndex),
        omborQty: Math.max(12, group.ombor + index * 11 + groupIndex * 7),
        perBox: group.perBox,
        salesHistory: genHistory(60, ((index + groupIndex) % 12) + 1),
      };
    }),
  );
}

function generateDemoEmployees(): Employee[] {
  const roles = ["Sotuvchi", "Kassir", "Omborchi", "Yetkazuvchi", "Menejer", "Hisobchi"];
  return DEMO_EMPLOYEE_NAMES.map((name, index) => {
    const role = roles[index % roles.length];
    return {
      id: `X-${String(index + 11).padStart(3, "0")}`,
      name,
      ...splitFullName(name),
      role,
      roles: role === "Sotuvchi" ? ["Sotuvchi", "Savdo maslahatchisi"] : [role],
      status: index % 11 === 0 ? "vacation" : index % 17 === 0 ? "inactive" : "active",
      phone: demoPhone(index + 11, 91 + (index % 7)),
      phone2: index % 4 === 0 ? demoPhone(index + 41, 97) : undefined,
      birthDate: `${1988 + (index % 14)}-${String((index % 12) + 1).padStart(2, "0")}-${String(
        (index % 25) + 3,
      ).padStart(2, "0")}`,
      passport: `AA${String(1200000 + index * 3751).padStart(7, "0")}`,
      monthlySalary: 2800000 + (index % 8) * 350000,
      workDays: index % 2 === 0 ? 26 : 24,
      workHoursPerDay: index % 3 === 0 ? 9 : 8,
      payType: role === "Sotuvchi" ? "fixed_plus_sales" : "fixed",
      salesPercent: role === "Sotuvchi" ? 1.5 + (index % 3) * 0.5 : undefined,
      source: "manual",
      deviceLogin: index % 6 === 0 ? `demo-${index + 11}` : undefined,
    };
  });
}

function generateDemoRegularCustomers(): RegularCustomer[] {
  return DEMO_REGULAR_CUSTOMER_NAMES.map((name, index) => {
    const { firstName, lastName } = splitFullName(name);
    return {
      id: `rc${index + 3}`,
      firstName,
      lastName,
      phone: demoPhone(index + 60, 93 + (index % 5)),
      createdAt: demoDate((index % 7) + 1, 9 + (index % 8), (index * 9) % 60),
      lastReceiptAt: demoDate(7 - (index % 7), 10 + (index % 8), (index * 11) % 60),
    };
  });
}

function makeDebtReceipt(
  id: string,
  date: string,
  title: string,
  amount: number,
  status: CustomerDebtReceipt["status"],
  note?: string,
): CustomerDebtReceipt {
  return {
    id,
    date,
    type: title === "Qarz so'ndirish" ? "payment" : "sale",
    title,
    items:
      title === "Qarz so'ndirish"
        ? []
        : [{ name: "Qurilish mollari", qty: 1, unit: "chek", amount }],
    amount,
    paidAmount: status === "partial" ? Math.round(amount * 0.28) : undefined,
    debtAmount: status === "partial" ? Math.round(amount * 0.72) : undefined,
    status,
    note,
  };
}

function generateDemoCreditCustomers(): CreditCustomer[] {
  const roles: CreditCustomer["role"][] = ["prorab", "usta", "mijoz"];
  return DEMO_CREDIT_CUSTOMER_NAMES.map((name, index) => {
    const { firstName, lastName } = splitFullName(name);
    const saleA = 850000 + index * 145000;
    const saleB = 420000 + (index % 9) * 90000;
    const payment = Math.round((saleA + saleB) * (0.18 + (index % 4) * 0.04));
    const currentDebt = Math.max(0, saleA + saleB - payment);
    const id = `c${index + 5}`;
    return {
      id,
      firstName,
      lastName,
      phone: demoPhone(index + 95, 94 + (index % 5)),
      botEnabled: index % 3 === 0,
      role: roles[index % roles.length],
      limit: 3000000 + (index % 8) * 1500000,
      limitCurrency: "UZS",
      currentDebt,
      dueDate: `2026-05-${String(10 + (index % 18)).padStart(2, "0")}`,
      objects:
        index % 4 === 0
          ? [
              {
                id: `OBJ-${index + 1}A`,
                name: "Uy qurilishi",
                debt: Math.round(currentDebt * 0.62),
              },
              { id: `OBJ-${index + 1}B`, name: "Dala hovli", debt: Math.round(currentDebt * 0.38) },
            ]
          : undefined,
      receipts: [
        makeDebtReceipt(
          `N-D${String(index * 2 + 1).padStart(4, "0")}`,
          demoDate(2 + (index % 6), 10 + (index % 7), (index * 7) % 60),
          "Nasiya savdo",
          saleA,
          index % 2 === 0 ? "partial" : "unpaid",
          "Demo nasiya chek",
        ),
        makeDebtReceipt(
          `N-D${String(index * 2 + 2).padStart(4, "0")}`,
          demoDate(3 + (index % 5), 12 + (index % 6), (index * 13) % 60),
          "Nasiya savdo",
          saleB,
          "unpaid",
          "Qo'shimcha material",
        ),
        makeDebtReceipt(
          `QS-D${String(index + 1).padStart(4, "0")}`,
          demoDate(5 + (index % 3), 15 + (index % 4), (index * 17) % 60),
          "Qarz so'ndirish",
          -payment,
          "paid",
          "Demo to'lov",
        ),
      ],
    };
  });
}

function generateDemoSupplierReports(): SupplierReport[] {
  return DEMO_SUPPLIER_NAMES.map((name, index) => {
    const productA = MOCK_PRODUCTS[(index * 5) % MOCK_PRODUCTS.length];
    const productB = MOCK_PRODUCTS[(index * 5 + 9) % MOCK_PRODUCTS.length];
    const amountA = (productA?.costPrice ?? 45000) * (12 + (index % 9) * 3);
    const amountB = (productB?.costPrice ?? 35000) * (8 + (index % 7) * 2);
    const totalAmount = roundTo(amountA + amountB, 1000);
    const paidAmount = roundTo(totalAmount * (0.28 + (index % 5) * 0.09), 1000);
    const remainingDebt = Math.max(0, totalAmount - paidAmount);
    return {
      id: `sr-demo-${String(index + 1).padStart(3, "0")}`,
      date: demoDate(1 + (index % 7), 8 + (index % 9), (index * 11) % 60),
      addedBy: index % 2 === 0 ? "Admin" : "Omborchi",
      supplierId: `YB-${String(index + 2).padStart(4, "0")}`,
      supplierName: name,
      supplierPhone: demoPhone(index + 130, 95 + (index % 4)),
      botEnabled: index % 3 === 0,
      items: [
        {
          productName: productA?.name ?? "Demo tovar",
          qty: 12 + (index % 9) * 3,
          unit: productA?.unit ?? "dona",
          amount: roundTo(amountA, 1000),
        },
        {
          productName: productB?.name ?? "Demo tovar",
          qty: 8 + (index % 7) * 2,
          unit: productB?.unit ?? "dona",
          amount: roundTo(amountB, 1000),
        },
      ],
      totalAmount,
      paidAmount,
      remainingDebt,
      note: "Ertangi taqdimot uchun demo yetkazib beruvchi prixodi",
    };
  });
}

function generateDemoReceipts(count: number) {
  const cashiers = [
    "Sardor Tursunov",
    "Akmal Karimov",
    "Madina Sobirova",
    "Bekzod Aliyev",
    "Feruza Ismoilova",
    "Diyorbek Hasanov",
  ];
  const receipts: Receipt[] = [];

  for (let index = 0; index < count; index++) {
    const itemCount = 2 + (index % 3);
    const items: ReceiptItem[] = Array.from({ length: itemCount }, (_, itemIndex) => {
      const product = MOCK_PRODUCTS[(index * 7 + itemIndex * 11) % MOCK_PRODUCTS.length];
      const qty = 1 + ((index + itemIndex) % 5);
      return {
        productId: product?.id ?? `demo-product-${index}-${itemIndex}`,
        name: product?.name ?? "Demo qurilish mahsuloti",
        price: product?.price ?? 25000,
        qty,
        unit: product?.unit ?? "dona",
      };
    });

    if (index % 10 === 0) {
      items.push({
        productId: `one-time-demo-extra-${index + 1}`,
        name: "Yetkazib berish va tushirish xizmati",
        price: 65000 + (index % 4) * 15000,
        qty: 1,
        unit: "xizmat",
        source: "one-time",
        note: "Demo chekdagi qo'shimcha xizmat",
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discount = index % 5 === 0 ? roundTo(subtotal * 0.04, 1000) : 0;
    const total = Math.max(0, subtotal - discount);
    const isCredit = index % 3 === 1;
    const creditCustomer = MOCK_CREDIT_CUSTOMERS[(index + 4) % MOCK_CREDIT_CUSTOMERS.length];
    const regularCustomer = MOCK_REGULAR_CUSTOMERS[index % MOCK_REGULAR_CUSTOMERS.length];
    const receiptId = `CHK-${100300 + index}`;
    const paidAmount = isCredit ? roundTo(total * (0.25 + (index % 4) * 0.1), 1000) : total;
    const debtAmount = isCredit ? Math.max(0, total - paidAmount) : 0;

    receipts.push({
      id: receiptId,
      date: demoDate(7 - (index % 7), 9 + (index % 9), (index * 7) % 60),
      cashier: cashiers[index % cashiers.length],
      customerType: isCredit ? "nasiya" : "oddiy",
      customerId: isCredit ? creditCustomer?.id : regularCustomer?.id,
      customerName: isCredit
        ? creditCustomer
          ? `${creditCustomer.firstName} ${creditCustomer.lastName}`
          : "Demo nasiyachi"
        : regularCustomer
          ? `${regularCustomer.firstName} ${regularCustomer.lastName}`
          : "Oddiy mijoz",
      customerPhone: isCredit ? creditCustomer?.phone : regularCustomer?.phone,
      items,
      subtotal,
      discount,
      total,
      paidAmount: isCredit ? paidAmount : undefined,
      debtAmount: isCredit ? debtAmount : undefined,
    });

    if (isCredit && creditCustomer) {
      creditCustomer.currentDebt += debtAmount;
      creditCustomer.receipts = creditCustomer.receipts ?? [];
      creditCustomer.receipts.unshift({
        id: `N-CHK-${100300 + index}`,
        date: receipts[receipts.length - 1].date,
        type: "sale",
        status: debtAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
        title: "Nasiya savdo",
        items: items.map((item) => ({
          name: item.name,
          qty: item.qty,
          unit: item.unit,
          amount: item.price * item.qty,
        })),
        amount: debtAmount,
        paidAmount,
        debtAmount,
        note: `Chek ${receiptId}`,
      });
    }

    if (index % 10 === 0) {
      MOCK_ONE_TIME_ITEMS.unshift({
        id: `BM-D${String(index + 1).padStart(4, "0")}`,
        date: receipts[receipts.length - 1].date,
        receiptId,
        cashier: cashiers[index % cashiers.length],
        items: items
          .filter((item) => item.source === "one-time")
          .map((item) => ({
            name: item.name,
            qty: item.qty,
            unit: item.unit,
            price: item.price,
            note: item.note,
          })),
        total: items
          .filter((item) => item.source === "one-time")
          .reduce((sum, item) => sum + item.price * item.qty, 0),
      });
    }
  }

  return receipts;
}

function seedPresentationDemoData() {
  const employeeIds = new Set(MOCK_EMPLOYEES.map((employee) => employee.id));
  MOCK_EMPLOYEES.push(
    ...generateDemoEmployees().filter((employee) => !employeeIds.has(employee.id)),
  );

  const regularIds = new Set(MOCK_REGULAR_CUSTOMERS.map((customer) => customer.id));
  MOCK_REGULAR_CUSTOMERS.push(
    ...generateDemoRegularCustomers().filter((customer) => !regularIds.has(customer.id)),
  );

  const creditIds = new Set(MOCK_CREDIT_CUSTOMERS.map((customer) => customer.id));
  MOCK_CREDIT_CUSTOMERS.push(
    ...generateDemoCreditCustomers().filter((customer) => !creditIds.has(customer.id)),
  );

  const supplierIds = new Set(MOCK_SUPPLIER_REPORTS.map((report) => report.id));
  const supplierReports = generateDemoSupplierReports().filter(
    (report) => !supplierIds.has(report.id),
  );
  MOCK_SUPPLIER_REPORTS.push(...supplierReports);

  const receiptIds = new Set(MOCK_RECEIPTS.map((receipt) => receipt.id));
  MOCK_RECEIPTS.unshift(
    ...generateDemoReceipts(50).filter((receipt) => !receiptIds.has(receipt.id)),
  );

  supplierReports.forEach((report, index) => {
    MOCK_PRODUCT_HISTORY.unshift({
      id: `ph-demo-${String(index + 1).padStart(3, "0")}`,
      invoiceNumber: nextInvoiceNumber(),
      date: report.date,
      addedBy: report.addedBy,
      productName: report.items[0]?.productName ?? "Demo tovar",
      qty: report.items[0]?.qty ?? 1,
      unit: report.items[0]?.unit ?? "dona",
      price: Math.round(
        (report.items[0]?.amount ?? report.totalAmount) / Math.max(1, report.items[0]?.qty ?? 1),
      ),
      costPrice: Math.round(
        (report.items[0]?.amount ?? report.totalAmount) / Math.max(1, report.items[0]?.qty ?? 1),
      ),
      warehouse: MOCK_PRODUCTS[index % MOCK_PRODUCTS.length]?.warehouse ?? "Asosiy ombor",
      supplierName: report.supplierName,
      supplierId: report.supplierId,
      supplierPhone: report.supplierPhone,
      paidAmount: report.paidAmount,
      remainingDebt: report.remainingDebt,
      totalAmount: report.totalAmount,
      note: "Demo yetkazib beruvchi kirim tarixi",
    });

    if (report.botEnabled) {
      MOCK_RECEIPT_DISPATCHES.unshift({
        id: `msg-supplier-demo-${index + 1}`,
        date: report.date,
        recipientCategory: "yetkazib_beruvchi",
        recipientId: report.supplierId,
        recipientName: report.supplierName,
        phone: report.supplierPhone,
        receiptId: report.id,
        title: "Yetkazib beruvchi hisob-kitob cheki",
        total: report.totalAmount,
        note: "Demo bot yuborilgan chek",
      });
    }
  });

  MOCK_DEBT_PAYMENTS.push(
    ...MOCK_CREDIT_CUSTOMERS.slice(4, 16).map((customer, index) => ({
      id: `QS-DEMO-${String(index + 1).padStart(3, "0")}`,
      date: demoDate(4 + (index % 4), 11 + (index % 6), (index * 19) % 60),
      cashier: index % 2 === 0 ? "Sardor Tursunov" : "Madina Sobirova",
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      amount: 180000 + index * 65000,
      method: (index % 3 === 0
        ? "karta"
        : index % 3 === 1
          ? "naqd"
          : "valyuta") as DebtPayment["method"],
      cardType: index % 3 === 0 ? "HUMO" : undefined,
      currencyCode: index % 3 === 2 ? "USD" : undefined,
      note: "Demo qarz so'ndirish",
    })),
  );

  MOCK_CASH_CLOSES.push(
    ...Array.from({ length: 7 }, (_, index) => ({
      id: `KY-DEMO-${String(index + 1).padStart(3, "0")}`,
      date: demoDate(1 + index, 19, 5 + index * 3),
      cashier: index % 2 === 0 ? "Sardor Tursunov" : "Madina Sobirova",
      cash: 1250000 + index * 180000,
      cards: [
        { type: "Humo", amount: 520000 + index * 70000 },
        { type: "Uzcard", amount: 390000 + index * 45000 },
      ],
      currencies: index % 3 === 0 ? [{ code: "USD", amount: 100000 + index * 15000 }] : [],
      shortage: index % 5 === 0 ? 12000 : 0,
      leftInRegister: 150000 + index * 10000,
      note: "Demo smena yopish",
    })),
  );

  MOCK_WITHDRAWALS.push(
    ...supplierReports.slice(0, 8).map((report, index) => ({
      id: `CH-AG-DEMO-${String(index + 1).padStart(3, "0")}`,
      date: demoDate(2 + (index % 6), 14 + (index % 4), (index * 13) % 60),
      cashier: "Admin",
      category: "Yetkazib beruvchilarga to'lov",
      cash: 250000 + index * 85000,
      cardAmount: index % 2 === 0 ? 120000 + index * 35000 : 0,
      currencies: [],
      note: `${report.supplierName} uchun demo to'lov`,
      supplierId: report.supplierId,
    })),
  );
}

seedPresentationDemoData();

// SSR/CSR mosligi uchun qat'iy formatlash
export function formatSom(value: number): string {
  const rounded = Math.round(value);
  const str = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (rounded < 0 ? "-" : "") + str + " so'm";
}

export function convertFromSom(sumAmount: number, currencyCode: string): number {
  if (currencyCode === "UZS") return sumAmount;
  const rate = MOCK_RATES[currencyCode] ?? 1;
  return rate > 0 ? sumAmount / rate : sumAmount;
}

export function formatMoney(sumAmount: number, currencyCode: string = "UZS"): string {
  if (currencyCode === "UZS") return formatSom(sumAmount);
  const converted = convertFromSom(sumAmount, currencyCode);
  const str = converted.toLocaleString("uz-UZ", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return `${str} ${currencyCode}`;
}

export function costInSom(p: Pick<Product, "costPrice" | "costCurrency">): number {
  return p.costPrice * (MOCK_RATES[p.costCurrency] ?? 1);
}

/** Foyda/hisobot hisob-kitoblari uchun haqiqiy baza — og'irlikli o'rtacha tan
 * narx (so'mda). Hali birorta prixod WAC orqali o'tmagan eski tovarlarda
 * `avgCostPriceSom` yo'q — shu holda oxirgi tan narxga (`costInSom`) tushadi. */
export function avgCostInSom(
  p: Pick<Product, "costPrice" | "costCurrency" | "avgCostPriceSom">,
): number {
  return typeof p.avgCostPriceSom === "number" ? p.avgCostPriceSom : costInSom(p);
}

/**
 * Bitta prixod qatorini og'irlikli o'rtacha tan narx (WAC) formulasi bo'yicha
 * mahsulotga qo'llaydi va yangi qoldiq + yangi o'rtacha tan narxni birgalikda
 * yozadi (frontendda yagona sinxron chaqiruv — real backendda bitta transaction
 * ichida, qatorni qulflab bajarilishi kerak bo'lgan qism shu funksiya).
 *
 * `exchangeRate` faqat `currency !== "UZS"` bo'lsa ishlatiladi — shu kungi kurs.
 */
export function applyPurchaseToProduct(
  target: {
    omborQty: number;
    costPrice: number;
    costCurrency: Currency;
    avgCostPriceSom?: number;
    avgCostPriceUsd?: number;
    avgCostCurrencyRate?: number;
  },
  purchase: { qty: number; price: number; currency: Currency; exchangeRate?: number },
): void {
  const purchasePriceSom =
    purchase.currency === "UZS"
      ? purchase.price
      : purchase.price * (purchase.exchangeRate ?? MOCK_RATES[purchase.currency] ?? 1);

  const oldQty = Math.max(0, target.omborQty || 0);
  // Hali birorta prixod WAC orqali o'tmagan bo'lsa (`avgCostPriceSom` yo'q) —
  // mavjud qoldiqning bazasi 0 emas, balki tovarning joriy tan narxi (so'mda)
  // deb olinadi. Aks holda eski qoldiq "bepul" hisoblanib, o'rtacha narx
  // sun'iy ravishda keskin pasayib ketadi.
  const oldAvgSom =
    typeof target.avgCostPriceSom === "number" ? target.avgCostPriceSom : costInSom(target);
  const incomingQty = Math.max(0, purchase.qty || 0);
  const newQty = oldQty + incomingQty;

  // So'mda tiyin yo'q — boshqa har bir narx maydoni kabi butun songa yaxlitlanadi,
  // aks holda qoldiq cheksiz davriy kasrga aylanib (masalan 1/3 kabi nisbatlarda),
  // keyingi prixodlarda xatolik asta-sekin to'planib boradi.
  const newAvgSom =
    newQty === 0 ? 0 : Math.round((oldQty * oldAvgSom + incomingQty * purchasePriceSom) / newQty);

  target.omborQty = newQty;
  target.avgCostPriceSom = newAvgSom;
  if (purchase.currency !== "UZS") {
    const rate = purchase.exchangeRate ?? MOCK_RATES[purchase.currency] ?? 1;
    target.avgCostPriceUsd =
      rate > 0 ? Math.round((newAvgSom / rate) * 100) / 100 : target.avgCostPriceUsd;
    target.avgCostCurrencyRate = rate;
  }
}

export function priceInSom(p: Pick<Product, "price" | "priceCurrency">): number {
  return p.price * (MOCK_RATES[p.priceCurrency ?? "UZS"] ?? 1);
}

export function wholesaleInSom(p: Pick<Product, "wholesalePrice" | "wholesaleCurrency">): number {
  return (p.wholesalePrice ?? 0) * (MOCK_RATES[p.wholesaleCurrency ?? "UZS"] ?? 1);
}

/** computeMarkupPrice'ning teskarisi — narx (masalan foydalanuvchi qo'lda
 * kiritgan optom/sotuv narx) va tan narxdan, qo'yilgan foiz ustamasini topadi.
 * Tan narx 0/bo'sh bo'lsa (foiz hisoblab bo'lmaydi) `null` qaytaradi. */
export function reverseMarkupPercent(
  costPrice: number,
  costCurrency: Currency,
  targetPrice: number,
  targetCurrency: Currency,
): number | null {
  if (!costPrice || costPrice <= 0) return null;
  const costInTarget =
    (costPrice * (MOCK_RATES[costCurrency] ?? 1)) / (MOCK_RATES[targetCurrency] ?? 1);
  if (costInTarget <= 0) return null;
  const percent = (targetPrice / costInTarget - 1) * 100;
  return Math.round(percent * 100) / 100;
}

/** Savat (yoki chek) bo'yicha bir butun chegirma qo'llanganda, "tan narxdan past
 * sotilmasin" belgisi qo'yilgan tovarlarning har biri (chegirma proporsional
 * taqsimlanganda) o'z tan narxidan pastga tushib ketmasligi uchun ruxsat etilgan
 * eng katta umumiy chegirma summasini (so'mda) hisoblaydi. */
export function maxAllowedCartDiscount(
  lines: { product: Product; quantity: number }[],
  subtotal: number,
): number {
  if (subtotal <= 0) return 0;
  let maxDiscount = subtotal;
  for (const line of lines) {
    if (!line.product.preventBelowCost) continue;
    const lineSubtotal = priceInSom(line.product) * line.quantity;
    if (lineSubtotal <= 0) continue;
    const lineCost = costInSom(line.product) * line.quantity;
    const lineRoom = Math.max(0, lineSubtotal - lineCost);
    const allowedTotalDiscount = (lineRoom * subtotal) / lineSubtotal;
    maxDiscount = Math.min(maxDiscount, allowedTotalDiscount);
  }
  return maxDiscount;
}

/** Tan narxni berilgan valyutaga o'girib, ustiga foiz qo'shib narx hisoblaydi.
 * Masalan tan narx 1 USD, maqsad valyuta UZS, foiz 5% bo'lsa:
 * 1 * 12650 = 12650 so'm, + 5% = 13282.5 -> UZS uchun 1000 so'mgacha yaxlitlanadi.
 * `exact: true` berilsa — UZS uchun ham 1000 so'mgacha yaxlitlanmaydi, aniq
 * (butun so'mgacha) qiymat qaytariladi. */
export function computeMarkupPrice(
  costPrice: number,
  costCurrency: Currency,
  targetCurrency: Currency,
  percent: number,
  exact = false,
): number {
  const costInTarget =
    (costPrice * (MOCK_RATES[costCurrency] ?? 1)) / (MOCK_RATES[targetCurrency] ?? 1);
  const withMarkup = costInTarget * (1 + percent / 100);
  if (targetCurrency !== "UZS") return Math.round(withMarkup * 100) / 100;
  return exact ? Math.round(withMarkup) : Math.round(withMarkup / 1000) * 1000;
}

/** Tovar bir nechta variantga (rang/razmer/SKU) egami? */
export function productHasVariants(
  product: Product,
): product is Product & { variants: ProductVariant[] } {
  return Array.isArray(product.variants) && product.variants.length > 0;
}

/** Barcha variantlar bo'yicha jami vitrina qoldig'i. */
export function variantTotalQty(product: Product): number {
  return productHasVariants(product)
    ? product.variants.reduce((sum, v) => sum + (v.vitrinaQty || 0), 0)
    : product.vitrinaQty;
}

/**
 * Variantni to'liq `Product` obyektiga aylantiradi: ota-tovar maydonlari
 * variant qiymatlari bilan ustma-ust qo'yiladi, `id` esa `ota::variant`
 * ko'rinishida unikal bo'ladi. Natija oddiy tovar kabi ishlatiladi
 * (savatcha, chek, yakunlash kodi o'zgarmaydi).
 */
export function resolveVariant(product: Product, variant: ProductVariant): Product {
  return {
    ...product,
    id: `${product.id}::${variant.id}`,
    name: `${product.name} — ${variant.label}`,
    image: variant.image ?? product.image,
    barcode: variant.barcode ?? product.barcode,
    customCode: variant.customCode ?? product.customCode,
    price: variant.price ?? product.price,
    wholesalePrice: variant.wholesalePrice ?? product.wholesalePrice,
    costPrice: variant.costPrice ?? product.costPrice,
    costCurrency: variant.costCurrency ?? product.costCurrency,
    vitrinaQty: variant.vitrinaQty,
    omborQty: variant.omborQty ?? 0,
    minStockAlert: variant.minStockAlert ?? product.minStockAlert,
    perBox: variant.perBox ?? product.perBox,
    variants: undefined,
  };
}

export function isProductAtLimit(product: Pick<Product, "vitrinaQty" | "minStockAlert">) {
  return typeof product.minStockAlert === "number" && product.minStockAlert >= 0
    ? product.vitrinaQty <= product.minStockAlert
    : false;
}

// === Komplekt (bir nechta tovardan tashkil topgan to'plam) ===

export type KomplektItem = {
  productId: string;
  /** 1 ta komplekt yig'ish uchun shu tovardan necha dona kerakligi. */
  qty: number;
};

export type Komplekt = {
  id: string;
  name: string;
  items: KomplektItem[];
};

export const MOCK_KOMPLEKTLAR: Komplekt[] = [];

export function nextKomplektId(): string {
  return `KMP-${String(MOCK_KOMPLEKTLAR.length + 1).padStart(4, "0")}`;
}

/** Komplekt tarkibidagi tovarlarni (bazadan o'chirilmagan bo'lsa) qoldiqlari bilan qaytaradi. */
export function komplektComponents(komplekt: Komplekt): { product: Product; qty: number }[] {
  return komplekt.items
    .map((item) => {
      const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
      return product ? { product, qty: item.qty } : null;
    })
    .filter((x): x is { product: Product; qty: number } => x !== null);
}

/** Komplekt narxi — tarkibidagi tovarlar narxi yig'indisi (1 komplekt uchun). */
export function komplektPrice(
  komplekt: Komplekt,
  priceMode: "retail" | "wholesale" = "retail",
): number {
  return komplektComponents(komplekt).reduce((sum, { product, qty }) => {
    const unitPrice =
      priceMode === "wholesale" && product.wholesalePrice ? product.wholesalePrice : product.price;
    return sum + unitPrice * qty;
  }, 0);
}

function komplektCostPrice(komplekt: Komplekt): number {
  return komplektComponents(komplekt).reduce(
    (sum, { product, qty }) => sum + product.costPrice * qty,
    0,
  );
}

/** Omborda hozir nechta komplekt yig'ish mumkinligi — eng kam yetadigan
 * tarkibiy tovar bo'yicha hisoblanadi. */
export function komplektAvailableQty(komplekt: Komplekt): number {
  const components = komplektComponents(komplekt);
  if (components.length === 0) return 0;
  return Math.min(
    ...components.map(({ product, qty }) => (qty > 0 ? Math.floor(product.vitrinaQty / qty) : 0)),
  );
}

/** Komplektni sotuvda oddiy tovar kabi ishlatish uchun sintetik `Product`
 * obyektiga aylantiradi (savatcha, miqdor oynasi va h.k. o'zgarmaydi). */
export function resolveKomplekt(komplekt: Komplekt): Product {
  return {
    id: `komplekt::${komplekt.id}`,
    name: komplekt.name,
    price: komplektPrice(komplekt, "retail"),
    wholesalePrice: komplektPrice(komplekt, "wholesale") || undefined,
    costPrice: komplektCostPrice(komplekt),
    costCurrency: "UZS",
    barcode: "",
    customCode: "KOMPLEKT",
    unit: "komplekt",
    warehouse: "",
    vitrinaQty: komplektAvailableQty(komplekt),
    omborQty: 0,
    isKomplekt: true,
    komplektId: komplekt.id,
  };
}

/** Berilgan tovar a'zo bo'lgan barcha komplektlar ro'yxati. */
export function komplektlarOfProduct(productId: string): Komplekt[] {
  return MOCK_KOMPLEKTLAR.filter((k) => k.items.some((item) => item.productId === productId));
}

export type SupplierSummary = {
  id: string;
  name: string;
  phone: string;
  botEnabled: boolean;
  totalAmount: number;
  paidAmount: number;
  remainingDebt: number;
};

/** Yetkazib beruvchilarni MOCK_SUPPLIER_REPORTS asosida jamlab, ro'yxat sifatida qaytaradi. */
export function getSuppliersList(): SupplierSummary[] {
  const map = new Map<string, SupplierSummary>();
  MOCK_SUPPLIER_REPORTS.forEach((row) => {
    if (!row.supplierId) return;
    const current = map.get(row.supplierId);
    map.set(row.supplierId, {
      id: row.supplierId,
      name: row.supplierName || "Nomsiz yetkazib beruvchi",
      phone: row.supplierPhone || "",
      botEnabled: (current?.botEnabled ?? false) || Boolean(row.botEnabled),
      totalAmount: (current?.totalAmount ?? 0) + row.totalAmount,
      paidAmount: (current?.paidAmount ?? 0) + row.paidAmount,
      remainingDebt: (current?.remainingDebt ?? 0) + row.remainingDebt,
    });
  });
  return Array.from(map.values());
}

/** Yangi yetkazib beruvchi uchun keyingi navbatdagi ID, masalan `YB-0007`. */
export function nextSupplierId(): string {
  return `YB-${String(MOCK_SUPPLIER_REPORTS.length + 1).padStart(4, "0")}`;
}

/** Har bir prixod uchun keyingi navbatdagi unikal nakladnoy raqami, masalan `PRX-000123`. */
export function nextInvoiceNumber(): string {
  return `PRX-${String(MOCK_PRODUCT_HISTORY.length + 1).padStart(6, "0")}`;
}
