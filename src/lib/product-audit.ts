import {
  MOCK_EDIT_HISTORY,
  MOCK_PRODUCT_HISTORY,
  MOCK_PRODUCT_HISTORY_EDIT_LOG,
  MOCK_RECEIPT_EDIT_HISTORY,
  MOCK_RECEIPTS,
  MOCK_RETURN_RECEIPTS,
  MOCK_STOCK_COUNTS,
} from "./mock-data";

/**
 * Bitta tovar bo'yicha "nega qoldiq farq qildi" tekshiruvi uchun ma'lumot.
 * Ikki asosiy sabab: xato sotuv va xato prixod. Bu yerda o'sha ikkalasi
 * (va qaytarishlar) hujjatlari + ulardagi tahrir/o'chirishlar jamlanadi.
 */

export type ProductSaleRow = {
  receiptId: string;
  date: string;
  cashier: string;
  customerName: string;
  kind: "sale" | "return";
  qty: number;
  unit: string;
  price: number;
  amount: number;
  edited: boolean;
};

export type ReceiptChangeRow = {
  id: string;
  date: string;
  editedBy: string;
  receiptId: string;
  action: "edit" | "delete";
  oldTotal: number;
  newTotal: number;
  changes: { label: string; oldValue: string; newValue: string }[];
};

export type ProductPrixodRow = {
  id: string;
  invoiceNumber: string;
  date: string;
  addedBy: string;
  qty: number;
  unit: string;
  costPrice: number;
  amount: number;
  warehouse: string;
  agentName: string;
};

export type PrixodChangeRow = {
  id: string;
  date: string;
  editedBy: string;
  invoiceNumber: string;
  action: "edit" | "delete";
  source: "prixod" | "tovar";
  summary: string;
  changes: { label: string; oldValue: string; newValue: string }[];
};

/** Davr tanlovi: oxirgi sanoqdan (default), butun tarix yoki foydalanuvchi kiritgan oraliq. */
export type AuditRange =
  { kind: "lastCount" } | { kind: "all" } | { kind: "custom"; from: string; to: string };

export type ProductAudit = {
  rangeKind: "lastCount" | "window90" | "all" | "custom";
  rangeLabel: string;
  /** Amaldagi oraliq (ISO). from null — cheklovsiz. */
  fromIso: string | null;
  toIso: string;
  /** Oxirgi sanoq topildimi (lastCount rejimi uchun). */
  lastCountFound: boolean;
  sales: ProductSaleRow[];
  receiptChanges: ReceiptChangeRow[];
  prixods: ProductPrixodRow[];
  prixodChanges: PrixodChangeRow[];
  soldQty: number;
  returnedQty: number;
  prixodQty: number;
};

const DAY = 86_400_000;

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Shu tovar oxirgi marta (berilgan sanadan oldin) sanalgan sanoq kuni. */
function lastCountDateForProduct(productId: string, before: string): string | null {
  const beforeMs = new Date(before).getTime();
  let latest: string | null = null;
  for (const record of MOCK_STOCK_COUNTS) {
    const ms = new Date(record.date).getTime();
    if (ms >= beforeMs) continue;
    const counted = record.lines.some(
      (line) => line.productId === productId && line.countedQty !== null,
    );
    if (!counted) continue;
    if (!latest || ms > new Date(latest).getTime()) latest = record.date;
  }
  return latest;
}

