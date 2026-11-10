import * as React from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  ExternalLink,
  MapPin,
  MessageSquareText,
  PackageCheck,
  ReceiptText,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";
import { FinalizeSaleDialog } from "./FinalizeSaleDialog";
import type { FinalizedSalePayload } from "./types";
import { addSaleReceipt, dispatchRegularSaleReceipt } from "@/lib/data-actions";
import { formatSom, type Product } from "@/lib/mock-data";
import {
  MOCK_ONLINE_ORDERS,
  filterOnlineOrders,
  onlineOrderTotal,
  setOnlineOrderStatus,
  type OnlineOrderPeriod,
} from "@/lib/online-sales";
import { toast } from "sonner";

type OnlineOrderStatus = "pending" | "accepted" | "canceled" | "completed";

type OnlineOrderItem = {
  id: string;
  product: Product;
  quantity: number;
};

type OnlineOrder = {
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashier: string;
};

const ONLINE_ORDERS: OnlineOrder[] = [
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
        product: {
          id: "p1",
          name: "Sement M400 50kg",
          price: 65000,
          costPrice: 54000,
          costCurrency: "UZS",
          barcode: "4781000000001",
          customCode: "QM001",
          unit: "qop",
          warehouse: "Quruq aralashmalar",
          vitrinaQty: 80,
          omborQty: 420,
        },
        quantity: 6,
      },
      {
        id: "tg-1048-2",
        product: {
          id: "p9",
          name: "Kraska emulsiya 10kg",
          price: 98000,
          costPrice: 76000,
          costCurrency: "UZS",
          barcode: "4781000000009",
          customCode: "QM009",
          unit: "dona",
          warehouse: "Bo'yoq ombori",
          vitrinaQty: 22,
          omborQty: 85,
        },
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
        product: {
          id: "p13",
          name: "Kabel VVG 2x2.5",
          price: 35000,
          costPrice: 28000,
          costCurrency: "UZS",
          barcode: "4781000000013",
          customCode: "EL013",
          unit: "metr",
          warehouse: "Elektrika",
          vitrinaQty: 120,
          omborQty: 400,
        },
        quantity: 30,
      },
      {
        id: "tg-1049-2",
        product: {
          id: "p14",
          name: "Rozetka ichki",
          price: 48000,
          costPrice: 36000,
          costCurrency: "UZS",
          barcode: "4781000000014",
          customCode: "EL014",
          unit: "dona",
          warehouse: "Elektrika",
          vitrinaQty: 55,
          omborQty: 180,
        },
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
        product: {
          id: "p3",
          name: "Shpaklovka start 25kg",
          price: 58000,
          costPrice: 45000,
          costCurrency: "UZS",
          barcode: "4781000000003",
          customCode: "QM003",
          unit: "qop",
          warehouse: "Quruq aralashmalar",
          vitrinaQty: 45,
          omborQty: 220,
        },
        quantity: 10,
      },
    ],
  },
];

