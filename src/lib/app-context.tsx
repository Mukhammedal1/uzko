import * as React from "react";

// ─── Til / i18n ─────────────────────────────────────────────────────────────

export type Lang = "uz" | "uz_cyr" | "ru" | "en";

export const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  uz: {
    sotuv: "Sotuv",
    kassa: "Kassa",
    tovarlar: "Tovarlar",
    sozlamalar: "Sozlamalar",
    umumiy: "Umumiy",
    receipt_view: "Chek ko'rinish",
    general_edit: "Umumiy tahrirlash",
    dark_mode: "Qorong'u rejim",
    light_mode: "Yorug' rejim",
    language: "Til",
    user_settings: "Foydalanuvchi",
    device_settings: "Qurilmalar",
    interface_settings: "Interfeys",
    username: "Ism",
    confirm_code: "Tasdiqlash kodi",
    save: "Saqlash",
    cancel: "Bekor",
    add_device: "Qurilma qo'shish",
    device_name: "Qurilma nomi",
    permissions: "Ruxsatlar",
    perm_sotuv: "Sotuv",
    perm_kassa: "Kassa",
    perm_tovarlar: "Tovarlar",
    perm_sozlamalar: "Sozlamalar",
    current_device: "Joriy qurilma",
    remove_device: "O'chirish",
    theme: "Mavzu",
    uz_latin: "O'zbek (lotin)",
    uz_cyrillic: "Ўзбек (кирилл)",
    russian: "Русский",
    english: "English",
    saved: "Saqlandi!",
    code_changed: "Tasdiqlash kodi o'zgartirildi",
    name_changed: "Ism o'zgartirildi",
    device_added: "Qurilma qo'shildi",
    device_removed: "Qurilma o'chirildi",
    main_device: "Asosiy qurilma",
    report: "Hisobot",
    business_receivable: "Bizni haqimiz",
    products_history: "Tovarlar tarixi",
    all_products: "Barcha tovarlar",
    goods_receipt: "Tovar prixod qilish",
    price_update: "Narx yangilash",
    add_product: "Tovar qo'shish",
    supplier_total_debt_goods: "Qarzga olingan tovarlar summasi",
    supplier_paid: "Berganimiz",
    supplier_remaining: "Qolgan qarzimiz",
    supplier_report_list: "Agentlar bo'yicha hisobot",
    date: "Sana",
    agent: "Agent",
    phone: "Raqam",
    products: "Tovarlar",
    total_amount: "Umumiy summa",
    paid_amount: "Berilgan summa",
    remaining_debt: "Qolgan qarz",
    added_by: "Kim qo'shdi",
    empty: "Ma'lumot yo'q",
    added_products: "Tovar qo'shish tarixi",
    edited_products: "Tahrirlangan tovarlar",
    product: "Tovar",
    qty: "Miqdor",
    sale_price: "Sotuv narxi",
    cost_price: "Tan narx",
    warehouse: "Ombor",
    old_qty: "Eski soni",
    new_qty: "Yangi soni",
    action: "Amal",
    edited_by: "Kim tahrirladi",
    deleted: "O'chirildi",
    edited: "Tahrirlandi",
    written_off: "Hisobdan chiqarildi",
    edit: "Edit",
    delete: "Delete",
    source_details: "Qayerdan keldi",
    agent_name: "Agent nomi",
    agent_phone: "Agent raqami",
    paid_now: "Hozir berilgan summa",
    supplier_note: "Izoh",
    discount_amount: "Skidka summasi",
    no_permission: "Ruxsat yo'q",
    expense_categories: "Xarajatlar kategoriyasi",
    income_expense_analysis: "Kirim chiqim analizi",
    income: "Kirim",
    expense: "Chiqim",
    always: "Doim",
    today: "Bugun",
    this_week: "Bu hafta",
    this_month: "Bu oy",
    custom_period: "Maxsus davr",
    sales_income: "Sotuvdan kirim",
    debt_payment_income: "Qarz so'ndirishdan",
    supplier_payment_expense: "Agentlarga to'lov",
    agent_id: "Agent ID",
    shelf_location: "Polka raqami",
    stock_count: "Sanoq",
    stock_counted: "Sanoq qilindi",
    boshqaruv: "Boshqaruv",
  },
  uz_cyr: {
    sotuv: "Сотув",
    kassa: "Касса",
    tovarlar: "Товарлар",
    sozlamalar: "Созламалар",
    umumiy: "Умумий",
    receipt_view: "Чек кўриниш",
    general_edit: "Умумий таҳрирлаш",
    dark_mode: "Қоронғу режим",
    light_mode: "Ёруғ режим",
    language: "Тил",
    user_settings: "Фойдаланувчи",
    device_settings: "Қурилмалар",
    interface_settings: "Интерфейс",
    username: "Исм",
    confirm_code: "Тасдиқлаш коди",
    save: "Сақлаш",
    cancel: "Бекор",
    add_device: "Қурилма қўшиш",
    device_name: "Қурилма номи",
    permissions: "Рухсатлар",
    perm_sotuv: "Сотув",
    perm_kassa: "Касса",
    perm_tovarlar: "Товарлар",
    perm_sozlamalar: "Созламалар",
    current_device: "Жорий қурилма",
    remove_device: "Ўчириш",
    theme: "Мавзу",
    uz_latin: "O'zbek (lotin)",
    uz_cyrillic: "Ўзбек (кирилл)",
    russian: "Русский",
    english: "English",
    saved: "Сақланди!",
    code_changed: "Тасдиқлаш коди ўзгартирилди",
    name_changed: "Исм ўзгартирилди",
    device_added: "Қурилма қўшилди",
    device_removed: "Қурилма ўчирилди",
    main_device: "Асосий қурилма",
    report: "Ҳисобот",
    business_receivable: "Бизни ҳақимиз",
    products_history: "Товарлар тарихи",
    all_products: "Барча товарлар",
    goods_receipt: "Товар приход қилиш",
    price_update: "Нарх янгилаш",
    add_product: "Товар қўшиш",
    supplier_total_debt_goods: "Қарзга олинган товарлар суммаси",
    supplier_paid: "Берганимиз",
    supplier_remaining: "Қолган қарзимиз",
    supplier_report_list: "Агентлар бўйича ҳисобот",
    date: "Сана",
    agent: "Агент",
    phone: "Рақам",
    products: "Товарлар",
    total_amount: "Умумий сумма",
    paid_amount: "Берилган сумма",
    remaining_debt: "Қолган қарз",
    added_by: "Ким қўшди",
    empty: "Маълумот йўқ",
    added_products: "Товар қўшиш тарихи",
    edited_products: "Таҳрирланган товарлар",
    product: "Товар",
    qty: "Миқдор",
    sale_price: "Сотув нархи",
    cost_price: "Тан нарх",
    warehouse: "Омбор",
    old_qty: "Эски сони",
    new_qty: "Янги сони",
    action: "Амал",
    edited_by: "Ким таҳрирлади",
    deleted: "Ўчирилди",
    edited: "Таҳрирланди",
    written_off: "Ҳисобдан чиқарилди",
    edit: "Таҳрир",
    delete: "Ўчириш",
    source_details: "Қаердан келди",
    agent_name: "Агент номи",
    agent_phone: "Агент рақами",
    paid_now: "Ҳозир берилган сумма",
    supplier_note: "Изоҳ",
    discount_amount: "Скидка суммаси",
    no_permission: "Рухсат йўқ",
    expense_categories: "Харажатлар категорияси",
    income_expense_analysis: "Кирим чиқим анализи",
    income: "Кирим",
    expense: "Чиқим",
    always: "Доим",
    today: "Бугун",
    this_week: "Бу ҳафта",
    this_month: "Бу ой",
    custom_period: "Махсус давр",
    sales_income: "Сотувдан кирим",
    debt_payment_income: "Қарз сўндиришдан",
    supplier_payment_expense: "Агентларга тўлов",
    agent_id: "Агент ID",
    shelf_location: "Полка рақами",
    stock_count: "Саноқ",
    stock_counted: "Саноқ қилинди",
    boshqaruv: "Бошқарув",
  },
  ru: {
    sotuv: "Продажа",
    kassa: "Касса",
    tovarlar: "Товары",
    sozlamalar: "Настройки",
    umumiy: "Общее",
    receipt_view: "Вид чека",
    general_edit: "Общее редактирование",
    dark_mode: "Тёмный режим",
    light_mode: "Светлый режим",
    language: "Язык",
    user_settings: "Пользователь",
    device_settings: "Устройства",
    interface_settings: "Интерфейс",
    username: "Имя",
    confirm_code: "Код подтверждения",
    save: "Сохранить",
    cancel: "Отмена",
    add_device: "Добавить устройство",
    device_name: "Название устройства",
    permissions: "Разрешения",
    perm_sotuv: "Продажа",
    perm_kassa: "Касса",
    perm_tovarlar: "Товары",
    perm_sozlamalar: "Настройки",
    current_device: "Текущее устройство",
    remove_device: "Удалить",
    theme: "Тема",
    uz_latin: "O'zbek (lotin)",
    uz_cyrillic: "Ўзбек (кирилл)",
    russian: "Русский",
    english: "English",
    saved: "Сохранено!",
    code_changed: "Код подтверждения изменён",
    name_changed: "Имя изменено",
    device_added: "Устройство добавлено",
    device_removed: "Устройство удалено",
    main_device: "Основное устройство",
    report: "Отчёт",
    business_receivable: "Нам должны",
    products_history: "История товаров",
    all_products: "Все товары",
    goods_receipt: "Приход товара",
    price_update: "Обновить цены",
    add_product: "Добавить товар",
    supplier_total_debt_goods: "Сумма товаров в долг",
    supplier_paid: "Оплачено",
    supplier_remaining: "Осталось долга",
    supplier_report_list: "Отчёт по агентам",
    date: "Дата",
    agent: "Агент",
    phone: "Телефон",
    products: "Товары",
    total_amount: "Общая сумма",
    paid_amount: "Оплаченная сумма",
    remaining_debt: "Остаток долга",
    added_by: "Кто добавил",
    empty: "Нет данных",
    added_products: "История добавления",
    edited_products: "Изменённые товары",
    product: "Товар",
    qty: "Количество",
    sale_price: "Цена продажи",
    cost_price: "Себестоимость",
    warehouse: "Склад",
    old_qty: "Старое кол-во",
    new_qty: "Новое кол-во",
    action: "Действие",
    edited_by: "Кто изменил",
    deleted: "Удалено",
    edited: "Изменено",
    written_off: "Списано",
    edit: "Редактировать",
    delete: "Удалить",
    source_details: "Откуда пришло",
    agent_name: "Имя агента",
    agent_phone: "Телефон агента",
    paid_now: "Оплачено сейчас",
    supplier_note: "Комментарий",
    discount_amount: "Сумма скидки",
    no_permission: "Нет доступа",
    expense_categories: "Категории расходов",
    income_expense_analysis: "Анализ доходов и расходов",
    income: "Доход",
    expense: "Расход",
    always: "Всегда",
    today: "Сегодня",
    this_week: "Эта неделя",
    this_month: "Этот месяц",
    custom_period: "Свой период",
    sales_income: "Доход от продаж",
    debt_payment_income: "Погашение долга",
    supplier_payment_expense: "Оплата агентам",
    agent_id: "ID агента",
    shelf_location: "Номер полки",
    stock_count: "Ревизия",
    stock_counted: "Ревизия проведена",
    boshqaruv: "Управление",
  },
  en: {
    sotuv: "Sales",
    kassa: "Cash Register",
    tovarlar: "Products",
    sozlamalar: "Settings",
    umumiy: "General",
    receipt_view: "Receipt view",
    general_edit: "General edit",
    dark_mode: "Dark Mode",
    light_mode: "Light Mode",
    language: "Language",
    user_settings: "User",
    device_settings: "Devices",
    interface_settings: "Interface",
    username: "Name",
    confirm_code: "Confirmation Code",
    save: "Save",
    cancel: "Cancel",
    add_device: "Add Device",
    device_name: "Device Name",
    permissions: "Permissions",
    perm_sotuv: "Sales",
    perm_kassa: "Cash Register",
    perm_tovarlar: "Products",
    perm_sozlamalar: "Settings",
    current_device: "Current Device",
    remove_device: "Remove",
    theme: "Theme",
    uz_latin: "O'zbek (lotin)",
    uz_cyrillic: "Ўзбек (кирилл)",
    russian: "Русский",
    english: "English",
    saved: "Saved!",
    code_changed: "Confirmation code changed",
    name_changed: "Name changed",
    device_added: "Device added",
    device_removed: "Device removed",
    main_device: "Main device",
    report: "Report",
    business_receivable: "Receivables",
    products_history: "Product history",
    all_products: "All products",
    goods_receipt: "Goods receipt",
    price_update: "Update prices",
    add_product: "Add product",
    supplier_total_debt_goods: "Goods received on credit",
    supplier_paid: "Paid",
    supplier_remaining: "Remaining debt",
    supplier_report_list: "Supplier report list",
    date: "Date",
    agent: "Agent",
    phone: "Phone",
    products: "Products",
    total_amount: "Total amount",
    paid_amount: "Paid amount",
    remaining_debt: "Remaining debt",
    added_by: "Added by",
    empty: "No data",
    added_products: "Added products history",
    edited_products: "Edited products",
    product: "Product",
    qty: "Qty",
    sale_price: "Sale price",
    cost_price: "Cost price",
    warehouse: "Warehouse",
    old_qty: "Old qty",
    new_qty: "New qty",
    action: "Action",
    edited_by: "Edited by",
    deleted: "Deleted",
    edited: "Edited",
    written_off: "Written off",
    edit: "Edit",
    delete: "Delete",
    source_details: "Source details",
    agent_name: "Agent name",
    agent_phone: "Agent phone",
    paid_now: "Paid now",
    supplier_note: "Note",
    discount_amount: "Discount amount",
    no_permission: "No permission",
    expense_categories: "Expense categories",
    income_expense_analysis: "Income/expense analysis",
    income: "Income",
    expense: "Expense",
    always: "Always",
    today: "Today",
    this_week: "This week",
    this_month: "This month",
    custom_period: "Custom period",
    sales_income: "Sales income",
    debt_payment_income: "Debt payment",
    supplier_payment_expense: "Supplier payments",
    agent_id: "Agent ID",
    shelf_location: "Shelf Number",
    stock_count: "Stock count",
    stock_counted: "Stock counted",
    boshqaruv: "Management",
  },
};

