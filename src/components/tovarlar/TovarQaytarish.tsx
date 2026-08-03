import * as React from "react";
import {
  RotateCcw,
  Search,
  CheckCircle2,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Percent,
  UserRound,
  ArrowDownLeft,
  PackageOpen,
  Box,
  Zap,
  Truck,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CustomerSearch } from "@/components/shared/CustomerSearch";
import {
  exportAgentHistoryToExcel,
  printAgentNakladnoy,
  printAgentReceipt80mm,
} from "@/components/mijozlar/MijozlarPage";
import {
  MOCK_PRODUCTS,
  MOCK_PRODUCT_HISTORY,
  MOCK_CREDIT_CUSTOMERS,
  MOCK_RECEIPTS,
  MOCK_SUPPLIER_REPORTS,
  MOCK_RETURN_RECEIPTS,
  MOCK_WITHDRAWALS,
  formatSom,
  type CreditCustomer,
  type Product,
  type Receipt,
  type ReturnReceipt,
  type SupplierReport,
} from "@/lib/mock-data";
import {
  applyDebtReturn,
  dispatchReceiptMessage,
  fullCustomerName,
  recordSupplierReturn,
} from "@/lib/data-actions";
import { useApp } from "@/lib/app-context";
import { formatNumberInput, parseNumberInput } from "@/lib/utils";
import type { PriceMode } from "@/components/sotuv/types";
import { toast } from "sonner";

const WEIGHT_UNITS = new Set(["kg"]);

type ReturnCartItem = {
  id: string;
  product: Product;
  qty: number;
  price: number;
  priceMode: PriceMode;
  note?: string;
};

type CustomerType = "oddiy" | "nasiya" | "agent";

export const PENDING_RETURN_EXCHANGE_KEY = "uzko_pending_return_exchange";

export type PendingReturnExchange = {
  id: string;
  createdAt: string;
  cashier: string;
  customerType: CustomerType;
  customerId?: string;
  customerName: string;
  agentId?: string;
  agentName?: string;
  agentPhone?: string;
  subtotal: number;
  total: number;
  reason: string;
  comment?: string;
  vehicleName?: string;
  vehiclePlate?: string;
  driverName?: string;
  driverPhone?: string;
  receiptNumber?: string;
  noReceiptDiscount: number;
  penaltyPercent: number;
  items: {
    productId: string;
    name: string;
    price: number;
    qty: number;
    unit: string;
  }[];
};

type Props = {
  exchangeShortcut?: boolean;
  onExchangeCreated?: (pendingReturn: PendingReturnExchange) => void;
};

