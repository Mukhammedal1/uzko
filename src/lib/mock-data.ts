import type { PermissionKey } from "./app-context";

export type Currency = string;

export type Product = {
  id: string;
  name: string;
  image?: string;
  shelfLocation?: string;
  minStockAlert?: number;
  price: number; // sotuv narx (so'mda)
  wholesalePrice?: number; // optom narx (so'mda)
  costPrice: number; // tan narx — costCurrency da
  costCurrency: Currency; // tan narx valyutasi
  barcode: string;
  customCode: string;
  unit: string;
  warehouse: string;
  vitrinaQty: number;
  omborQty: number;
  perBox?: number;
  preventBelowCost?: boolean;
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
  wholesalePrice?: number;
  costPrice?: number;
  costCurrency?: Currency;
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
  firstName: string;
  lastName: string;
  phone?: string;
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
  cash: number;
  cards: { type: string; amount: number }[];
  currencies: { code: Currency; amount: number }[];
  shortage: number; // kamomat
  leftInRegister: number; // kassada qoldi
  note?: string;
};

export type CashWithdrawal = {
  id: string;
  date: string;
  cashier: string;
  category: string;
  cash: number;
  cardAmount: number;
  currencies: { code: Currency; amount: number }[];
  note?: string;
  agentId?: string;
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
  monthlySalary: number;
  workDays?: number;
  workHoursPerDay?: number;
  payType?: "fixed" | "fixed_plus_sales";
  salesPercent?: number;
  source: "device" | "manual";
  deviceLogin?: string;
  devicePassword?: string;
};

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
  method: "naqd" | "karta" | "valyuta";
  cardType?: string;
  currencyCode?: string;
  note?: string;
  objectId?: string;
  objectName?: string;
};

/**
 * Nasiyachi yoki agent bilan qilingan pul operatsiyasi.
 * Nasiyachi uchun — faqat qarz so'ndirish (kassaga kirim).
 * Agent uchun — faqat to'lov (kassadan yoki ixtiyoriy manbadan chiqim).
 * Har bir operatsiya shu yerda saqlanadi va lupa ("cheklarni ko'rish") oynasida
 * tarix sifatida ko'rsatiladi.
 */
export type MoneyOperation = {
  id: string;
  date: string;
  cashier: string;
  party: "nasiyachi" | "agent";
  partyId: string;
  partyName: string;
  partyPhone?: string;
  /** in — pul kassaga kirdi (nasiyachi to'lovi), out — chiqim (agentga to'lov) */
  direction: "in" | "out";
  /** agent uchun: "kassa" — kassadan chiqim; "boshqa" — ixtiyoriy tashqi manba */
  source?: "kassa" | "boshqa";
  amount: number;
  method: "naqd" | "karta" | "valyuta";
  cardType?: string;
  currencyCode?: string;
  note?: string;
  /** Operatsiyadan keyingi qarz balansi (nasiyachi qarzi yoki bizning agentga qarzimiz) */
  balanceAfter: number;
};

export const MOCK_MONEY_OPERATIONS: MoneyOperation[] = [];