// ─── Device / Qurilma ────────────────────────────────────────────────────────

export type PermissionKey =
  | "sotuv.create"
  | "sotuv.view"
  | "kassa.view"
  | "kassa.close"
  | "kassa.withdraw"
  | "tovarlar.view"
  | "tovarlar.create"
  | "tovarlar.edit"
  | "nasiya.view"
  | "nasiya.close"
  | "hisobotlar.view"
  | "boshqaruv.manage";

export type Device = {
  id: string;
  name: string;
  login?: string;
  password?: string;
  model?: string;
  lastConnectedAt?: string;
  permissions: PermissionKey[];
  employeeId?: string;
  active: boolean;
  isMain: boolean;
};

// ─── Spravochniklar ─────────────────────────────────────────────────────────

export type WarehouseEntry = { id: string; name: string };
export type ExpenseCategoryEntry = { id: string; name: string; note?: string };
export type ShelfLocationEntry = { id: string; name: string; warehouse: string };
export type UnitEntry = { id: string; name: string; abbr: string; isBoxUnit?: boolean };

// ─── App State ───────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

export type ReceiptWidth = "58" | "80";
export type ReceiptFontSize = "small" | "normal" | "large";

export type ReceiptSettings = {
  storeName: string;
  phone: string;
  social: string;
  extraNote: string;
  showProductCode: boolean;
  showLogo: boolean;
  showAddress: boolean;
  address: string;
  showPhone: boolean;
  showCashier: boolean;
  showQr: boolean;
  width: ReceiptWidth;
  fontSize: ReceiptFontSize;
};

