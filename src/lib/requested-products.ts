// Xaridorlar so'ragan, lekin do'kon va bazada yo'q tovarlar (talab qilingan tovarlar).
// Ma'lumotlar xotirada saqlanadi (loyihaning boshqa mock ma'lumotlari kabi).

export type RequesterType = "oddiy" | "nasiya" | "boshqa" | "";

export const REQUESTER_LABELS: Record<Exclude<RequesterType, "">, string> = {
  oddiy: "Oddiy xaridor",
  nasiya: "Nasiyachi",
  boshqa: "Boshqa",
};

export type RequestedProduct = {
  id: string;
  date: string; // ISO — so'rov kiritilgan vaqt
  addedBy: string;
  name: string;
  requesterType: RequesterType;
  /** Nasiyachi ismi yoki "Boshqa" holatida yozilgan mijoz nomi / izoh */
  requesterName: string;
  /** Faqat nasiyachi tanlanganda */
  customerId?: string;
  quantity: number | null;
  unit: string;
  neededBy: string; // yyyy-mm-dd yoki ""
  image?: string; // data URL
};

export const MOCK_REQUESTED_PRODUCTS: RequestedProduct[] = [];

export type RequestedProductInput = Omit<RequestedProduct, "id" | "date">;

export function addRequestedProduct(input: RequestedProductInput): RequestedProduct {
  const record: RequestedProduct = {
    ...input,
    id: `rp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    name: input.name.trim(),
  };
  MOCK_REQUESTED_PRODUCTS.unshift(record);
  return record;
}

export type RequestedProductGroup = {
  key: string;
  name: string;
  image?: string;
  count: number;
  /** birlik bo'yicha jami miqdor, masalan { dona: 40, kg: 10 } */
  totals: Record<string, number>;
  requesterTypes: Partial<Record<Exclude<RequesterType, "">, number>>;
  /** eng yaqin muddat (yyyy-mm-dd) yoki "" */
  nearestDeadline: string;
  lastDate: string;
  requests: RequestedProduct[];
};

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Bir xil nomli tovarlarni bitta qatorga yig'adi. Nomsiz so'rovlar alohida qator bo'ladi. */
export function groupRequestedProducts(list: RequestedProduct[]): RequestedProductGroup[] {
  const map = new Map<string, RequestedProductGroup>();
  for (const item of list) {
    const normalized = normalizeName(item.name);
    const key = normalized || `__nomsiz__${item.id}`;
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        name: item.name || "Nomsiz talab",
        image: item.image,
        count: 0,
        totals: {},
        requesterTypes: {},
        nearestDeadline: "",
        lastDate: item.date,
        requests: [],
      };
      map.set(key, group);
    }
    group.count += 1;
    group.requests.push(item);
    if (!group.image && item.image) group.image = item.image;
    if (item.date > group.lastDate) group.lastDate = item.date;
    if (item.quantity !== null && item.quantity > 0) {
      const unit = item.unit || "dona";
      group.totals[unit] = (group.totals[unit] ?? 0) + item.quantity;
    }
    if (item.requesterType) {
      group.requesterTypes[item.requesterType] =
        (group.requesterTypes[item.requesterType] ?? 0) + 1;
    }
    if (item.neededBy && (!group.nearestDeadline || item.neededBy < group.nearestDeadline)) {
      group.nearestDeadline = item.neededBy;
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.count - a.count || (a.lastDate < b.lastDate ? 1 : -1),
  );
}
