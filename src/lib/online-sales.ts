import type { Product } from "@/lib/mock-data";

export type OnlineOrderStatus = "pending" | "accepted" | "canceled" | "completed";

export type OnlineOrderItem = {
  id: string;
  product: Product;
  quantity: number;
};

export type OnlineOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  status: OnlineOrderStatus;
  address: string;
  mapUrl: string;
  mapEmbedUrl: string;
  comment: string;
  items: OnlineOrderItem[];
};

export type OnlineOrderPeriod = "all" | "today" | "week" | "month" | "year" | "custom";

export const MOCK_ONLINE_ORDERS: OnlineOrder[] = [
  {
    id: "TG-1048",
    customerName: "Dilshod Karimov",
    customerPhone: "+998 90 445 22 10",
    createdAt: new Date("2026-05-28T18:42:00+05:00").toISOString(),
    status: "pending",
    address: "Samarqand, Rudakiy ko'chasi 121, 2-podyezd",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=39.6542,66.9597",
    mapEmbedUrl:
      "https://www.openstreetmap.org/export/embed.html?bbox=66.9547%2C39.6492%2C66.9647%2C39.6592&layer=mapnik&marker=39.6542%2C66.9597",
    comment: "Sementni podval yoniga tushirib bering. Yetkazib berishdan oldin qo'ng'iroq qiling.",
    items: [
      {
        id: "tg-1048-1",
        product: product("p1", "Sement M400 50kg", 65000, "QM001", "qop", "Quruq aralashmalar"),
        quantity: 6,
      },
      {
        id: "tg-1048-2",
        product: product("p9", "Kraska emulsiya 10kg", 98000, "QM009", "dona", "Bo'yoq ombori"),
        quantity: 2,
      },
    ],
  },
  {
    id: "TG-1049",
    customerName: "Aziza Qurbonova",
    customerPhone: "+998 93 710 44 33",
    createdAt: new Date("2026-05-28T18:56:00+05:00").toISOString(),
    status: "pending",
    address: "Samarqand, Universitet xiyoboni 18, 4-qavat",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=39.6478,66.9654",
    mapEmbedUrl:
      "https://www.openstreetmap.org/export/embed.html?bbox=66.9604%2C39.6428%2C66.9704%2C39.6528&layer=mapnik&marker=39.6478%2C66.9654",
    comment: "Optom narx bo'lsa telefon qilib ayting.",
    items: [
      {
        id: "tg-1049-1",
        product: product("p13", "Kabel VVG 2x2.5", 35000, "EL013", "metr", "Elektrika"),
        quantity: 30,
      },
      {
        id: "tg-1049-2",
        product: product("p14", "Rozetka ichki", 48000, "EL014", "dona", "Elektrika"),
        quantity: 8,
      },
    ],
  },
  {
    id: "TG-1050",
    customerName: "Olim Yusupov",
    customerPhone: "+998 90 123 45 67",
    createdAt: new Date("2026-05-28T19:08:00+05:00").toISOString(),
    status: "pending",
    address: "Samarqand, Buyuk Ipak Yo'li 64",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=39.6605,66.9475",
    mapEmbedUrl:
      "https://www.openstreetmap.org/export/embed.html?bbox=66.9425%2C39.6555%2C66.9525%2C39.6655&layer=mapnik&marker=39.6605%2C66.9475",
    comment: "Prorab nomiga nasiya qilib yozish kerak bo'lishi mumkin.",
    items: [
      {
        id: "tg-1050-1",
        product: product(
          "p3",
          "Shpaklovka start 25kg",
          58000,
          "QM003",
          "qop",
          "Quruq aralashmalar",
        ),
        quantity: 10,
      },
    ],
  },
  {
    id: "TG-1044",
    customerName: "Madina Sobirova",
    customerPhone: "+998 93 555 77 00",
    createdAt: new Date("2026-05-27T16:20:00+05:00").toISOString(),
    status: "completed",
    address: "Samarqand, Beruniy 44",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=39.6511,66.9711",
    mapEmbedUrl:
      "https://www.openstreetmap.org/export/embed.html?bbox=66.9661%2C39.6461%2C66.9761%2C39.6561&layer=mapnik&marker=39.6511%2C66.9711",
    comment: "Kechqurun yetkazib bering.",
    items: [
      {
        id: "tg-1044-1",
        product: product(
          "p4",
          "Shpaklovka finish 25kg",
          64000,
          "QM004",
          "qop",
          "Quruq aralashmalar",
        ),
        quantity: 5,
      },
      {
        id: "tg-1044-2",
        product: product("p10", "Gruntovka 10L", 85000, "QM010", "dona", "Bo'yoq ombori"),
        quantity: 1,
      },
    ],
  },
  {
    id: "TG-1045",
    customerName: "Jasur Rahimov",
    customerPhone: "+998 91 224 12 12",
    createdAt: new Date("2026-05-27T17:05:00+05:00").toISOString(),
    status: "accepted",
    address: "Samarqand, Dahbed 9",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=39.6681,66.9355",
    mapEmbedUrl:
      "https://www.openstreetmap.org/export/embed.html?bbox=66.9305%2C39.6631%2C66.9405%2C39.6731&layer=mapnik&marker=39.6681%2C66.9355",
    comment: "Manzilga olib kelganda chek bering.",
    items: [
      {
        id: "tg-1045-1",
        product: product("p2", "Sement M500 50kg", 72000, "QM002", "qop", "Quruq aralashmalar"),
        quantity: 4,
      },
    ],
  },
  {
    id: "TG-1046",
    customerName: "Sevara Aliyeva",
    customerPhone: "+998 90 123 44 00",
    createdAt: new Date("2026-05-26T11:40:00+05:00").toISOString(),
    status: "canceled",
    address: "Samarqand, Motrid 31",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=39.6733,66.9622",
    mapEmbedUrl:
      "https://www.openstreetmap.org/export/embed.html?bbox=66.9572%2C39.6683%2C66.9672%2C39.6783&layer=mapnik&marker=39.6733%2C66.9622",
    comment: "Mijoz keyinroq olishini aytdi.",
    items: [
      {
        id: "tg-1046-1",
        product: product("p7", "PVA kley 5kg", 72000, "QM007", "dona", "Bo'yoq ombori"),
        quantity: 3,
      },
    ],
  },
];