export function getProductAudit(opts: {
  productId: string;
  productName: string;
  /** Odatda sanoq boshlangan vaqt yoki hisobot sanasi. */
  before: string;
  range?: AuditRange;
}): ProductAudit {
  const { productId, productName, before } = opts;
  const range: AuditRange = opts.range ?? { kind: "lastCount" };

  let fromMs = -Infinity;
  let toMs = new Date(before).getTime();
  let rangeKind: ProductAudit["rangeKind"] = "lastCount";
  let rangeLabel = "";
  let lastCountFound = false;

  if (range.kind === "all") {
    fromMs = -Infinity;
    toMs = Date.now();
    rangeKind = "all";
    rangeLabel = "Butun tarix";
  } else if (range.kind === "custom") {
    fromMs = range.from ? new Date(`${range.from}T00:00:00`).getTime() : -Infinity;
    toMs = range.to ? new Date(`${range.to}T23:59:59`).getTime() : Date.now();
    rangeKind = "custom";
    rangeLabel = `${range.from ? fmtDay(range.from) : "boshidan"} — ${
      range.to ? fmtDay(range.to) : "bugungacha"
    }`;
  } else {
    const last = lastCountDateForProduct(productId, before);
    if (last) {
      fromMs = new Date(last).getTime();
      rangeKind = "lastCount";
      lastCountFound = true;
      rangeLabel = `Oxirgi sanoqdan beri · ${fmtDay(last)}`;
    } else {
      fromMs = new Date(before).getTime() - 90 * DAY;
      rangeKind = "window90";
      rangeLabel = "Oxirgi 90 kun · oldingi sanoq yo'q";
    }
    toMs = new Date(before).getTime();
  }

  const fromIso = fromMs === -Infinity ? null : new Date(fromMs).toISOString();
  const toIso = new Date(toMs).toISOString();
  const inWindow = (iso: string) => {
    const ms = new Date(iso).getTime();
    return ms >= fromMs && ms <= toMs;
  };

  const matches = (item: { productId?: string; name?: string }) =>
    (!!item.productId && item.productId === productId) || item.name === productName;

  const relatedReceiptIds = new Set<string>();

  // ── Sotuv ──────────────────────────────────────────────────────────────
  const sales: ProductSaleRow[] = [];

  for (const receipt of MOCK_RECEIPTS) {
    const line = receipt.items.find(matches);
    if (line) relatedReceiptIds.add(receipt.id);
    if (!line || !inWindow(receipt.date)) continue;
    sales.push({
      receiptId: receipt.id,
      date: receipt.date,
      cashier: receipt.cashier,
      customerName:
        receipt.customerName ||
        (receipt.customerType === "nasiya" ? "Nasiya mijoz" : "Oddiy mijoz"),
      kind: "sale",
      qty: line.qty,
      unit: line.unit,
      price: line.price,
      amount: line.qty * line.price,
      edited: Boolean(receipt.editedAt),
    });
  }

  for (const receipt of MOCK_RETURN_RECEIPTS) {
    const line = receipt.items.find(matches);
    if (line) relatedReceiptIds.add(receipt.id);
    if (!line || !inWindow(receipt.date)) continue;
    sales.push({
      receiptId: receipt.id,
      date: receipt.date,
      cashier: receipt.cashier,
      customerName: receipt.customerName || "—",
      kind: "return",
      qty: line.qty,
      unit: line.unit,
      price: line.price,
      amount: line.qty * line.price,
      edited: Boolean(receipt.editedAt),
    });
  }

  sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const receiptChanges: ReceiptChangeRow[] = MOCK_RECEIPT_EDIT_HISTORY.filter(
    (entry) => relatedReceiptIds.has(entry.receiptId) && inWindow(entry.date),
  )
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      editedBy: entry.editedBy,
      receiptId: entry.receiptId,
      action: entry.action,
      oldTotal: entry.oldTotal,
      newTotal: entry.newTotal,
      changes: (entry.changes ?? []).map((c) => ({
        label: c.label,
        oldValue: c.oldValue,
        newValue: c.newValue,
      })),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Prixod ─────────────────────────────────────────────────────────────
  const prixods: ProductPrixodRow[] = MOCK_PRODUCT_HISTORY.filter(
    (entry) => entry.productName === productName && inWindow(entry.date),
  )
    .map((entry) => ({
      id: entry.id,
      invoiceNumber: entry.invoiceNumber,
      date: entry.date,
      addedBy: entry.addedBy,
      qty: entry.qty,
      unit: entry.unit,
      costPrice: entry.costPrice,
      amount: entry.qty * entry.costPrice,
      warehouse: entry.warehouse,
      agentName: entry.agentName ?? "—",
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const prixodChanges: PrixodChangeRow[] = [];

  for (const entry of MOCK_PRODUCT_HISTORY_EDIT_LOG) {
    if (entry.productName !== productName || !inWindow(entry.date)) continue;
    prixodChanges.push({
      id: entry.id,
      date: entry.date,
      editedBy: entry.editedBy,
      invoiceNumber: entry.invoiceNumber ?? "—",
      action: entry.action,
      source: "prixod",
      summary: `Summa: ${Math.round(entry.oldTotal).toLocaleString()} → ${Math.round(
        entry.newTotal,
      ).toLocaleString()}`,
      changes: (entry.changes ?? []).map((c) => ({
        label: c.label,
        oldValue: c.oldValue,
        newValue: c.newValue,
      })),
    });
  }

  for (const entry of MOCK_EDIT_HISTORY) {
    if (entry.productName !== productName) continue;
    if (entry.action !== "edit" && entry.action !== "delete") continue;
    if (!inWindow(entry.date)) continue;
    prixodChanges.push({
      id: entry.id,
      date: entry.date,
      editedBy: entry.editedBy,
      invoiceNumber: "—",
      action: entry.action,
      source: "tovar",
      summary: `Qoldiq: ${entry.oldQty} → ${entry.newQty} ${entry.unit}`,
      changes: (entry.changes ?? []).map((c) => ({
        label: c.label,
        oldValue: String(c.oldValue),
        newValue: String(c.newValue),
      })),
    });
  }

  prixodChanges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    rangeKind,
    rangeLabel,
    fromIso,
    toIso,
    lastCountFound,
    sales,
    receiptChanges,
    prixods,
    prixodChanges,
    soldQty: sales.filter((s) => s.kind === "sale").reduce((sum, s) => sum + s.qty, 0),
    returnedQty: sales.filter((s) => s.kind === "return").reduce((sum, s) => sum + s.qty, 0),
    prixodQty: prixods.reduce((sum, p) => sum + p.qty, 0),
  };
}