export function OnlineSalesDialog({ open, onOpenChange, cashier }: Props) {
  const [orders, setOrders] = React.useState<OnlineOrder[]>(MOCK_ONLINE_ORDERS);
  const [tab, setTab] = React.useState<"current" | "history">("current");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [finalizeOrderId, setFinalizeOrderId] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState<PeriodFilterValue>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [historyQuery, setHistoryQuery] = React.useState("");

  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const finalizeOrder = orders.find((order) => order.id === finalizeOrderId) ?? null;
  const visibleOrders = orders.filter(
    (order) => order.status !== "completed" && order.status !== "canceled",
  );
  const historyOrders = React.useMemo(
    () =>
      filterOnlineOrders({
        orders,
        period: period as OnlineOrderPeriod,
        from,
        to,
        query: historyQuery,
      }),
    [from, historyQuery, orders, period, to],
  );

  React.useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setFinalizeOrderId(null);
    }
  }, [open]);

  const updateStatus = (orderId: string, status: OnlineOrderStatus) => {
    setOnlineOrderStatus(orderId, status);
    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status } : order)),
    );
  };

  const openOrder = (order: OnlineOrder) => {
    if (order.status === "canceled") return;
    setSelectedId(order.id);
  };

  const acceptOrder = (orderId: string) => {
    updateStatus(orderId, "accepted");
    toast.success("Zakaz qabul qilindi");
  };

  const cancelOrder = (orderId: string) => {
    updateStatus(orderId, "canceled");
    if (selectedId === orderId) setSelectedId(null);
    toast.success("Zakaz bekor qilindi");
  };

  const completeOrder = (order: OnlineOrder, payload: FinalizedSalePayload) => {
    const receipt = addSaleReceipt({
      cashier,
      customerType: payload.customerType,
      customerId: payload.customerId,
      customerName: payload.customerName ?? order.customerName,
      customerPhone: payload.customerPhone ?? order.customerPhone,
      subtotal: payload.subtotal,
      discount: payload.discountAmount,
      total: payload.total,
      paidAmount: payload.paidAmount,
      debtAmount: payload.debtAmount,
      paymentBreakdown: payload.paymentBreakdown,
      items: order.items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        qty: item.quantity,
        unit: item.product.unit,
        source: "catalog",
        note: `Telegram zakaz: ${order.id}`,
      })),
    });

    if (payload.customerType === "oddiy") {
      const [firstName, ...rest] = order.customerName.split(" ");
      dispatchRegularSaleReceipt(receipt, {
        id: `tg-${order.id}`,
        firstName,
        lastName: rest.join(" "),
        phone: order.customerPhone,
      });
    }

    updateStatus(order.id, "completed");
    setFinalizeOrderId(null);
    setSelectedId(null);
    toast.success("Online zakaz savdoga o'tkazildi", {
      description: `${receipt.id} · ${formatSom(payload.total)}`,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[92dvh] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-primary" />
              Online savdo
            </DialogTitle>
          </DialogHeader>

          <div className="flex h-[calc(92dvh-57px)] min-h-0 flex-col overflow-hidden">
            <div className="border-b bg-muted/20 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Telegram botdan kelgan zakazlar</div>
                  <div className="text-xs text-muted-foreground">
                    Zakazni ko'rish uchun qator ustiga ikki marta bosing yoki ko'z iconidan
                    foydalaning.
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-background p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={tab === "current" ? "default" : "ghost"}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setTab("current")}
                  >
                    Joriy zakazlar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tab === "history" ? "default" : "ghost"}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setTab("history")}
                  >
                    Online savdo tarixi
                  </Button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {tab === "current" ? (
                <div className="space-y-2">
                  {visibleOrders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onOpen={() => openOrder(order)}
                      onAccept={() => acceptOrder(order.id)}
                      onCancel={() => cancelOrder(order.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <OnlineHistoryFilters
                    period={period}
                    onPeriod={setPeriod}
                    from={from}
                    to={to}
                    onFrom={setFrom}
                    onTo={setTo}
                    query={historyQuery}
                    onQuery={setHistoryQuery}
                  />
                  <div className="space-y-2">
                    {historyOrders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onOpen={() => openOrder(order)}
                        onAccept={() => acceptOrder(order.id)}
                        onCancel={() => cancelOrder(order.id)}
                      />
                    ))}
                    {historyOrders.length === 0 && (
                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                        Online zakaz topilmadi
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <OrderDetailDialog
        order={selected}
        onClose={() => setSelectedId(null)}
        onAccept={acceptOrder}
        onCancel={cancelOrder}
        onFinalize={(orderId) => setFinalizeOrderId(orderId)}
      />

      <FinalizeSaleDialog
        open={Boolean(finalizeOrder)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setFinalizeOrderId(null);
        }}
        total={finalizeOrder ? onlineOrderTotal(finalizeOrder) : 0}
        onConfirm={(details) => {
          if (!finalizeOrder) return;
          const total = onlineOrderTotal(finalizeOrder);
          completeOrder(finalizeOrder, {
            ...details,
            subtotal: total,
            discountAmount: 0,
            total,
          });
        }}
      />
    </>
  );
}

function OrderRow({
  order,
  onOpen,
  onAccept,
  onCancel,
}: {
  order: OnlineOrder;
  onOpen: () => void;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const disabled = order.status === "canceled" || order.status === "completed";

  return (
    <div
      role="button"
      tabIndex={0}
      onDoubleClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
      className="flex min-h-14 items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm transition-colors hover:bg-muted/40"
    >
      <div className="w-24 shrink-0 font-mono text-sm font-bold text-primary">{order.id}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{order.customerName}</div>
        <div className="truncate text-xs text-muted-foreground">{order.customerPhone}</div>
      </div>
      <div className="w-32 shrink-0 text-right text-sm font-bold tabular-nums">
        {formatSom(onlineOrderTotal(order))}
      </div>
      <div className="w-40 shrink-0 text-xs text-muted-foreground">
        <Clock3 className="mr-1 inline h-3.5 w-3.5" />
        {new Date(order.createdAt).toLocaleString("uz-UZ", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
      <StatusBadge status={order.status} />
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 text-emerald-600"
          disabled={order.status !== "pending"}
          onClick={(event) => {
            event.stopPropagation();
            onAccept();
          }}
          title="Qabul qilish"
          aria-label="Qabul qilish"
        >
          <CheckCircle2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          disabled={order.status === "canceled"}
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          title="Zakazni ko'zdan kechirish"
          aria-label="Zakazni ko'zdan kechirish"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 text-destructive hover:text-destructive"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onCancel();
          }}
          title="Bekor qilish"
          aria-label="Bekor qilish"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function OrderDetailDialog({
  order,
  onClose,
  onAccept,
  onCancel,
  onFinalize,
}: {
  order: OnlineOrder | null;
  onClose: () => void;
  onAccept: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onFinalize: (orderId: string) => void;
}) {
  if (!order) return null;
  const total = onlineOrderTotal(order);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[92dvh] max-w-7xl overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              {order.id} zakazi
            </span>
            <StatusBadge status={order.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="grid h-[calc(92dvh-57px)] min-h-0 grid-cols-[minmax(0,1fr)_380px] overflow-hidden max-lg:grid-cols-1">
          <div className="flex min-h-0 flex-col border-r">
            <div className="flex h-12 items-center justify-between border-b bg-card px-4">
              <div className="text-sm font-semibold">Zakaz qilingan tovarlar</div>
              <div className="text-sm font-bold tabular-nums text-primary">{formatSom(total)}</div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 text-left font-semibold">Nomi</th>
                    <th className="px-4 py-2 text-right font-semibold">Narxi</th>
                    <th className="px-4 py-2 text-center font-semibold">Miqdor</th>
                    <th className="px-4 py-2 text-left font-semibold">Birlik</th>
                    <th className="px-4 py-2 text-right font-semibold">Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-2">
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.product.customCode}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatSom(item.product.price)}
                      </td>
                      <td className="px-4 py-2 text-center tabular-nums">{item.quantity}</td>
                      <td className="px-4 py-2 text-muted-foreground">{item.product.unit}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">
                        {formatSom(item.product.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="min-h-0 overflow-auto bg-muted/20 p-4">
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-primary" />
                  Jo'natish manzili
                </div>
                <div className="text-sm">{order.address}</div>
                <a
                  href={order.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  Kartada ochish
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <div className="mt-3 overflow-hidden rounded-md border bg-muted">
                  <iframe
                    title={`${order.id} manzili`}
                    src={order.mapEmbedUrl}
                    className="h-44 w-full border-0"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <UserRound className="h-4 w-4 text-primary" />
                  Zakaz qiluvchi
                </div>
                <InfoRow label="Ism" value={order.customerName} />
                <InfoRow label="Telefon" value={order.customerPhone} />
                <InfoRow
                  label="Zakaz vaqti"
                  value={new Date(order.createdAt).toLocaleString("uz-UZ")}
                />
              </div>

              <div className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  Comment
                </div>
                <div className="text-sm text-muted-foreground">
                  {order.comment || "Izoh yozilmagan"}
                </div>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Jami zakaz</span>
                  <span className="text-lg font-bold tabular-nums text-primary">
                    {formatSom(total)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {order.status === "pending" ? (
                    <Button className="gap-2" onClick={() => onAccept(order.id)}>
                      <CheckCircle2 className="h-4 w-4" />
                      Qabul qilish
                    </Button>
                  ) : (
                    <Button
                      className="gap-2"
                      disabled={order.status !== "accepted"}
                      onClick={() => onFinalize(order.id)}
                    >
                      <ReceiptText className="h-4 w-4" />
                      Savdoni yakunlash
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive hover:text-destructive"
                    disabled={order.status === "canceled" || order.status === "completed"}
                    onClick={() => onCancel(order.id)}
                  >
                    <XCircle className="h-4 w-4" />
                    Bekor qilish
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function OnlineHistoryFilters({
  period,
  onPeriod,
  from,
  to,
  onFrom,
  onTo,
  query,
  onQuery,
}: {
  period: PeriodFilterValue;
  onPeriod: (value: PeriodFilterValue) => void;
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  query: string;
  onQuery: (value: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <PeriodFilter
          value={period}
          onValueChange={onPeriod}
          from={from}
          to={to}
          onFromChange={onFrom}
          onToChange={onTo}
        />
      </div>
      <Input
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Zakaz qiluvchi ismi, telefon raqam yoki zakaz raqami"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: OnlineOrderStatus }) {
  if (status === "accepted") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Qabul qilindi</Badge>;
  }
  if (status === "canceled") {
    return <Badge variant="destructive">Bekor qilindi</Badge>;
  }
  if (status === "completed") {
    return <Badge className="bg-primary hover:bg-primary">Yakunlandi</Badge>;
  }
  return <Badge variant="secondary">Yangi</Badge>;
}