export function TovarQaytarish({ exchangeShortcut = false, onExchangeCreated }: Props = {}) {
  const { settings, updateSettings } = useApp();
  const [query, setQuery] = React.useState("");
  const [cart, setCart] = React.useState<ReturnCartItem[]>([]);
  const [receiptNumber, setReceiptNumber] = React.useState("");
  const [applyNoReceiptPenalty, setApplyNoReceiptPenalty] = React.useState(false);
  const [noReceiptPenaltyPercent, setNoReceiptPenaltyPercent] = React.useState(15);
  const [noReceiptPenaltyPreset, setNoReceiptPenaltyPreset] = React.useState<
    "5" | "10" | "15" | "custom"
  >("15");
  const [reason, setReason] = React.useState("Ortib qolgan tovar");

  const [productModal, setProductModal] = React.useState<Product | null>(null);
  const [modalQty, setModalQty] = React.useState(1);
  const [modalMode, setModalMode] = React.useState<"dona" | "karobka">("dona");
  const [modalPriceMode, setModalPriceMode] = React.useState<PriceMode>("retail");
  const [modalPrice, setModalPrice] = React.useState("");
  const [modalNote, setModalNote] = React.useState("");

  const [finishOpen, setFinishOpen] = React.useState(false);
  const [customerType, setCustomerType] = React.useState<CustomerType>("oddiy");
  const [customerSearch, setCustomerSearch] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [agentId, setAgentId] = React.useState("");
  const [manualTotal, setManualTotal] = React.useState<string | null>(null);
  const [comment, setComment] = React.useState("");
  const [routeEnabled, setRouteEnabled] = React.useState(false);
  const [vehicleName, setVehicleName] = React.useState("");
  const [vehiclePlate, setVehiclePlate] = React.useState("");
  const [driverName, setDriverName] = React.useState("");
  const [driverPhone, setDriverPhone] = React.useState("");
  const [lastAgentReturnReport, setLastAgentReturnReport] = React.useState<SupplierReport | null>(
    null,
  );

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_PRODUCTS;
    return MOCK_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.customCode.toLowerCase().includes(q),
    );
  }, [query]);

  const customer = MOCK_CREDIT_CUSTOMERS.find((c) => c.id === customerId);
  const supplierAgents = buildSupplierAgentOptions(MOCK_SUPPLIER_REPORTS);
  const selectedAgent = supplierAgents.find((agent) => agent.id === agentId);
  const originalReceipt = React.useMemo(() => findReceipt(receiptNumber), [receiptNumber]);
  const suggestedAgent = React.useMemo(() => {
    if (cart.length === 0) return undefined;
    const agentIds = cart
      .map((item) => findLatestAgentForProduct(item.product.name)?.agentId)
      .filter((id): id is string => Boolean(id));
    if (agentIds.length === 0) return undefined;
    const counts = new Map<string, number>();
    agentIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    const [topId] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return supplierAgents.find((agent) => agent.id === topId);
  }, [cart, supplierAgents]);
  const lineTotal = (item: ReturnCartItem) => safeNumber(item.price) * safeNumber(item.qty);
  const subtotal = cart.reduce((sum, item) => sum + lineTotal(item), 0);
  const normalizedPenaltyPercent = Math.min(100, Math.max(0, noReceiptPenaltyPercent || 0));
  const noReceiptDiscount =
    !originalReceipt && applyNoReceiptPenalty
      ? Math.round(subtotal * (normalizedPenaltyPercent / 100))
      : 0;
  const computedRefundTotal = Math.max(0, subtotal - noReceiptDiscount);
  const refundTotal =
    manualTotal !== null ? Math.max(0, parseNumberInput(manualTotal)) : computedRefundTotal;

  const openProduct = (product: Product) => {
    setProductModal(product);
    setModalQty(1);
    setModalMode("dona");
    setModalPriceMode("retail");
    setModalPrice(String(salePrice(product, "retail")));
    setModalNote("");
  };

  const addProductToCart = (
    product: Product,
    qty: number,
    priceMode: PriceMode,
    price: number,
    note?: string,
  ) => {
    const safeQty = Math.max(1, qty);
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && (item.note ?? "") === (note ?? ""),
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, qty: item.qty + safeQty } : item,
        );
      }
      return [
        ...prev,
        { id: `${product.id}-${Date.now()}`, product, qty: safeQty, price, priceMode, note },
      ];
    });
  };

  const pickProduct = (product: Product) => {
    const needsPrompt = WEIGHT_UNITS.has(product.unit);
    if (settings.quickAddToCart && !needsPrompt) {
      const price = salePrice(product, "retail");
      addProductToCart(product, 1, "retail", price);
      toast.success("Tovar savatchaga qo'shildi", {
        description: `${product.name} · 1 ${product.unit}`,
      });
      return;
    }
    openProduct(product);
  };

  const addFromModal = () => {
    if (!productModal) return;
    const perBox = productModal.perBox ?? 1;
    const qty = modalMode === "karobka" ? modalQty * perBox : modalQty;
    const price = Math.max(0, parseNumberInput(modalPrice));
    addProductToCart(productModal, qty, modalPriceMode, price, modalNote.trim() || undefined);
    setProductModal(null);
    toast.success("Tovar savatchaga qo'shildi", {
      description: `${productModal.name} · ${qty} ${productModal.unit}`,
    });
  };

  const changePrice = (id: string, price: number) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price: Math.max(0, price) } : item)),
    );
  };

  const changeQty = (id: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: Math.max(0, qty) } : item))
        .filter((item) => item.qty > 0),
    );
  };

  React.useEffect(() => {
    if (customerType !== "nasiya") {
      setCustomerSearch("");
      setCustomerId("");
    }
    if (customerType !== "agent") {
      setAgentId("");
    }
  }, [customerType]);

  const resetFinishCustomer = () => {
    if (originalReceipt?.customerType === "nasiya") {
      const receiptCustomer = MOCK_CREDIT_CUSTOMERS.find(
        (item) => item.id === originalReceipt.customerId,
      );
      setCustomerType("nasiya");
      setCustomerId(receiptCustomer?.id ?? "");
      setCustomerSearch(receiptCustomer ? fullCustomerName(receiptCustomer) : "");
      setAgentId("");
      return;
    }
    if (customerType === "nasiya") {
      setCustomerSearch("");
      setCustomerId("");
      setAgentId("");
      return;
    }
    if (customerType === "agent") {
      setCustomerSearch("");
      setCustomerId("");
      return;
    }
    setCustomerSearch("");
    setCustomerId("");
    setAgentId("");
  };

  const openFinish = () => {
    if (cart.length === 0) return toast.error("Qaytariladigan tovar tanlang");
    resetFinishCustomer();
    if (originalReceipt?.customerType !== "nasiya" && suggestedAgent) {
      setCustomerType("agent");
      setAgentId(suggestedAgent.id);
      toast.info(`Agent avtomatik tanlandi: ${suggestedAgent.name}`, {
        description: "Bu tovarni oxirgi marta shu agent olib kelgan edi.",
      });
    }
    setFinishOpen(true);
  };

  const buildPendingReturn = (): PendingReturnExchange | null => {
    if (cart.length === 0) {
      toast.error("Qaytariladigan tovar tanlang");
      return null;
    }
    if (cart.some((item) => item.qty <= 0)) {
      toast.error("Miqdor noto'g'ri");
      return null;
    }
    const originalReceiptCustomer =
      originalReceipt?.customerType === "nasiya" && originalReceipt.customerId
        ? MOCK_CREDIT_CUSTOMERS.find((item) => item.id === originalReceipt.customerId)
        : undefined;
    const effectiveCustomerType =
      customerType === "agent" ? "agent" : (originalReceipt?.customerType ?? customerType);
    const effectiveCustomer =
      effectiveCustomerType === "nasiya" ? (originalReceiptCustomer ?? customer) : undefined;
    const effectiveAgent =
      effectiveCustomerType === "agent"
        ? (selectedAgent ?? supplierAgents.find((item) => item.id === agentId))
        : undefined;
    if (effectiveCustomerType === "nasiya" && !effectiveCustomer) {
      toast.error("Nasiyachi mijoz topilmadi");
      return null;
    }
    if (effectiveCustomerType === "agent" && !effectiveAgent) {
      toast.error("Agent tanlang");
      return null;
    }
    const receiptCustomerName =
      effectiveCustomerType === "agent"
        ? (effectiveAgent?.name ?? "Taminotchi")
        : originalReceipt?.customerName ||
          (effectiveCustomer?.firstName && effectiveCustomer?.lastName
            ? `${effectiveCustomer.firstName} ${effectiveCustomer.lastName}`
            : "Oddiy mijoz");
    return {
      id: `pending-return-${Date.now()}`,
      createdAt: new Date().toISOString(),
      cashier: "Joriy foydalanuvchi",
      customerType: effectiveCustomerType,
      customerId: effectiveCustomer?.id,
      customerName: receiptCustomerName,
      agentId: effectiveAgent?.id,
      agentName: effectiveAgent?.name,
      agentPhone: effectiveAgent?.phone,
      items: cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: safeNumber(item.price),
        qty: safeNumber(item.qty),
        unit: item.product.unit,
      })),
      subtotal,
      total: refundTotal,
      reason: `${reason}${receiptNumber.trim() ? ` · Asl chek: ${receiptNumber.trim()}` : " · Asl chek kiritilmadi"}${noReceiptDiscount > 0 ? ` · ${normalizedPenaltyPercent}% jarima/skidka: ${formatSom(noReceiptDiscount)}` : ""}`,
      comment: comment.trim() || undefined,
      vehicleName: effectiveCustomerType === "agent" && routeEnabled ? vehicleName.trim() || undefined : undefined,
      vehiclePlate: effectiveCustomerType === "agent" && routeEnabled ? vehiclePlate.trim() || undefined : undefined,
      driverName: effectiveCustomerType === "agent" && routeEnabled ? driverName.trim() || undefined : undefined,
      driverPhone: effectiveCustomerType === "agent" && routeEnabled ? driverPhone.trim() || undefined : undefined,
      receiptNumber: receiptNumber.trim() || undefined,
      noReceiptDiscount,
      penaltyPercent: normalizedPenaltyPercent,
    };
  };

  const submit = (mode: "return" | "exchange") => {
    const pendingReturn = buildPendingReturn();
    if (!pendingReturn) return;

    if (mode === "exchange") {
      try {
        localStorage.setItem(PENDING_RETURN_EXCHANGE_KEY, JSON.stringify(pendingReturn));
      } catch {}
      setFinishOpen(false);
      onExchangeCreated?.(pendingReturn);
      toast.success("Qaytarish savdo oynasiga o'tkazildi", {
        description: "Yangi mahsulotlarni tanlab, yakunlash bosilganda hammasi birga saqlanadi.",
      });
      if (!onExchangeCreated) window.location.href = "/";
      return;
    }

    const createdReport = finalizePendingReturnExchange(pendingReturn);
    setCart([]);
    setReceiptNumber("");
    setApplyNoReceiptPenalty(false);
    setNoReceiptPenaltyPreset("15");
    setNoReceiptPenaltyPercent(15);
    setManualTotal(null);
    setComment("");
    setRouteEnabled(false);
    setVehicleName("");
    setVehiclePlate("");
    setDriverName("");
    setDriverPhone("");
    setFinishOpen(false);
    resetFinishCustomer();
    toast.success("Tovarlar qaytarildi", {
      description: `${pendingReturn.items.length} xil tovar: ${formatSom(refundTotal)}`,
    });
    if (createdReport.supplierReport) {
      setLastAgentReturnReport(createdReport.supplierReport);
    }
  };

  return (
    <div className="tovar-qaytarish-layout grid h-full grid-cols-[minmax(0,1fr)_280px] gap-3 overflow-hidden p-3">
      <div className="flex min-h-0 flex-col gap-3">
        <Card className="h-[220px] flex-shrink-0 overflow-hidden">
          <CardHeader className="border-b py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-4 w-4" /> Qaytarish savatchasi
                </CardTitle>
                <div
                  className="flex h-8 items-center gap-1.5 rounded-md border bg-muted/30 px-2 text-[11px] font-semibold text-muted-foreground"
                  title="Mahsulot tanlanganda miqdor so'ramasdan to'g'ridan-to'g'ri savatga qo'shiladi"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Tezkor qo'shish</span>
                  <Switch
                    checked={settings.quickAddToCart}
                    onCheckedChange={(checked) => updateSettings({ quickAddToCart: checked })}
                    className="ml-0.5"
                  />
                </div>
              </div>
              <div
                key={`return-header-${refundTotal}`}
                data-no-translate
                className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary"
              >
                {formatSom(refundTotal)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[170px] overflow-auto p-0">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <ShoppingCart className="mb-2 h-8 w-8 text-muted-foreground/30" />
                Qaytariladigan tovarni pastdagi jadvaldan tanlang
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left font-semibold">Nomi</th>
                    <th className="px-3 py-2 text-right font-semibold">Narxi</th>
                    <th className="w-40 px-3 py-2 text-center font-semibold">Miqdor</th>
                    <th className="px-3 py-2 text-left font-semibold">Birlik</th>
                    <th className="px-3 py-2 text-right font-semibold">Jami</th>
                    <th className="w-16 px-3 py-2 text-center font-semibold">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id} className="border-b transition-colors hover:bg-muted/40">
                      <td className="px-3 py-1.5">
                        <div className="truncate font-medium">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.note || item.product.customCode}
                          {item.priceMode === "wholesale" && (
                            <span className="ml-1 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-bold uppercase text-primary">
                              Optom
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <Input
                          type="number"
                          min={0}
                          value={item.price}
                          onChange={(e) => changePrice(item.id, Number(e.target.value) || 0)}
                          className="h-7 w-24 text-right text-xs tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => changeQty(item.id, item.qty - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.qty}
                            onChange={(e) => changeQty(item.id, Number(e.target.value) || 0)}
                            className="h-7 w-14 text-center text-xs"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => changeQty(item.id, item.qty + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{item.product.unit}</td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                        {formatSom(lineTotal(item))}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => changeQty(item.id, 0)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-0 flex-1 overflow-hidden">
          <CardHeader className="border-b p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Search className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Label className="mb-1 block text-xs">Tovar qidirish</Label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nomi, kodi yoki shtrix kodi"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[calc(100%-73px)] overflow-auto p-0">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-semibold">Qaytariladigan mahsulot</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Narxi</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Omborda</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Birlik</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Amal</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => pickProduct(p)}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.customCode} · {p.barcode}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {formatSom(salePrice(p))}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={p.omborQty < 10 ? "font-semibold text-destructive" : ""}>
                        {p.omborQty}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.unit}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProduct(p);
                        }}
                      >
                        <PackageOpen className="h-3.5 w-3.5" /> Tanlash
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <aside className="min-h-0 overflow-auto">
        <Card>
          <CardHeader className="border-b py-2.5">
            <CardTitle className="flex items-center gap-2 text-sm">
              <RotateCcw className="h-4 w-4" /> Qaytarishni yakunlash
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            <div>
              <Label className="mb-1 block text-xs">
                Chek raqami <span className="text-muted-foreground">ixtiyoriy</span>
              </Label>
              <Input
                className="h-9"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Masalan: CHK-1024"
              />
            </div>
            {receiptNumber.trim() && (
              <ReceiptLookupCard receipt={originalReceipt} query={receiptNumber} />
            )}
            {!originalReceipt && (
              <div
                className={`rounded-lg border p-2 transition ${applyNoReceiptPenalty ? "border-orange-300 bg-orange-50 text-orange-700" : "bg-muted/30"}`}
              >
                <button
                  type="button"
                  onClick={() => setApplyNoReceiptPenalty((v) => !v)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <Percent className="h-4 w-4" /> Cheksiz qaytarish skidkasi
                  </span>
                  <span className="text-xs font-bold">
                    {applyNoReceiptPenalty ? "Yoqilgan" : "Ixtiyoriy"}
                  </span>
                </button>
                {applyNoReceiptPenalty && (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <Select
                        value={noReceiptPenaltyPreset}
                        onValueChange={(v) => {
                          const value = v as "5" | "10" | "15" | "custom";
                          setNoReceiptPenaltyPreset(value);
                          if (value !== "custom") setNoReceiptPenaltyPercent(Number(value));
                        }}
                      >
                        <SelectTrigger className="h-8 bg-white text-sm">
                          <SelectValue placeholder="Foiz tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="15">15%</SelectItem>
                          <SelectItem value="custom">Ixtiyoriy</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm font-bold">{normalizedPenaltyPercent}%</span>
                    </div>

                    {noReceiptPenaltyPreset === "custom" && (
                      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={noReceiptPenaltyPercent}
                          onChange={(e) =>
                            setNoReceiptPenaltyPercent(
                              Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                            )
                          }
                          className="h-8 bg-white text-sm"
                          placeholder="Masalan: 12"
                        />
                        <span className="text-sm font-bold">%</span>
                      </div>
                    )}

                    <p className="text-[11px] text-orange-700/80">
                      Asl chek topilmasa, skidka faqat button yoqilganda ishlaydi. Yoqilmasa summa
                      to'liq qaytariladi.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span>Jami</span>
                <b key={`return-subtotal-${subtotal}`} data-no-translate>
                  {formatSom(subtotal)}
                </b>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>Skidka/jarima</span>
                <b key={`return-discount-${noReceiptDiscount}`} data-no-translate>
                  -{formatSom(noReceiptDiscount)}
                </b>
              </div>
              <div className="border-t pt-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">Umumiy summa</Label>
                  {manualTotal !== null && (
                    <button
                      type="button"
                      onClick={() => setManualTotal(null)}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Avtomatik hisoblash
                    </button>
                  )}
                </div>
                <Input
                  value={
                    manualTotal !== null ? manualTotal : formatNumberInput(computedRefundTotal)
                  }
                  onChange={(e) => setManualTotal(formatNumberInput(e.target.value))}
                  className="mt-1 h-10 text-right text-lg font-bold tabular-nums text-primary"
                />
              </div>
            </div>

            <Button onClick={openFinish} disabled={cart.length === 0} className="w-full gap-2">
              <CheckCircle2 className="h-4 w-4" /> Yakunlash
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit("exchange")}
              disabled={cart.length === 0}
              className="w-full gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Mahsulot xarid qilish
            </Button>
          </CardContent>
        </Card>
      </aside>

      <Dialog open={!!productModal} onOpenChange={(open) => !open && setProductModal(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageOpen className="h-5 w-5" /> Tovarni qaytarishga qo'shish
            </DialogTitle>
          </DialogHeader>
          {productModal && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-3">
                <div className="font-bold">{productModal.name}</div>
                <div className="text-sm text-muted-foreground">
                  {productModal.customCode} · {productModal.barcode}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-card p-2">
                    <span className="text-muted-foreground">Ombor</span>
                    <b className="block">
                      {productModal.omborQty} {productModal.unit}
                    </b>
                  </div>
                  <div className="rounded-lg bg-card p-2">
                    <span className="text-muted-foreground">Karobka</span>
                    <b className="block">
                      {productModal.perBox ?? 1} {productModal.unit}
                    </b>
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-1 block text-xs">Narx turi</Label>
                <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/30 p-1">
                  <Button
                    type="button"
                    variant={modalPriceMode === "retail" ? "default" : "ghost"}
                    className="h-9 gap-1.5 text-xs"
                    onClick={() => {
                      setModalPriceMode("retail");
                      setModalMode("dona");
                      setModalPrice(String(salePrice(productModal, "retail")));
                    }}
                  >
                    Oddiy narx
                  </Button>
                  <Button
                    type="button"
                    variant={modalPriceMode === "wholesale" ? "default" : "ghost"}
                    className="h-9 gap-1.5 text-xs"
                    onClick={() => {
                      setModalPriceMode("wholesale");
                      setModalPrice(String(salePrice(productModal, "wholesale")));
                    }}
                  >
                    Optom narx
                  </Button>
                </div>
              </div>

              <div>
                <Label className="mb-1 block text-xs">
                  Qaytarish narxi ({productModal.unit}) — ixtiyoriy o'zgartirish mumkin
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={modalPrice}
                  onChange={(e) => setModalPrice(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {modalPriceMode === "wholesale" &&
                productModal.unit === "dona" &&
                (productModal.perBox ?? 0) > 1 ? (
                  <div>
                    <Label className="mb-1 block text-xs">O'lchov</Label>
                    <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/30 p-1">
                      <Button
                        type="button"
                        variant={modalMode === "dona" ? "default" : "ghost"}
                        className="h-9 gap-1.5 text-xs"
                        onClick={() => setModalMode("dona")}
                      >
                        <PackageOpen className="h-3.5 w-3.5" />
                        Dona
                      </Button>
                      <Button
                        type="button"
                        variant={modalMode === "karobka" ? "default" : "ghost"}
                        className="h-9 gap-1.5 text-xs"
                        onClick={() => setModalMode("karobka")}
                      >
                        <Box className="h-3.5 w-3.5" />
                        Karobka
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div />
                )}
                <div>
                  <Label className="mb-1 block text-xs">Miqdor</Label>
                  <Input
                    type="number"
                    min={1}
                    value={modalQty}
                    onChange={(e) => setModalQty(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <Box className="h-4 w-4" /> Savatchaga tushadigan miqdor
                </div>
                <div className="mt-1 text-lg font-bold text-primary">
                  {modalMode === "karobka" ? modalQty * (productModal.perBox ?? 1) : modalQty}{" "}
                  {productModal.unit}
                </div>
              </div>

              <div>
                <Label className="mb-1 block text-xs">Qo'shimcha ma'lumot</Label>
                <Textarea
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Masalan: karobkasi ochilgan, ortib qolgan..."
                />
              </div>

              <Button onClick={addFromModal} className="w-full gap-2">
                <Plus className="h-4 w-4" /> Savatchaga qo'shish
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="sm:max-w-[920px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" /> Qaytarishni yakunlash
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setCustomerType("oddiy");
                  setCustomerId("");
                  setCustomerSearch("");
                  setAgentId("");
                }}
                className={`rounded-xl border p-4 text-left transition hover:bg-muted ${customerType === "oddiy" ? "border-primary bg-primary/5" : ""}`}
              >
                <b>Oddiy xaridor</b>
                <p className="mt-1 text-xs text-muted-foreground">
                  Summa kassadan pul chiqarishdagi “Tovar qaytarish” kategoriyasiga tushadi.
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerType("nasiya");
                  setAgentId("");
                }}
                className={`rounded-xl border p-4 text-left transition hover:bg-muted ${customerType === "nasiya" ? "border-primary bg-primary/5" : ""}`}
              >
                <b>Nasiyachi</b>
                <p className="mt-1 text-xs text-muted-foreground">
                  Kassadan chiqim bo'lmaydi, mijozning umumiy qarzidan minus qilinadi.
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerType("agent");
                  setCustomerId("");
                  setCustomerSearch("");
                }}
                className={`rounded-xl border p-4 text-left transition hover:bg-muted ${customerType === "agent" ? "border-primary bg-primary/5" : ""}`}
              >
                <b>Agent / taminotchi</b>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tovar agentga qaytariladi, qaytarish agent hisob-kitobiga yoziladi.
                </p>
                {suggestedAgent && customerType !== "agent" && (
                  <p className="mt-1.5 text-[11px] font-semibold text-primary">
                    Taklif: {suggestedAgent.name} (shu tovarni u olib kelgan)
                  </p>
                )}
              </button>
            </div>

            {customerType === "nasiya" && (
              <div className="rounded-xl border bg-muted/20 p-3">
                <Label className="mb-1 block text-xs">
                  Nasiyachini ism, ID yoki telefon orqali topish
                </Label>
                <CustomerSearch
                  value={customerSearch}
                  onValueChange={(value) => {
                    setCustomerSearch(value);
                    setCustomerId("");
                  }}
                  selectedId={customerId}
                  onSelect={(customer) => {
                    setCustomerId(customer.id);
                    setCustomerSearch(fullCustomerName(customer));
                  }}
                  placeholder="Dilshod, c3 yoki +998..."
                  compact
                />
              </div>
            )}

            {customerType === "agent" && (
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="mb-1 block text-xs font-semibold">
                    Agent / taminotchi tanlash
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {supplierAgents.length} ta yozuv
                  </span>
                </div>
                {suggestedAgent && agentId === suggestedAgent.id && (
                  <div className="mb-2 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                    Avtomatik tanlandi: shu tovarni oxirgi marta {suggestedAgent.name} olib kelgan edi
                  </div>
                )}
                <Select value={agentId} onValueChange={setAgentId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Agentni ro'yxatdan tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex flex-col py-0.5">
                          <span className="font-semibold">
                            {agent.id} — {agent.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {agent.phone || "Raqam yo'q"} · Qoldiq: {formatSom(agent.remainingDebt)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAgent && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-background p-2 text-muted-foreground">
                      Hozirgi qoldiq
                      <div className="text-sm font-bold text-foreground">
                        {formatSom(selectedAgent.remainingDebt)}
                      </div>
                    </div>
                    <div className="rounded-md bg-background p-2 text-muted-foreground">
                      Qaytarishdan keyin
                      <div className="text-sm font-bold text-primary">
                        {formatSom(selectedAgent.remainingDebt - refundTotal)}
                      </div>
                    </div>
                  </div>
                )}
                {supplierAgents.length === 0 && (
                  <div className="mt-2 text-xs text-destructive">
                    Agent topilmadi. Avval agentlar ro'yxatini to'ldiring.
                  </div>
                )}

                <div className="mt-3 rounded-lg border p-3">
                  <button
                    type="button"
                    onClick={() => setRouteEnabled((value) => !value)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      <Truck className="h-4 w-4" /> Mashrutni to'liq yozish
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {routeEnabled ? "Yoqilgan" : "Ixtiyoriy"}
                    </span>
                  </button>
                  {routeEnabled && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="mb-1 block text-xs">Mashina nomi</Label>
                        <Input
                          value={vehicleName}
                          onChange={(e) => setVehicleName(e.target.value)}
                          placeholder="Masalan: Isuzu"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">Mashina raqami</Label>
                        <Input
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(e.target.value)}
                          placeholder="01 A 123 BC"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">Haydovchi ismi</Label>
                        <Input
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          placeholder="Ism familiya"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">Haydovchi raqami</Label>
                        <Input
                          value={driverPhone}
                          onChange={(e) => setDriverPhone(e.target.value)}
                          placeholder="+998"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label className="mb-1 block text-xs">Izoh</Label>
              <Textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Qo'shimcha izoh (ixtiyoriy)"
              />
            </div>

            <div className="rounded-xl bg-primary/10 p-3 text-right">
              <div className="text-xs text-primary">Qaytarish summasi</div>
              <div className="text-2xl font-bold text-primary">{formatSom(refundTotal)}</div>
            </div>
            <Button onClick={() => submit("return")} className="w-full gap-2">
              <CheckCircle2 className="h-4 w-4" /> Tasdiqlash
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!lastAgentReturnReport}
        onOpenChange={(open) => !open && setLastAgentReturnReport(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Qaytarish hujjatini yuklab olish
            </DialogTitle>
          </DialogHeader>
          {lastAgentReturnReport && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="font-semibold">{lastAgentReturnReport.agentName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Qaytarish summasi: {formatSom(Math.abs(lastAgentReturnReport.totalAmount))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    exportAgentHistoryToExcel(
                      [lastAgentReturnReport],
                      lastAgentReturnReport.agentId,
                      lastAgentReturnReport.agentName,
                    )
                  }
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    printAgentNakladnoy(
                      [lastAgentReturnReport],
                      lastAgentReturnReport.agentId,
                      lastAgentReturnReport.agentName,
                      lastAgentReturnReport.agentPhone,
                      settings.receiptSettings.storeName,
                      settings.receiptSettings.phone,
                    )
                  }
                >
                  <FileText className="h-4 w-4" />
                  Nakladnoy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    printAgentReceipt80mm(
                      lastAgentReturnReport,
                      settings.receiptSettings.storeName,
                      settings.receiptSettings.phone,
                    )
                  }
                >
                  <Printer className="h-4 w-4" />
                  80sm chek
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLastAgentReturnReport(null)}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function finalizePendingReturnExchange(pendingReturn: PendingReturnExchange) {
  pendingReturn.items.forEach((item) => {
    const product = MOCK_PRODUCTS.find((row) => row.id === item.productId);
    if (product) product.omborQty += item.qty;
  });

  let cashWithdrawalId: string | undefined;
  const customer =
    pendingReturn.customerType === "nasiya" && pendingReturn.customerId
      ? MOCK_CREDIT_CUSTOMERS.find((item) => item.id === pendingReturn.customerId)
      : undefined;
  const agent =
    pendingReturn.customerType === "agent" && pendingReturn.agentId
      ? buildSupplierAgentOptions(MOCK_SUPPLIER_REPORTS).find(
          (item) => item.id === pendingReturn.agentId,
        )
      : undefined;

  if (pendingReturn.customerType === "oddiy") {
    cashWithdrawalId = `CH-QT-${Date.now()}`;
    MOCK_WITHDRAWALS.unshift({
      id: cashWithdrawalId,
      date: new Date().toISOString(),
      cashier: pendingReturn.cashier,
      category: "Tovar qaytarish",
      cash: pendingReturn.total,
      cardAmount: 0,
      currencies: [],
      note: `Tovar qaytarish${pendingReturn.receiptNumber ? ` · chek ${pendingReturn.receiptNumber}` : " · cheksiz"}${pendingReturn.noReceiptDiscount > 0 ? ` · ${pendingReturn.penaltyPercent}% jarima: ${formatSom(pendingReturn.noReceiptDiscount)}` : ""}`,
    });
  } else if (customer) {
    applyDebtReturn(customer, pendingReturn.total, {
      id: `QT-${Date.now()}`,
      date: new Date().toISOString(),
      type: "return",
      title: "Tovar qaytarish",
      items: pendingReturn.items.map((item) => ({
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        amount: item.price * item.qty,
      })),
      amount: -pendingReturn.total,
      note: pendingReturn.reason,
    });
  }

  let supplierReport: SupplierReport | undefined;
  if (agent) {
    supplierReport = recordSupplierReturn({
      cashier: pendingReturn.cashier,
      agentId: agent.id,
      agentName: agent.name,
      agentPhone: agent.phone,
      totalAmount: pendingReturn.total,
      note: [pendingReturn.reason, pendingReturn.comment].filter(Boolean).join(" · "),
      vehicleName: pendingReturn.vehicleName,
      vehiclePlate: pendingReturn.vehiclePlate,
      driverName: pendingReturn.driverName,
      driverPhone: pendingReturn.driverPhone,
      items: pendingReturn.items.map((item) => ({
        productName: item.name,
        qty: item.qty,
        unit: item.unit,
        amount: item.price * item.qty,
      })),
    });
  }

  const receipt: ReturnReceipt = {
    id: `QT-${Date.now()}`,
    date: new Date().toISOString(),
    cashier: pendingReturn.cashier,
    customerType: pendingReturn.customerType,
    customerId: pendingReturn.customerId,
    customerName: pendingReturn.customerName,
    agentId: pendingReturn.agentId,
    agentName: pendingReturn.agentName,
    agentPhone: pendingReturn.agentPhone,
    items: pendingReturn.items,
    subtotal: pendingReturn.subtotal,
    total: pendingReturn.total,
    reason: pendingReturn.reason,
    cashWithdrawalId,
  };
  MOCK_RETURN_RECEIPTS.unshift(receipt);
  dispatchReturnReceipt(receipt, findReceipt(pendingReturn.receiptNumber ?? ""), customer, agent);
  return { receipt, supplierReport };
}

function ReceiptLookupCard({ receipt, query }: { receipt: Receipt | undefined; query: string }) {
  if (!receipt) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground">Chek topilmadi</div>
        <div className="mt-1">"{query.trim()}" ID bo'yicha savdo cheki bazadan topilmadi.</div>
      </div>
    );
  }

  const buyer =
    receipt.customerName ||
    (receipt.customerType === "nasiya" && receipt.customerId
      ? fullCustomerNameById(receipt.customerId)
      : "Oddiy mijoz");

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-semibold text-primary">Asl chek topildi</div>
        <div className="font-mono font-bold">{receipt.id}</div>
      </div>
      <div className="space-y-1">
        <InfoLine label="Mijoz" value={buyer} />
        <InfoLine label="Turi" value={receipt.customerType === "nasiya" ? "Nasiyachi" : "Oddiy"} />
        <InfoLine label="Sana" value={new Date(receipt.date).toLocaleString("uz-UZ")} />
        <InfoLine label="Summa" value={formatSom(receipt.total)} />
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function findReceipt(value: string) {
  const id = value.trim().toLowerCase();
  if (!id) return undefined;
  return MOCK_RECEIPTS.find((receipt) => receipt.id.toLowerCase() === id);
}

function fullCustomerNameById(customerId: string) {
  const customer = MOCK_CREDIT_CUSTOMERS.find((item) => item.id === customerId);
  return customer ? fullCustomerName(customer) : customerId;
}

function findLatestAgentForProduct(productName: string) {
  const normalized = productName.trim().toLowerCase();
  if (!normalized) return undefined;
  return MOCK_PRODUCT_HISTORY.filter(
    (entry) => Boolean(entry.agentId) && entry.productName.trim().toLowerCase() === normalized,
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

function buildSupplierAgentOptions(reports: typeof MOCK_SUPPLIER_REPORTS) {
  const map = new Map<
    string,
    { id: string; name: string; phone?: string; botEnabled: boolean; remainingDebt: number }
  >();

  reports.forEach((report) => {
    if (!report.agentId) return;
    const current = map.get(report.agentId) ?? {
      id: report.agentId,
      name: report.agentName || "Nomsiz agent",
      phone: report.agentPhone,
      botEnabled: false,
      remainingDebt: 0,
    };
    current.botEnabled = current.botEnabled || Boolean(report.botEnabled);
    current.remainingDebt += report.remainingDebt ?? 0;
    if (!current.phone && report.agentPhone) current.phone = report.agentPhone;
    map.set(report.agentId, current);
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function dispatchReturnReceipt(
  receipt: ReturnReceipt,
  originalReceipt: Receipt | undefined,
  customer: CreditCustomer | undefined,
  agent?: { id: string; name: string; phone?: string; botEnabled?: boolean } | undefined,
) {
  if (receipt.customerType === "agent") {
    const target =
      agent ??
      (receipt.agentId
        ? buildSupplierAgentOptions(MOCK_SUPPLIER_REPORTS).find(
            (item) => item.id === receipt.agentId,
          )
        : undefined);
    if (!target?.botEnabled) return;
    dispatchReceiptMessage({
      recipientCategory: "agent",
      recipientId: target.id,
      recipientName: target.name,
      phone: target.phone,
      receiptId: receipt.id,
      title: "Taminotchiga qaytarish cheki",
      total: receipt.total,
      note: receipt.reason,
    });
    return;
  }

  if (receipt.customerType === "nasiya") {
    const target = customer ?? MOCK_CREDIT_CUSTOMERS.find((item) => item.id === receipt.customerId);
    if (!target?.botEnabled) return;
    dispatchReceiptMessage({
      recipientCategory: "nasiya",
      recipientId: target.id,
      recipientName: fullCustomerName(target),
      phone: target.phone,
      receiptId: receipt.id,
      title: "Tovar qaytarish cheki",
      total: receipt.total,
      note: receipt.reason,
    });
    return;
  }

  if (!originalReceipt?.customerPhone) return;
  dispatchReceiptMessage({
    recipientCategory: "oddiy",
    recipientId: originalReceipt.customerId,
    recipientName: originalReceipt.customerName || "Oddiy mijoz",
    phone: originalReceipt.customerPhone,
    receiptId: receipt.id,
    title: "Tovar qaytarish cheki",
    total: receipt.total,
    note: receipt.reason,
  });
}

function salePrice(product: unknown, priceMode: PriceMode = "retail") {
  const record = product && typeof product === "object" ? (product as Record<string, unknown>) : {};
  if (priceMode === "wholesale") {
    const wholesale = firstPositiveNumber(record.wholesalePrice);
    if (wholesale > 0) return wholesale;
  }
  return firstPositiveNumber(
    record.price,
    record.salePrice,
    record.sellPrice,
    record.sotuvNarx,
    record.sotuvNarxi,
    record.narx,
  );
}

function firstPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const number = safeNumber(value);
    if (number > 0) return number;
  }
  return 0;
}

function safeNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(number)) return number;
  const parsed = Number(
    String(value ?? "")
      .replace(/\s/g, "")
      .replace(/,/g, ".")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}