export type ReturnReceipt = {
  id: string;
  date: string;
  cashier: string;
  customerType: "oddiy" | "nasiya" | "agent";
  customerId?: string;
  customerName: string;
  agentId?: string;
  agentName?: string;
  agentPhone?: string;
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
  recipientCategory: "oddiy" | "nasiya" | "agent";
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
    category: "Agentlarga to'lov",
    cash: 500000,
    cardAmount: 0,
    currencies: [],
    note: "Agent qarzi qisman yopildi",
    agentId: "AG-0001",
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
  "Agentlarga to'lov",
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
    vitrinaQty: 80,
    omborQty: 420,
    perBox: 20,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p2",
    name: "Sement M500 50kg",
    price: 72000,
    costPrice: 60000,
    costCurrency: "UZS",
    barcode: "4781000000002",
    customCode: "QM002",
    unit: "qop",
    warehouse: "Quruq aralashmalar",
    vitrinaQty: 60,
    omborQty: 360,
    perBox: 20,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p3",
    name: "Shpaklovka start 25kg",
    image: "/products/shpaklovka.webp",
    price: 58000,
    costPrice: 45000,
    costCurrency: "UZS",
    barcode: "4781000000003",
    customCode: "QM003",
    unit: "qop",
    warehouse: "Quruq aralashmalar",
    vitrinaQty: 45,
    omborQty: 220,
    perBox: 10,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p4",
    name: "Shpaklovka finish 25kg",
    price: 64000,
    costPrice: 50000,
    costCurrency: "UZS",
    barcode: "4781000000004",
    customCode: "QM004",
    unit: "qop",
    warehouse: "Quruq aralashmalar",
    vitrinaQty: 40,
    omborQty: 200,
    perBox: 10,
    salesHistory: genHistory(60, 5),
  },
  {
    id: "p5",
    name: "Gips Rotband 30kg",
    image: "/products/knauf.webp",
    price: 78000,
    costPrice: 62000,
    costCurrency: "UZS",
    barcode: "4781000000005",
    customCode: "QM005",
    unit: "qop",
    warehouse: "Quruq aralashmalar",
    vitrinaQty: 35,
    omborQty: 160,
    perBox: 10,
    salesHistory: genHistory(60, 6),
  },
  {
    id: "p6",
    name: "PVA kley 1kg",
    image: "/products/pva-kley-1kg.webp",
    price: 18000,
    costPrice: 12000,
    costCurrency: "UZS",
    barcode: "4781000000006",
    customCode: "QM006",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 50,
    omborQty: 240,
    perBox: 12,
    salesHistory: genHistory(60, 7),
  },
  {
    id: "p8",
    name: "Kraska emulsiya oq 25kg",
    minStockAlert: 20,
    price: 215000,
    costPrice: 170000,
    costCurrency: "UZS",
    barcode: "4781000000008",
    customCode: "QM008",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 18,
    omborQty: 70,
    perBox: 4,
    salesHistory: genHistory(60, 9),
  },
  {
    id: "p9",
    name: "Kraska emulsiya 10kg",
    price: 98000,
    costPrice: 76000,
    costCurrency: "UZS",
    barcode: "4781000000009",
    customCode: "QM009",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 40,
    omborQty: 150,
    perBox: 4,
    salesHistory: genHistory(60, 10),
    variants: [
      {
        id: "oq",
        label: "Oq",
        attrs: { Rang: "Oq" },
        barcode: "4781000000091",
        customCode: "QM009-OQ",
        vitrinaQty: 22,
        omborQty: 85,
      },
      {
        id: "bej",
        label: "Bej",
        attrs: { Rang: "Bej" },
        barcode: "4781000000092",
        customCode: "QM009-BJ",
        price: 102000,
        vitrinaQty: 12,
        omborQty: 45,
      },
      {
        id: "kulrang",
        label: "Kulrang",
        attrs: { Rang: "Kulrang" },
        barcode: "4781000000093",
        customCode: "QM009-KL",
        price: 102000,
        vitrinaQty: 6,
        omborQty: 20,
      },
    ],
  },
  {
    id: "p-weber-fuga",
    name: "Weber fuga 3kg",
    minStockAlert: 6,
    price: 45000,
    costPrice: 34000,
    costCurrency: "UZS",
    barcode: "4781000000200",
    customCode: "QM200",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 16,
    omborQty: 55,
    perBox: 6,
    salesHistory: genHistory(60, 5),
    variants: [
      {
        id: "oq",
        label: "Oq",
        attrs: { Rang: "Oq" },
        barcode: "4781000000201",
        customCode: "QM200-OQ",
        vitrinaQty: 12,
        omborQty: 40,
      },
      {
        id: "qora",
        label: "Qora",
        attrs: { Rang: "Qora" },
        barcode: "4781000000202",
        customCode: "QM200-QR",
        vitrinaQty: 4,
        omborQty: 15,
      },
      {
        id: "sariq",
        label: "Sariq",
        attrs: { Rang: "Sariq" },
        barcode: "4781000000203",
        customCode: "QM200-SR",
        price: 47000,
        vitrinaQty: 0,
        omborQty: 0,
      },
    ],
  },
  {
    id: "p10",
    name: "Gruntovka 10L",
    minStockAlert: 25,
    price: 85000,
    costPrice: 65000,
    costCurrency: "UZS",
    barcode: "4781000000010",
    customCode: "QM010",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 20,
    omborQty: 90,
    perBox: 4,
    salesHistory: genHistory(60, 11),
  },
  {
    id: "p11",
    name: "Kirsaka 25kg",
    price: 52000,
    costPrice: 41000,
    costCurrency: "UZS",
    barcode: "4781000000011",
    customCode: "QM011",
    unit: "qop",
    warehouse: "Quruq aralashmalar",
    vitrinaQty: 38,
    omborQty: 180,
    perBox: 10,
    salesHistory: genHistory(60, 12),
  },
  {
    id: "p12",
    name: "Plitka kley 25kg",
    price: 61000,
    costPrice: 48000,
    costCurrency: "UZS",
    barcode: "4781000000012",
    customCode: "QM012",
    unit: "qop",
    warehouse: "Quruq aralashmalar",
    vitrinaQty: 55,
    omborQty: 260,
    perBox: 10,
    salesHistory: genHistory(60, 1),
  },
  {
    id: "p13",
    name: "Gipsokarton 12.5mm",
    minStockAlert: 32,
    price: 69000,
    costPrice: 54000,
    costCurrency: "UZS",
    barcode: "4781000000013",
    customCode: "QM013",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 30,
    omborQty: 140,
    perBox: 20,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p14",
    name: "Gipsokarton namga chidamli",
    price: 88000,
    costPrice: 70000,
    costCurrency: "UZS",
    barcode: "4781000000014",
    customCode: "QM014",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 22,
    omborQty: 100,
    perBox: 20,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p15",
    name: "Profil UD 3m",
    price: 26000,
    costPrice: 19000,
    costCurrency: "UZS",
    barcode: "4781000000015",
    customCode: "QM015",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 80,
    omborQty: 350,
    perBox: 50,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p16",
    name: "Profil CD 3m",
    price: 32000,
    costPrice: 24000,
    costCurrency: "UZS",
    barcode: "4781000000016",
    customCode: "QM016",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 75,
    omborQty: 320,
    perBox: 50,
    salesHistory: genHistory(60, 5),
  },
  {
    id: "p17",
    name: "Samorez 25mm 1000 dona",
    price: 45000,
    costPrice: 32000,
    costCurrency: "UZS",
    barcode: "4781000000017",
    customCode: "QM017",
    unit: "quti",
    warehouse: "Asosiy ombor",
    vitrinaQty: 25,
    omborQty: 110,
    perBox: 10,
    salesHistory: genHistory(60, 6),
  },
  {
    id: "p18",
    name: "Dyubel 6x40 100 dona",
    price: 18000,
    costPrice: 12000,
    costCurrency: "UZS",
    barcode: "4781000000018",
    customCode: "QM018",
    unit: "quti",
    warehouse: "Asosiy ombor",
    vitrinaQty: 40,
    omborQty: 200,
    perBox: 20,
    salesHistory: genHistory(60, 7),
  },
  {
    id: "p19",
    name: "Armatura 12mm",
    price: 92000,
    costPrice: 76000,
    costCurrency: "UZS",
    barcode: "4781000000019",
    customCode: "QM019",
    unit: "metr",
    warehouse: "Armatura ombori",
    vitrinaQty: 120,
    omborQty: 800,
    perBox: 100,
    salesHistory: genHistory(60, 8),
  },
  {
    id: "p20",
    name: "Armatura 10mm",
    price: 76000,
    costPrice: 63000,
    costCurrency: "UZS",
    barcode: "4781000000020",
    customCode: "QM020",
    unit: "metr",
    warehouse: "Armatura ombori",
    vitrinaQty: 140,
    omborQty: 900,
    perBox: 100,
    salesHistory: genHistory(60, 9),
  },
  {
    id: "p21",
    name: "Armatura 8mm",
    price: 58000,
    costPrice: 47000,
    costCurrency: "UZS",
    barcode: "4781000000021",
    customCode: "QM021",
    unit: "metr",
    warehouse: "Armatura ombori",
    vitrinaQty: 150,
    omborQty: 950,
    perBox: 100,
    salesHistory: genHistory(60, 10),
  },
  {
    id: "p22",
    name: "Katanka 6mm",
    price: 42000,
    costPrice: 34000,
    costCurrency: "UZS",
    barcode: "4781000000022",
    customCode: "QM022",
    unit: "metr",
    warehouse: "Armatura ombori",
    vitrinaQty: 160,
    omborQty: 1000,
    perBox: 100,
    salesHistory: genHistory(60, 11),
  },
  {
    id: "p23",
    name: "Setka rabitsa 1.5m",
    price: 185000,
    costPrice: 145000,
    costCurrency: "UZS",
    barcode: "4781000000023",
    customCode: "QM023",
    unit: "rulon",
    warehouse: "Armatura ombori",
    vitrinaQty: 12,
    omborQty: 55,
    salesHistory: genHistory(60, 12),
  },
  {
    id: "p24",
    name: "Setka кладочная 2x1m",
    price: 42000,
    costPrice: 32000,
    costCurrency: "UZS",
    barcode: "4781000000024",
    customCode: "QM024",
    unit: "dona",
    warehouse: "Armatura ombori",
    vitrinaQty: 60,
    omborQty: 240,
    perBox: 20,
    salesHistory: genHistory(60, 1),
  },
  {
    id: "p25",
    name: "Qum yuvilgan",
    price: 180000,
    costPrice: 140000,
    costCurrency: "UZS",
    barcode: "4781000000025",
    customCode: "QM025",
    unit: "m3",
    warehouse: "Tashqi maydon",
    vitrinaQty: 10,
    omborQty: 60,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p26",
    name: "Sheben 5-20",
    price: 230000,
    costPrice: 185000,
    costCurrency: "UZS",
    barcode: "4781000000026",
    customCode: "QM026",
    unit: "m3",
    warehouse: "Tashqi maydon",
    vitrinaQty: 8,
    omborQty: 45,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p27",
    name: "Gisht qizil",
    price: 1450,
    costPrice: 1050,
    costCurrency: "UZS",
    barcode: "4781000000027",
    customCode: "QM027",
    unit: "dona",
    warehouse: "Tashqi maydon",
    vitrinaQty: 500,
    omborQty: 9000,
    perBox: 1000,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p28",
    name: "Gisht oq silikat",
    price: 1850,
    costPrice: 1350,
    costCurrency: "UZS",
    barcode: "4781000000028",
    customCode: "QM028",
    unit: "dona",
    warehouse: "Tashqi maydon",
    vitrinaQty: 400,
    omborQty: 7000,
    perBox: 1000,
    salesHistory: genHistory(60, 5),
  },
  {
    id: "p29",
    name: "Gazoblok 600x300x200",
    price: 26000,
    costPrice: 20500,
    costCurrency: "UZS",
    barcode: "4781000000029",
    customCode: "QM029",
    unit: "dona",
    warehouse: "Tashqi maydon",
    vitrinaQty: 120,
    omborQty: 800,
    perBox: 60,
    salesHistory: genHistory(60, 6),
  },
  {
    id: "p30",
    name: "Penoblok 600x300x200",
    price: 24000,
    costPrice: 19000,
    costCurrency: "UZS",
    barcode: "4781000000030",
    customCode: "QM030",
    unit: "dona",
    warehouse: "Tashqi maydon",
    vitrinaQty: 110,
    omborQty: 760,
    perBox: 60,
    salesHistory: genHistory(60, 7),
  },
  {
    id: "p31",
    name: "OSB plita 9mm",
    price: 175000,
    costPrice: 138000,
    costCurrency: "UZS",
    barcode: "4781000000031",
    customCode: "QM031",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 20,
    omborQty: 80,
    perBox: 10,
    salesHistory: genHistory(60, 8),
  },
  {
    id: "p32",
    name: "Fanera 10mm",
    price: 165000,
    costPrice: 128000,
    costCurrency: "UZS",
    barcode: "4781000000032",
    customCode: "QM032",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 18,
    omborQty: 70,
    perBox: 10,
    salesHistory: genHistory(60, 9),
  },
  {
    id: "p33",
    name: "Laminat 8mm",
    price: 118000,
    costPrice: 92000,
    costCurrency: "UZS",
    barcode: "4781000000033",
    customCode: "QM033",
    unit: "m2",
    warehouse: "Asosiy ombor",
    vitrinaQty: 60,
    omborQty: 300,
    perBox: 10,
    salesHistory: genHistory(60, 10),
  },
  {
    id: "p34",
    name: "Plintus plastik",
    price: 18000,
    costPrice: 12500,
    costCurrency: "UZS",
    barcode: "4781000000034",
    customCode: "QM034",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 90,
    omborQty: 400,
    perBox: 50,
    salesHistory: genHistory(60, 11),
  },
  {
    id: "p35",
    name: "Keramogranit 60x60",
    price: 145000,
    costPrice: 110000,
    costCurrency: "UZS",
    barcode: "4781000000035",
    customCode: "QM035",
    unit: "m2",
    warehouse: "Asosiy ombor",
    vitrinaQty: 45,
    omborQty: 220,
    perBox: 5,
    salesHistory: genHistory(60, 12),
  },
  {
    id: "p36",
    name: "Kafel devor 25x40",
    price: 95000,
    costPrice: 72000,
    costCurrency: "UZS",
    barcode: "4781000000036",
    customCode: "QM036",
    unit: "m2",
    warehouse: "Asosiy ombor",
    vitrinaQty: 55,
    omborQty: 250,
    perBox: 5,
    salesHistory: genHistory(60, 1),
  },
  {
    id: "p37",
    name: "Fuga oq 2kg",
    price: 26000,
    costPrice: 18000,
    costCurrency: "UZS",
    barcode: "4781000000037",
    customCode: "QM037",
    unit: "dona",
    warehouse: "Quruq aralashmalar",
    vitrinaQty: 45,
    omborQty: 180,
    perBox: 12,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p38",
    name: "Silikon oq",
    price: 34000,
    costPrice: 24000,
    costCurrency: "UZS",
    barcode: "4781000000038",
    customCode: "QM038",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 35,
    omborQty: 160,
    perBox: 12,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p39",
    name: "Ko'pik montaj",
    price: 42000,
    costPrice: 31000,
    costCurrency: "UZS",
    barcode: "4781000000039",
    customCode: "QM039",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 38,
    omborQty: 170,
    perBox: 12,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p40",
    name: "Izolenta",
    price: 7000,
    costPrice: 4500,
    costCurrency: "UZS",
    barcode: "4781000000040",
    customCode: "QM040",
    unit: "dona",
    warehouse: "Elektr ombori",
    vitrinaQty: 80,
    omborQty: 400,
    perBox: 20,
    salesHistory: genHistory(60, 5),
  },
  {
    id: "p41",
    name: "Kabel VVG 2x2.5",
    price: 13500,
    costPrice: 9500,
    costCurrency: "UZS",
    barcode: "4781000000041",
    customCode: "QM041",
    unit: "metr",
    warehouse: "Elektr ombori",
    vitrinaQty: 300,
    omborQty: 1800,
    perBox: 100,
    salesHistory: genHistory(60, 6),
  },
  {
    id: "p42",
    name: "Kabel VVG 3x2.5",
    price: 18500,
    costPrice: 13500,
    costCurrency: "UZS",
    barcode: "4781000000042",
    customCode: "QM042",
    unit: "metr",
    warehouse: "Elektr ombori",
    vitrinaQty: 260,
    omborQty: 1500,
    perBox: 100,
    salesHistory: genHistory(60, 7),
  },
  {
    id: "p43",
    name: "Rozetka ichki",
    price: 22000,
    costPrice: 15000,
    costCurrency: "UZS",
    barcode: "4781000000043",
    customCode: "QM043",
    unit: "dona",
    warehouse: "Elektr ombori",
    vitrinaQty: 70,
    omborQty: 280,
    perBox: 20,
    salesHistory: genHistory(60, 8),
  },
  {
    id: "p44",
    name: "Viklyuchatel 1 klavish",
    price: 18000,
    costPrice: 12500,
    costCurrency: "UZS",
    barcode: "4781000000044",
    customCode: "QM044",
    unit: "dona",
    warehouse: "Elektr ombori",
    vitrinaQty: 65,
    omborQty: 250,
    perBox: 20,
    salesHistory: genHistory(60, 9),
  },
  {
    id: "p45",
    name: "Avtomat 16A",
    price: 52000,
    costPrice: 39000,
    costCurrency: "UZS",
    barcode: "4781000000045",
    customCode: "QM045",
    unit: "dona",
    warehouse: "Elektr ombori",
    vitrinaQty: 30,
    omborQty: 120,
    perBox: 10,
    salesHistory: genHistory(60, 10),
  },
  {
    id: "p46",
    name: "LED lampa 12W",
    price: 19000,
    costPrice: 12500,
    costCurrency: "UZS",
    barcode: "4781000000046",
    customCode: "QM046",
    unit: "dona",
    warehouse: "Elektr ombori",
    vitrinaQty: 90,
    omborQty: 360,
    perBox: 20,
    salesHistory: genHistory(60, 11),
  },
  {
    id: "p47",
    name: "Truba PPR 20mm",
    price: 11500,
    costPrice: 7800,
    costCurrency: "UZS",
    barcode: "4781000000047",
    customCode: "QM047",
    unit: "metr",
    warehouse: "Santexnika ombori",
    vitrinaQty: 220,
    omborQty: 1200,
    perBox: 100,
    salesHistory: genHistory(60, 12),
  },
  {
    id: "p48",
    name: "Truba PPR 25mm",
    price: 16500,
    costPrice: 11500,
    costCurrency: "UZS",
    barcode: "4781000000048",
    customCode: "QM048",
    unit: "metr",
    warehouse: "Santexnika ombori",
    vitrinaQty: 180,
    omborQty: 950,
    perBox: 100,
    salesHistory: genHistory(60, 1),
  },
  {
    id: "p49",
    name: "Ugolok PPR 20mm",
    price: 3500,
    costPrice: 2200,
    costCurrency: "UZS",
    barcode: "4781000000049",
    customCode: "QM049",
    unit: "dona",
    warehouse: "Santexnika ombori",
    vitrinaQty: 150,
    omborQty: 700,
    perBox: 50,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p50",
    name: "Mufta PPR 20mm",
    price: 3000,
    costPrice: 1900,
    costCurrency: "UZS",
    barcode: "4781000000050",
    customCode: "QM050",
    unit: "dona",
    warehouse: "Santexnika ombori",
    vitrinaQty: 160,
    omborQty: 800,
    perBox: 50,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p51",
    name: "Kran sharli 20mm",
    price: 28000,
    costPrice: 21000,
    costCurrency: "UZS",
    barcode: "4781000000051",
    customCode: "QM051",
    unit: "dona",
    warehouse: "Santexnika ombori",
    vitrinaQty: 45,
    omborQty: 180,
    perBox: 10,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p52",
    name: "Smesitel oshxona",
    price: 245000,
    costPrice: 185000,
    costCurrency: "UZS",
    barcode: "4781000000052",
    customCode: "QM052",
    unit: "dona",
    warehouse: "Santexnika ombori",
    vitrinaQty: 12,
    omborQty: 45,
    perBox: 4,
    salesHistory: genHistory(60, 5),
  },
  {
    id: "p53",
    name: "Unitaz komplekt",
    price: 680000,
    costPrice: 540000,
    costCurrency: "UZS",
    barcode: "4781000000053",
    customCode: "QM053",
    unit: "dona",
    warehouse: "Santexnika ombori",
    vitrinaQty: 6,
    omborQty: 22,
    salesHistory: genHistory(60, 6),
  },
  {
    id: "p54",
    name: "Rakovina 50cm",
    price: 310000,
    costPrice: 245000,
    costCurrency: "UZS",
    barcode: "4781000000054",
    customCode: "QM054",
    unit: "dona",
    warehouse: "Santexnika ombori",
    vitrinaQty: 8,
    omborQty: 30,
    salesHistory: genHistory(60, 7),
  },
  {
    id: "p55",
    name: "Eshik MDF",
    price: 950000,
    costPrice: 760000,
    costCurrency: "UZS",
    barcode: "4781000000055",
    customCode: "QM055",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 5,
    omborQty: 24,
    salesHistory: genHistory(60, 8),
  },
  {
    id: "p56",
    name: "Deraza profil 1m",
    price: 125000,
    costPrice: 98000,
    costCurrency: "UZS",
    barcode: "4781000000056",
    customCode: "QM056",
    unit: "metr",
    warehouse: "Asosiy ombor",
    vitrinaQty: 30,
    omborQty: 150,
    perBox: 10,
    salesHistory: genHistory(60, 9),
  },
  {
    id: "p57",
    name: "Hammer kraska 2.2kg",
    image: "/products/hammer-kraska-2-2kg.webp",
    price: 62000,
    costPrice: 48000,
    costCurrency: "UZS",
    barcode: "4781000000057",
    customCode: "QM057",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 22,
    omborQty: 80,
    perBox: 6,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p58",
    name: "Hayat fasad bo'yog'i 25kg (qizil)",
    image: "/products/hayat-fasad-25kg-qizil.webp",
    price: 385000,
    costPrice: 310000,
    costCurrency: "UZS",
    barcode: "4781000000058",
    customCode: "QM058",
    unit: "paqir",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 14,
    omborQty: 45,
    perBox: 1,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p59",
    name: "Hayat moyshik 15kg",
    image: "/products/hayat-moyshik-15kg.webp",
    price: 175000,
    costPrice: 138000,
    costCurrency: "UZS",
    barcode: "4781000000059",
    customCode: "QM059",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 18,
    omborQty: 60,
    perBox: 1,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p60",
    name: "Hayat oq kraska 115 3kg",
    image: "/products/hayat-oq-kraska-115-3kg.webp",
    price: 96000,
    costPrice: 76000,
    costCurrency: "UZS",
    barcode: "4781000000060",
    customCode: "QM060",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 26,
    omborQty: 90,
    perBox: 6,
    salesHistory: genHistory(60, 5),
  },
  {
    id: "p61",
    name: "Panda valik 44sm",
    image: "/products/panda-valik-44sm.webp",
    price: 32000,
    costPrice: 24000,
    costCurrency: "UZS",
    barcode: "4781000000061",
    customCode: "QM061",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 35,
    omborQty: 120,
    perBox: 10,
    salesHistory: genHistory(60, 6),
  },
  {
    id: "p62",
    name: "Yuda cho'tka",
    image: "/products/yuda-chotka.webp",
    price: 14000,
    costPrice: 9000,
    costCurrency: "UZS",
    barcode: "4781000000062",
    customCode: "QM062",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 40,
    omborQty: 150,
    perBox: 20,
    salesHistory: genHistory(60, 7),
  },
  {
    id: "p63",
    name: "Makita drel M45-5",
    image: "/products/makita-drel-m45-5.webp",
    minStockAlert: 3,
    price: 620000,
    costPrice: 490000,
    costCurrency: "UZS",
    barcode: "4781000000063",
    customCode: "QM063",
    unit: "dona",
    warehouse: "Asboblar ombori",
    vitrinaQty: 8,
    omborQty: 20,
    perBox: 1,
    salesHistory: genHistory(60, 1),
  },
  {
    id: "p64",
    name: "Makita bolg'ador (bog'o'radigan) M125-K2",
    image: "/products/makita-bolgarka-m125-k2.webp",
    minStockAlert: 3,
    price: 540000,
    costPrice: 420000,
    costCurrency: "UZS",
    barcode: "4781000000064",
    customCode: "QM064",
    unit: "dona",
    warehouse: "Asboblar ombori",
    vitrinaQty: 6,
    omborQty: 15,
    perBox: 1,
    salesHistory: genHistory(60, 1),
  },
  {
    id: "p65",
    name: "Tolsen stepler",
    image: "/products/tolsen-stepler.webp",
    price: 68000,
    costPrice: 52000,
    costCurrency: "UZS",
    barcode: "4781000000065",
    customCode: "QM065",
    unit: "dona",
    warehouse: "Asboblar ombori",
    vitrinaQty: 15,
    omborQty: 40,
    perBox: 5,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p66",
    name: "Tolsen trishotka 12758",
    image: "/products/tolsen-trishotka-12758.webp",
    price: 45000,
    costPrice: 34000,
    costCurrency: "UZS",
    barcode: "4781000000066",
    customCode: "QM066",
    unit: "dona",
    warehouse: "Asboblar ombori",
    vitrinaQty: 12,
    omborQty: 36,
    perBox: 6,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p67",
    name: "Tolsen klyuch nabor 12-42",
    image: "/products/tolsen-klyuch-nabor-12-42.webp",
    price: 285000,
    costPrice: 220000,
    costCurrency: "UZS",
    barcode: "4781000000067",
    customCode: "QM067",
    unit: "nabor",
    warehouse: "Asboblar ombori",
    vitrinaQty: 9,
    omborQty: 24,
    perBox: 4,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p68",
    name: "Hi-Tech lyustra H10-B2",
    image: "/products/hi-tech-lyustra-h10-b2.webp",
    price: 465000,
    costPrice: 365000,
    costCurrency: "UZS",
    barcode: "4781000000068",
    customCode: "QM068",
    unit: "dona",
    warehouse: "Elektr ombori",
    vitrinaQty: 7,
    omborQty: 22,
    perBox: 1,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p69",
    name: "Uzled lyustra M400 6500K",
    image: "/products/uzled-lyustra-m400-6500k.webp",
    price: 215000,
    costPrice: 168000,
    costCurrency: "UZS",
    barcode: "4781000000069",
    customCode: "QM069",
    unit: "dona",
    warehouse: "Elektr ombori",
    vitrinaQty: 11,
    omborQty: 30,
    perBox: 1,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p70",
    name: "Uzled lyustra M852 4000K",
    image: "/products/uzled-lyustra-m852-4000k.webp",
    price: 340000,
    costPrice: 265000,
    costCurrency: "UZS",
    barcode: "4781000000070",
    customCode: "QM070",
    unit: "dona",
    warehouse: "Elektr ombori",
    vitrinaQty: 8,
    omborQty: 20,
    perBox: 1,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p71",
    name: "Zanjira Ottacento 5kg",
    image: "/products/zanjira-ottacento-5kg.webp",
    price: 285000,
    costPrice: 225000,
    costCurrency: "UZS",
    barcode: "4781000000071",
    customCode: "QM071",
    unit: "dona",
    warehouse: "Quruq aralashmalar",
    vitrinaQty: 10,
    omborQty: 28,
    perBox: 4,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p72",
    name: "All Germetika",
    image: "/products/all-germetika.webp",
    price: 32000,
    costPrice: 24000,
    costCurrency: "UZS",
    barcode: "4781000000072",
    customCode: "QM072",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 28,
    omborQty: 85,
    perBox: 12,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p73",
    name: "Gipsokarton tom va fasad uchun",
    image: "/products/gipsokarton-tom-fasad.webp",
    price: 92000,
    costPrice: 72000,
    costCurrency: "UZS",
    barcode: "4781000000073",
    customCode: "QM073",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 20,
    omborQty: 60,
    perBox: 1,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p74",
    name: "Greenc katyol (Xitoy)",
    image: "/products/greenc-katyol-xitoy.webp",
    price: 24000,
    costPrice: 17000,
    costCurrency: "UZS",
    barcode: "4781000000074",
    customCode: "QM074",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 30,
    omborQty: 100,
    perBox: 20,
    salesHistory: genHistory(60, 5),
  },
  {
    id: "p75",
    name: "Nero oboi pichog'i NR-25",
    image: "/products/nero-oboi-pichoq-nr25.webp",
    price: 16000,
    costPrice: 11000,
    costCurrency: "UZS",
    barcode: "4781000000075",
    customCode: "QM075",
    unit: "dona",
    warehouse: "Asboblar ombori",
    vitrinaQty: 25,
    omborQty: 70,
    perBox: 10,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p76",
    name: "Kafel g'ishtli",
    image: "/products/kafel-gishtli.webp",
    price: 78000,
    costPrice: 60000,
    costCurrency: "UZS",
    barcode: "4781000000076",
    customCode: "QM076",
    unit: "m2",
    warehouse: "Asosiy ombor",
    vitrinaQty: 16,
    omborQty: 50,
    perBox: 1,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p77",
    name: "Nero filter F45K",
    image: "/products/nero-filter-f45k.webp",
    price: 21000,
    costPrice: 15000,
    costCurrency: "UZS",
    barcode: "4781000000077",
    customCode: "QM077",
    unit: "dona",
    warehouse: "Asboblar ombori",
    vitrinaQty: 18,
    omborQty: 55,
    perBox: 10,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p78",
    name: "Nero metr NR-3M",
    image: "/products/nero-metr-nr3m.webp",
    price: 19000,
    costPrice: 13000,
    costCurrency: "UZS",
    barcode: "4781000000078",
    customCode: "QM078",
    unit: "dona",
    warehouse: "Asboblar ombori",
    vitrinaQty: 22,
    omborQty: 65,
    perBox: 10,
    salesHistory: genHistory(60, 3),
  },
  {
    id: "p79",
    name: "Samsung katyol",
    image: "/products/samsung-katyol.webp",
    price: 22000,
    costPrice: 16000,
    costCurrency: "UZS",
    barcode: "4781000000079",
    customCode: "QM079",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 28,
    omborQty: 90,
    perBox: 20,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p80",
    name: "Turkiya katyol",
    image: "/products/turkiya-katyol.webp",
    price: 27000,
    costPrice: 19000,
    costCurrency: "UZS",
    barcode: "4781000000080",
    customCode: "QM080",
    unit: "dona",
    warehouse: "Bo\'yoq ombori",
    vitrinaQty: 24,
    omborQty: 80,
    perBox: 20,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p81",
    name: "Waserman WR-10R",
    image: "/products/waserman-wr-10r.webp",
    minStockAlert: 3,
    price: 310000,
    costPrice: 240000,
    costCurrency: "UZS",
    barcode: "4781000000081",
    customCode: "QM081",
    unit: "dona",
    warehouse: "Asboblar ombori",
    vitrinaQty: 9,
    omborQty: 26,
    perBox: 1,
    salesHistory: genHistory(60, 2),
  },
  {
    id: "p82",
    quick: true,
    name: "Nikel qulfli ruchka",
    image: "/products/nikel-qulfli-ruchka.webp",
    price: 38000,
    costPrice: 27000,
    costCurrency: "UZS",
    barcode: "4781000000082",
    customCode: "QM082",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 20,
    omborQty: 60,
    perBox: 10,
    salesHistory: genHistory(60, 4),
  },
  {
    id: "p83",
    quick: true,
    name: "Oshiq-moshiq J458-5",
    image: "/products/oshiq-moshiq-j458-5.webp",
    price: 26000,
    costPrice: 18000,
    costCurrency: "UZS",
    barcode: "4781000000083",
    customCode: "QM083",
    unit: "dona",
    warehouse: "Asosiy ombor",
    vitrinaQty: 24,
    omborQty: 70,
    perBox: 12,
    salesHistory: genHistory(60, 4),
  },
].map((product: Product) => ({
  ...product,
  wholesalePrice:
    product.wholesalePrice ??
    Math.max(0, Math.round(product.price * (product.price > 5000 ? 0.92 : 0.95))),
  image: product.image ?? placeholderProductImage(product),
}));

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
  agentId: string;
  agentName: string;
  agentPhone: string;
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
  agentName?: string;
  agentId?: string;
  agentPhone?: string;
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
    agentId: "AG-0001",
    agentName: "Bekzod Agent",
    agentPhone: "+998901112233",
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
    agentName: "Bekzod Agent",
    agentId: "AG-0001",
    agentPhone: "+998901112233",
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