export type AccessNotification = {
  id: string;
  title: string;
  description: string;
  date: string;
  status?: "pending" | "approved";
  deviceId?: string;
  deviceModel?: string;
  deviceLogin?: string;
  read?: boolean;
};

export type AppSettings = {
  username: string;
  confirmCode: string;
  theme: Theme;
  lang: Lang;
  companyRegistrationId?: string;
  accessNotifications: AccessNotification[];
  devices: Device[];
  currentDeviceId: string;
  receiptSettings: ReceiptSettings;
  warehouses: WarehouseEntry[];
  currencies: string[];
  expenseCategories: ExpenseCategoryEntry[];
  units: UnitEntry[];
  shelfLocations: ShelfLocationEntry[];
  quickAddToCart: boolean;
  labelPrintSettings?: {
    receiptMode: boolean;
    includeName: boolean;
    includePrice: boolean;
    includeBarcode: boolean;
    includeCustomCode: boolean;
    includeShelfLocation: boolean;
    size: "small" | "medium" | "large";
    fieldScale: Record<"name" | "barcode" | "code" | "price" | "shelf", number>;
    paperSize: "thermal58" | "thermal80" | "a6" | "a4";
    commentEnabled: boolean;
    comment: string;
    matchStockQty: boolean;
  };
};