export function onlineOrderTotal(order: OnlineOrder) {
  return order.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

export function setOnlineOrderStatus(orderId: string, status: OnlineOrderStatus) {
  const order = MOCK_ONLINE_ORDERS.find((item) => item.id === orderId);
  if (order) order.status = status;
  return order;
}

export function filterOnlineOrders(input: {
  orders?: OnlineOrder[];
  period: OnlineOrderPeriod;
  from: string;
  to: string;
  query?: string;
  name?: string;
  orderId?: string;
  phone?: string;
  anchor?: Date;
}) {
  const orders = input.orders ?? MOCK_ONLINE_ORDERS;
  const range = periodRange(
    input.period,
    input.from,
    input.to,
    input.anchor ?? latestOrderDate(orders),
  );
  const query = normalize(input.query ?? "");
  const name = normalize(input.name ?? "");
  const orderId = normalize(input.orderId ?? "");
  const phone = normalize(input.phone ?? "");

  return orders.filter((order) => {
    const date = new Date(order.createdAt);
    if (date < range.start || date > range.end) return false;
    if (
      query &&
      ![order.customerName, order.customerPhone, order.id].some((value) =>
        normalize(value).includes(query),
      )
    ) {
      return false;
    }
    if (name && !normalize(order.customerName).includes(name)) return false;
    if (orderId && !normalize(order.id).includes(orderId)) return false;
    if (phone && !normalize(order.customerPhone).includes(phone)) return false;
    return true;
  });
}

export function onlineOrdersSummary(orders: OnlineOrder[]) {
  const total = orders.reduce((sum, order) => sum + onlineOrderTotal(order), 0);
  const accepted = orders.filter(
    (order) => order.status === "accepted" || order.status === "completed",
  );
  const confirmed = orders.filter((order) => order.status === "completed");
  const canceled = orders.filter((order) => order.status === "canceled");
  return {
    count: orders.length,
    total,
    acceptedCount: accepted.length,
    acceptedTotal: accepted.reduce((sum, order) => sum + onlineOrderTotal(order), 0),
    confirmedCount: confirmed.length,
    confirmedTotal: confirmed.reduce((sum, order) => sum + onlineOrderTotal(order), 0),
    canceledCount: canceled.length,
  };
}

export function latestOrderDate(orders = MOCK_ONLINE_ORDERS) {
  if (orders.length === 0) return new Date();
  return orders.slice(1).reduce((latest, order) => {
    const date = new Date(order.createdAt);
    return date > latest ? date : latest;
  }, new Date(orders[0].createdAt));
}

function product(
  id: string,
  name: string,
  price: number,
  customCode: string,
  unit: string,
  warehouse: string,
): Product {
  return {
    id,
    name,
    price,
    costPrice: Math.round(price * 0.78),
    costCurrency: "UZS",
    barcode: "",
    customCode,
    unit,
    warehouse,
    vitrinaQty: 0,
    omborQty: 0,
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function periodRange(period: OnlineOrderPeriod, from: string, to: string, anchor: Date) {
  if (period === "today") return { start: startOfDay(anchor), end: endOfDay(anchor) };
  if (period === "week") {
    const start = startOfDay(anchor);
    start.setDate(start.getDate() - 6);
    return { start, end: endOfDay(anchor) };
  }
  if (period === "month")
    return { start: new Date(anchor.getFullYear(), anchor.getMonth(), 1), end: endOfDay(anchor) };
  if (period === "year")
    return {
      start: new Date(anchor.getFullYear(), 0, 1),
      end: new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  if (period === "custom") {
    return {
      start: from ? startOfDay(new Date(`${from}T12:00:00`)) : new Date("1970-01-01"),
      end: to ? endOfDay(new Date(`${to}T12:00:00`)) : new Date("2999-12-31"),
    };
  }
  return { start: new Date("1970-01-01"), end: new Date("2999-12-31") };
}