/** Sanoq qaysi qamrovda o'tkazildi: butun baza yoki bitta ombor. */
export type StockCountScope = "all" | "warehouse";

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
  /** scope "warehouse" bo'lsa — ombor nomi. */
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

const DEMO_AGENT_NAMES = [
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
  return DEMO_AGENT_NAMES.map((name, index) => {
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
      agentId: `AG-${String(index + 2).padStart(4, "0")}`,
      agentName: name,
      agentPhone: demoPhone(index + 130, 95 + (index % 4)),
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
      note: "Ertangi taqdimot uchun demo agent prixodi",
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
  const productIds = new Set(MOCK_PRODUCTS.map((product) => product.id));
  const demoProducts = generateDemoProducts().filter((product) => !productIds.has(product.id));
  MOCK_PRODUCTS.push(...demoProducts);

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
      agentName: report.agentName,
      agentId: report.agentId,
      agentPhone: report.agentPhone,
      paidAmount: report.paidAmount,
      remainingDebt: report.remainingDebt,
      totalAmount: report.totalAmount,
      note: "Demo agent kirim tarixi",
    });

    if (report.botEnabled) {
      MOCK_RECEIPT_DISPATCHES.unshift({
        id: `msg-agent-demo-${index + 1}`,
        date: report.date,
        recipientCategory: "agent",
        recipientId: report.agentId,
        recipientName: report.agentName,
        phone: report.agentPhone,
        receiptId: report.id,
        title: "Agent hisob-kitob cheki",
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
      method: index % 3 === 0 ? "karta" : index % 3 === 1 ? "naqd" : "valyuta",
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
      category: "Agentlarga to'lov",
      cash: 250000 + index * 85000,
      cardAmount: index % 2 === 0 ? 120000 + index * 35000 : 0,
      currencies: [],
      note: `${report.agentName} uchun demo to'lov`,
      agentId: report.agentId,
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

export type AgentSummary = {
  id: string;
  name: string;
  phone: string;
  botEnabled: boolean;
  totalAmount: number;
  paidAmount: number;
  remainingDebt: number;
};

/** Agentlarni MOCK_SUPPLIER_REPORTS asosida jamlab, ro'yxat sifatida qaytaradi. */
export function getAgentsList(): AgentSummary[] {
  const map = new Map<string, AgentSummary>();
  MOCK_SUPPLIER_REPORTS.forEach((row) => {
    if (!row.agentId) return;
    const current = map.get(row.agentId);
    map.set(row.agentId, {
      id: row.agentId,
      name: row.agentName || "Nomsiz agent",
      phone: row.agentPhone || "",
      botEnabled: (current?.botEnabled ?? false) || Boolean(row.botEnabled),
      totalAmount: (current?.totalAmount ?? 0) + row.totalAmount,
      paidAmount: (current?.paidAmount ?? 0) + row.paidAmount,
      remainingDebt: (current?.remainingDebt ?? 0) + row.remainingDebt,
    });
  });
  return Array.from(map.values());
}

/** Yangi agent uchun keyingi navbatdagi ID, masalan `AG-0007`. */
export function nextAgentId(): string {
  return `AG-${String(MOCK_SUPPLIER_REPORTS.length + 1).padStart(4, "0")}`;
}

/** Har bir prixod uchun keyingi navbatdagi unikal nakladnoy raqami, masalan `PRX-000123`. */
export function nextInvoiceNumber(): string {
  return `PRX-${String(MOCK_PRODUCT_HISTORY.length + 1).padStart(6, "0")}`;
}