const DEFAULT_SETTINGS: AppSettings = {
  username: "Admin",
  confirmCode: "1234",
  quickAddToCart: true,
  theme: "light",
  lang: "uz",
  companyRegistrationId: "",
  accessNotifications: [],
  currentDeviceId: "main",
  receiptSettings: {
    storeName: "UZKO SAVDO",
    phone: "",
    social: "",
    extraNote: "Bu chek faqat narxlarni solishtirish uchun.",
    showProductCode: true,
    showLogo: true,
    showAddress: false,
    address: "",
    showPhone: true,
    showCashier: true,
    showQr: false,
    width: "80",
    fontSize: "normal",
  },
  warehouses: [
    { id: "wh-1", name: "Asosiy ombor" },
    { id: "wh-2", name: "Vitrina ombor" },
    { id: "wh-3", name: "Sovutgich" },
    { id: "wh-4", name: "Sabzavot ombor" },
    { id: "wh-5", name: "Meva ombor" },
  ],
  currencies: ["UZS", "USD", "RUB", "EUR"],
  expenseCategories: [
    { id: "ec-1", name: "Tushlik" },
    { id: "ec-2", name: "Oylik" },
    { id: "ec-3", name: "Avans" },
    { id: "ec-4", name: "Premya" },
    { id: "ec-5", name: "Remont" },
    { id: "ec-6", name: "Tovar" },
    { id: "ec-7", name: "Kommunal" },
    { id: "ec-8", name: "Agentlarga to'lov" },
    { id: "ec-9", name: "Boshqa" },
  ],
  units: [
    { id: "u-1", name: "dona", abbr: "dona" },
    { id: "u-2", name: "karobka", abbr: "kar" },
    { id: "u-3", name: "dona | karobka", abbr: "dona/kar", isBoxUnit: true },
    { id: "u-4", name: "kg", abbr: "kg" },
    { id: "u-5", name: "litr", abbr: "l" },
    { id: "u-6", name: "metr", abbr: "m" },
    { id: "u-7", name: "tonna", abbr: "t" },
  ],
  shelfLocations: [
    { id: "sl-1", name: "B-001", warehouse: "Asosiy ombor" },
    { id: "sl-2", name: "B-002", warehouse: "Asosiy ombor" },
    { id: "sl-3", name: "B-003", warehouse: "Vitrina ombor" },
    { id: "sl-4", name: "B-004", warehouse: "Vitrina ombor" },
    { id: "sl-5", name: "B-005", warehouse: "Sovutgich" },
  ],
  devices: [
    {
      id: "main",
      name: "Asosiy qurilma",
      login: "admin",
      password: "1234",
      isMain: true,
      active: true,
      employeeId: "X-005",
      permissions: [
        "sotuv.create",
        "sotuv.view",
        "kassa.view",
        "kassa.close",
        "kassa.withdraw",
        "tovarlar.view",
        "tovarlar.create",
        "tovarlar.edit",
        "nasiya.view",
        "nasiya.close",
        "hisobotlar.view",
        "boshqaruv.manage",
      ],
    },
    {
      id: "device2",
      name: "2-qurilma",
      login: "kassa2",
      password: "1234",
      isMain: false,
      active: true,
      employeeId: "X-006",
      permissions: ["sotuv.create", "sotuv.view", "kassa.view", "kassa.close"],
    },
    {
      id: "device3",
      name: "3-qurilma",
      login: "ombor3",
      password: "1234",
      isMain: false,
      active: true,
      employeeId: "X-007",
      permissions: ["tovarlar.view", "tovarlar.create", "tovarlar.edit"],
    },
  ],
};

const AUTO_TEXT: Record<string, Record<Exclude<Lang, "uz">, string>> = {
  "Savdoni tasdiqlash": {
    uz_cyr: "Савдони тасдиқлаш",
    ru: "Подтверждение продажи",
    en: "Confirm sale",
  },
  "To'lash uchun": { uz_cyr: "Тўлаш учун", ru: "К оплате", en: "Amount due" },
  "Xaridor turi": { uz_cyr: "Харидор тури", ru: "Тип покупателя", en: "Customer type" },
  Oddiy: { uz_cyr: "Оддий", ru: "Обычный", en: "Regular" },
  Nasiya: { uz_cyr: "Насия", ru: "В долг", en: "Credit" },
  "Mijoz ism / familya": {
    uz_cyr: "Мижоз исм / фамилия",
    ru: "Имя / фамилия клиента",
    en: "Customer first / last name",
  },
  "Yangi nasiyachi": {
    uz_cyr: "Янги насиячи",
    ru: "Новый клиент в долг",
    en: "New credit customer",
  },
  "Tasdiqlash kod": { uz_cyr: "Тасдиқлаш код", ru: "Код подтверждения", en: "Confirmation code" },
  Tasdiqlash: { uz_cyr: "Тасдиқлаш", ru: "Подтвердить", en: "Confirm" },
  Bekor: { uz_cyr: "Бекор", ru: "Отмена", en: "Cancel" },
  "Kassada bo'lishi kerak": {
    uz_cyr: "Кассада бўлиши керак",
    ru: "Должно быть в кассе",
    en: "Expected in register",
  },
  "Kiritilgan jami": { uz_cyr: "Киритилган жами", ru: "Введено всего", en: "Entered total" },
  "Farq (balans)": { uz_cyr: "Фарқ (баланс)", ru: "Разница (баланс)", en: "Difference (balance)" },
  "Naqd pul": { uz_cyr: "Нақд пул", ru: "Наличные", en: "Cash" },
  "Kartalar (Humo / Uzcard / Visa)": {
    uz_cyr: "Карталар (Humo / Uzcard / Visa)",
    ru: "Карты (Humo / Uzcard / Visa)",
    en: "Cards (Humo / Uzcard / Visa)",
  },
  "Valyuta (USD / EUR / RUB)": {
    uz_cyr: "Валюта (USD / EUR / RUB)",
    ru: "Валюта (USD / EUR / RUB)",
    en: "Currency (USD / EUR / RUB)",
  },
  "Kamomat summa (so'm)": {
    uz_cyr: "Камомад сумма (сўм)",
    ru: "Недостача (сум)",
    en: "Shortage (UZS)",
  },
  "Kassada qoldi (ixtiyoriy)": {
    uz_cyr: "Кассада қолди (ихтиёрий)",
    ru: "Осталось в кассе (опц.)",
    en: "Left in register (optional)",
  },
  "Qo'shish": { uz_cyr: "Қўшиш", ru: "Добавить", en: "Add" },
  "Qo'shilgan": { uz_cyr: "Қўшилган", ru: "Добавлено", en: "Added" },
  Izoh: { uz_cyr: "Изоҳ", ru: "Примечание", en: "Note" },
  Kategoriya: { uz_cyr: "Категория", ru: "Категория", en: "Category" },
  "Kategoriya tanlang": {
    uz_cyr: "Категория танланг",
    ru: "Выберите категорию",
    en: "Select category",
  },
  "Yangi kategoriya qo'shish...": {
    uz_cyr: "Янги категория қўшиш...",
    ru: "Добавить категорию...",
    en: "Add new category...",
  },
  "To'lov summasi": { uz_cyr: "Тўлов суммаси", ru: "Сумма платежа", en: "Payment amount" },
  "Naqd pul (so'm)": { uz_cyr: "Нақд пул (сўм)", ru: "Наличные (сум)", en: "Cash (UZS)" },
  "Karta (so'm)": { uz_cyr: "Карта (сўм)", ru: "Карта (сум)", en: "Card (UZS)" },
  "Chiqarilayotgan jami": {
    uz_cyr: "Чиқарилаётган жами",
    ru: "Сумма вывода",
    en: "Withdrawal total",
  },
  "Pul chiqarish": { uz_cyr: "Пул чиқариш", ru: "Выдать деньги", en: "Withdraw" },
  Summa: { uz_cyr: "Сумма", ru: "Сумма", en: "Amount" },
  "Ixtiyoriy izoh...": {
    uz_cyr: "Ихтиёрий изоҳ...",
    ru: "Необязательное примечание...",
    en: "Optional note...",
  },
  Qurilmalar: { uz_cyr: "Қурилмалар", ru: "Устройства", en: "Devices" },
  Ruxsatlar: { uz_cyr: "Рухсатлар", ru: "Разрешения", en: "Permissions" },
  Foydalanuvchi: { uz_cyr: "Фойдаланувчи", ru: "Пользователь", en: "User" },
  Interfeys: { uz_cyr: "Интерфейс", ru: "Интерфейс", en: "Interface" },
  "Chek ko'rinish": { uz_cyr: "Чек кўриниш", ru: "Вид чека", en: "Receipt view" },
  "Umumiy tahrirlash": {
    uz_cyr: "Умумий таҳрирлаш",
    ru: "Общее редактирование",
    en: "General editing",
  },
  Til: { uz_cyr: "Тил", ru: "Язык", en: "Language" },
  Sotuv: { uz_cyr: "Сотув", ru: "Продажа", en: "Sales" },
  Kassa: { uz_cyr: "Касса", ru: "Касса", en: "Register" },
  Tovarlar: { uz_cyr: "Товарлар", ru: "Товары", en: "Products" },
  Umumiy: { uz_cyr: "Умумий", ru: "Общее", en: "General" },
  Sozlamalar: { uz_cyr: "Созламалар", ru: "Настройки", en: "Settings" },
};

const textNodeOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<Element, Record<string, string>>();

function translateInterfacePhrase(value: string, lang: Lang) {
  if (lang === "uz") return value;
  return AUTO_TEXT[value]?.[lang] ?? value;
}

function hasInterfaceTranslation(value: string) {
  return Object.prototype.hasOwnProperty.call(AUTO_TEXT, value.trim());
}

function applyInterfaceTranslations(lang: Lang) {
  if (typeof document === "undefined") return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const parent = node.parentElement;
    const current = node.nodeValue ?? "";
    const storedOriginal = textNodeOriginals.get(node);
    const source =
      storedOriginal && hasInterfaceTranslation(storedOriginal) ? storedOriginal : current;
    const trimmed = source.trim();
    if (
      trimmed &&
      parent &&
      !parent.closest("[data-no-translate]") &&
      !["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName) &&
      hasInterfaceTranslation(trimmed)
    ) {
      if (!storedOriginal || !hasInterfaceTranslation(storedOriginal)) {
        textNodeOriginals.set(node, source);
      }
      const translated = translateInterfacePhrase(trimmed, lang);
      const nextValue = source.replace(trimmed, translated);
      if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
    } else if (storedOriginal !== current) {
      textNodeOriginals.set(node, current);
    }
    node = walker.nextNode() as Text | null;
  }

  document
    .querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label]")
    .forEach((element) => {
      const stored = attrOriginals.get(element) ?? {};
      ["placeholder", "title", "aria-label"].forEach((attr) => {
        const current = element.getAttribute(attr);
        if (!current) return;
        const original = stored[attr] ?? current;
        stored[attr] = original;
        if (!hasInterfaceTranslation(original)) {
          stored[attr] = current;
          return;
        }
        const translated = translateInterfacePhrase(original, lang);
        if (current !== translated) element.setAttribute(attr, translated);
      });
      attrOriginals.set(element, stored);
    });
}

// ─── Context ─────────────────────────────────────────────────────────────────

type AppCtx = {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  t: (key: string) => string;
  hasPermission: (perm: PermissionKey) => boolean;
};

const AppContext = React.createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AppSettings>(() => {
    try {
      const stored = typeof localStorage !== "undefined" && localStorage.getItem("uzko_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Eski format (string[]) saqlangan bo'lsa, o'sha maydon uchun standart qiymatga qaytariladi.
        const migrateEntries = <T,>(value: unknown, fallback: T[]): T[] =>
          Array.isArray(value) && (value.length === 0 || typeof value[0] === "object")
            ? (value as T[])
            : fallback;
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          receiptSettings: {
            ...DEFAULT_SETTINGS.receiptSettings,
            ...(parsed.receiptSettings ?? {}),
          },
          accessNotifications: parsed.accessNotifications ?? DEFAULT_SETTINGS.accessNotifications,
          warehouses: migrateEntries(parsed.warehouses, DEFAULT_SETTINGS.warehouses),
          expenseCategories: migrateEntries(
            parsed.expenseCategories,
            DEFAULT_SETTINGS.expenseCategories,
          ),
          units: migrateEntries(parsed.units, DEFAULT_SETTINGS.units),
          shelfLocations: migrateEntries(parsed.shelfLocations, DEFAULT_SETTINGS.shelfLocations),
        };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Apply theme to <html>
  React.useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [settings.theme]);

  React.useEffect(() => {
    applyInterfaceTranslations(settings.lang);
    const observer = new MutationObserver(() => applyInterfaceTranslations(settings.lang));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });
    return () => observer.disconnect();
  }, [settings.lang]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem("uzko_settings", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const t = (key: string): string => {
    return TRANSLATIONS[settings.lang]?.[key] ?? TRANSLATIONS["uz"][key] ?? key;
  };

  const hasPermission = (perm: PermissionKey): boolean => {
    const device = settings.devices.find((d) => d.id === settings.currentDeviceId);
    if (!device) return false;
    return device.permissions.includes(perm);
  };

  return (
    <AppContext.Provider value={{ settings, updateSettings, t, hasPermission }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
