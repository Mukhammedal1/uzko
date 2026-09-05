import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/sotuv/TopBar";
import { BottomBar } from "@/components/sotuv/BottomBar";
import { SaleCart } from "@/components/sotuv/SaleCart";
import { ProductsBrowser } from "@/components/sotuv/ProductsBrowser";
import { QuantityModal } from "@/components/sotuv/QuantityModal";
import { SaleTabsBar } from "@/components/sotuv/SaleTabsBar";
import { OnlineSalesDialog } from "@/components/sotuv/OnlineSalesDialog";
import { PosPage } from "@/features/pos/PosPage";
import type {
  CartItem,
  Discount,
  FinalizedSalePayload,
  OneTimeItemInput,
  PendingReturnExchange,
  PriceMode,
} from "@/components/sotuv/types";
import { useApp } from "@/lib/app-context";
import { addSaleReceipt, dispatchRegularSaleReceipt } from "@/lib/data-actions";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import type { Product, ReceiptItem } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  finalizePendingReturnExchange,
  PENDING_RETURN_EXCHANGE_KEY,
  TovarQaytarish,
} from "@/components/tovarlar/TovarQaytarish";
import { QarzdorlikniYopish } from "@/components/kassa/QarzdorlikniYopish";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "UZKO — Sotuvchi" }, { name: "description", content: "Sotuvchi savdo oynasi" }],
  }),
  component: SotuvchiPage,
});

type SaleSession = {
  id: string;
  index: number;
  items: CartItem[];
  discount: Discount;
  priceMode: PriceMode;
  currency: string;
};

const makeSession = (index: number): SaleSession => ({
  id: `sale-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
  index,
  items: [],
  discount: { type: "none" },
  priceMode: "retail",
  currency: "UZS",
});

function SotuvchiPage() {
  const { settings } = useApp();
  const [sales, setSales] = React.useState<SaleSession[]>(() => [makeSession(1)]);
  const [activeId, setActiveId] = React.useState<string>(() => "");
  const [pickedProduct, setPickedProduct] = React.useState<Product | null>(null);
  const [qtyOpen, setQtyOpen] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [onlineSalesOpen, setOnlineSalesOpen] = React.useState(false);
  const [debtPaymentOpen, setDebtPaymentOpen] = React.useState(false);
  const [posUiOpen, setPosUiOpen] = React.useState(false);
  const [pendingReturn, setPendingReturn] = React.useState<PendingReturnExchange | null>(null);

  // birinchi render: activeId ni o'rnatamiz
  React.useEffect(() => {
    if (!activeId && sales.length > 0) setActiveId(sales[0].id);
  }, [activeId, sales]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_RETURN_EXCHANGE_KEY);
      if (raw) setPendingReturn(JSON.parse(raw) as PendingReturnExchange);
    } catch {}
  }, []);

  const active = sales.find((s) => s.id === activeId) ?? sales[0];

  const updateActive = (updater: (s: SaleSession) => SaleSession) => {
    setSales((prev) => prev.map((s) => (s.id === active.id ? updater(s) : s)));
  };

  const handlePick = (p: Product) => {
    const needsPrompt =
      p.unit === "kg" ||
      (active.priceMode === "wholesale" && p.unit === "dona" && (p.perBox ?? 0) > 1);
    if (settings.quickAddToCart && !needsPrompt) {
      handleAddToCart(p, 1, "retail");
      return;
    }
    setPickedProduct(p);
    setQtyOpen(true);
  };

  const handleAddToCart = (product: Product, quantity: number, priceMode: PriceMode = "retail") => {
    updateActive((s) => {
      const existing = s.items.find(
        (it) => it.product.id === product.id && (it.priceMode ?? "retail") === priceMode,
      );
      if (existing) {
        return {
          ...s,
          items: s.items.map((it) =>
            it.id === existing.id ? { ...it, quantity: it.quantity + quantity } : it,
          ),
        };
      }
      return {
        ...s,
        items: [
          ...s.items,
          {
            id: `${product.id}-${Date.now()}`,
            product,
            quantity,
            unit: product.unit,
            priceMode,
          },
        ],
      };
    });
  };

  const handleAddOneTimeItem = (item: OneTimeItemInput) => {
    const id = `one-time-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const product: Product = {
      id,
      name: item.name,
      price: item.price,
      costPrice: 0,
      costCurrency: "UZS",
      barcode: "",
      customCode: "BIR-MARTALIK",
      unit: item.unit,
      warehouse: "Bir martalik",
      vitrinaQty: item.quantity,
      omborQty: 0,
    };

    updateActive((s) => ({
      ...s,
      items: [
        ...s.items,
        {
          id,
          product,
          quantity: item.quantity,
          unit: item.unit,
          source: "one-time",
          note: item.note,
        },
      ],
    }));
  };

  const handleChangeQty = (id: string, qty: number) => {
    updateActive((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? { ...it, quantity: Math.max(0, qty) } : it)),
    }));
  };

  const handleRemove = (id: string) => {
    updateActive((s) => ({ ...s, items: s.items.filter((it) => it.id !== id) }));
  };

  const handleSetDiscount = (d: Discount) => {
    updateActive((s) => ({ ...s, discount: d }));
  };

  // Chek yaratish + qaytgan tovar kreditini yakunlash — oddiy sotuv oynasi va
  // POS UI ikkalasi ham shu bitta manbadan foydalanadi.
  const finalizeSaleCore = (payload: FinalizedSalePayload, items: ReceiptItem[]) => {
    if (pendingReturn) {
      finalizePendingReturnExchange(pendingReturn);
      try {
        localStorage.removeItem(PENDING_RETURN_EXCHANGE_KEY);
      } catch {}
      setPendingReturn(null);
    }
    const receipt = addSaleReceipt({
      cashier: settings.username || "Admin",
      customerType: payload.customerType,
      customerId: payload.customerId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      subtotal: payload.subtotal,
      discount: payload.discountAmount,
      total: payload.total,
      paidAmount: payload.paidAmount,
      debtAmount: payload.debtAmount,
      paymentBreakdown: payload.paymentBreakdown,
      items,
    });
    if (
      payload.customerType === "oddiy" &&
      payload.customerId &&
      payload.customerName &&
      payload.customerPhone
    ) {
      const [firstName, ...rest] = payload.customerName.split(" ");
      dispatchRegularSaleReceipt(receipt, {
        id: payload.customerId,
        firstName,
        lastName: rest.join(" "),
        phone: payload.customerPhone,
      });
    }
  };

  const handleFinalize = (payload: FinalizedSalePayload) => {
    finalizeSaleCore(
      payload,
      active.items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: salePrice(item.product, item.priceMode ?? active.priceMode),
        qty: item.quantity,
        unit: item.unit,
        source: item.source ?? "catalog",
        note: item.note,
      })),
    );
    updateActive((s) => ({ ...s, items: [], discount: { type: "none" } }));
  };

  const clearPendingReturn = () => {
    try {
      localStorage.removeItem(PENDING_RETURN_EXCHANGE_KEY);
    } catch {}
    setPendingReturn(null);
  };

  const handleAddSale = () => {
    setSales((prev) => {
      // eng kichik bo'sh raqamni topamiz: 1, 2, 3 ...
      const used = new Set(prev.map((p) => p.index));
      let n = 1;
      while (used.has(n)) n++;
      const newSale = makeSession(n);
      setActiveId(newSale.id);
      return [...prev, newSale].sort((a, b) => a.index - b.index);
    });
  };

  const handleRemoveSale = (id: string) => {
    setSales((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((s) => s.id !== id);
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  if (!active) return null;

  return (
    <div className="app-shell flex min-h-dvh w-full flex-col bg-muted/30 pb-14 lg:pb-0">
      <TopBar />

      <main className="responsive-main flex min-h-0 flex-1 flex-col gap-2 overflow-hidden bg-muted/40 p-2">
        {posUiOpen ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="flex h-9 flex-shrink-0 items-center border-b bg-card px-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPosUiOpen(false)}
                className="h-7 gap-1.5 px-2 text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Orqaga
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              <PosPage
                products={MOCK_PRODUCTS}
                onOpenDebtPayment={() => setDebtPaymentOpen(true)}
                onOpenOnlineSales={() => setOnlineSalesOpen(true)}
                onExchangeCreated={(next) => setPendingReturn(next)}
                pendingReturn={pendingReturn}
                onClearPendingReturn={clearPendingReturn}
                onFinalizeSale={finalizeSaleCore}
              />
            </div>
          </div>
        ) : (
          <>
            {/* 1-qism: Savatcha */}
            <section className="sale-cart-shell flex h-[285px] flex-shrink-0 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
              <SaleCart
                items={active.items}
                discount={active.discount}
                priceMode={active.priceMode}
                onChangeQty={handleChangeQty}
                onRemove={handleRemove}
                onSetDiscount={handleSetDiscount}
                onFinalize={handleFinalize}
                onAddOneTimeItem={handleAddOneTimeItem}
                onOpenDebtPayment={() => setDebtPaymentOpen(true)}
                onOpenOnlineSales={() => setOnlineSalesOpen(true)}
                onOpenReturn={() => setReturnOpen(true)}
                pendingReturn={pendingReturn}
                onClearPendingReturn={clearPendingReturn}
                onOpenPosUi={() => setPosUiOpen(true)}
                currency={active.currency}
                currencies={settings.currencies}
                onChangeCurrency={(code) => updateActive((s) => ({ ...s, currency: code }))}
                onChangePriceMode={(mode) => updateActive((s) => ({ ...s, priceMode: mode }))}
              />
            </section>

            {/* 2-qism: Mahsulotlar + qidiruv (filter) — bitta blok */}
            <section className="responsive-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
              <ProductsBrowser
                onPick={handlePick}
                priceMode={active.priceMode}
                currency={active.currency}
                onAddOneTimeItem={handleAddOneTimeItem}
              />
            </section>
          </>
        )}
      </main>

      <BottomBar
        middleSlot={
          <SaleTabsBar
            sales={sales.map((s) => ({ id: s.id, index: s.index, itemCount: s.items.length }))}
            activeId={active.id}
            onSelect={setActiveId}
            onAdd={handleAddSale}
            onRemove={handleRemoveSale}
          />
        }
      />

      <QuantityModal
        product={pickedProduct}
        open={qtyOpen}
        onOpenChange={setQtyOpen}
        onAdd={handleAddToCart}
        currency={active.currency}
      />

      <OnlineSalesDialog
        open={onlineSalesOpen}
        onOpenChange={setOnlineSalesOpen}
        cashier={settings.username || "Admin"}
      />

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="h-[94dvh] max-w-7xl overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>Tovar qaytarish</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(94dvh-57px)] overflow-hidden">
            <TovarQaytarish
              exchangeShortcut
              onExchangeCreated={(nextReturn) => {
                setPendingReturn(nextReturn);
                setReturnOpen(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={debtPaymentOpen} onOpenChange={setDebtPaymentOpen}>
        <DialogContent className="h-[92dvh] max-w-7xl overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>Qarz so'ndirish</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(92dvh-57px)] overflow-hidden">
            <QarzdorlikniYopish mode="payment" />
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="top-center" richColors />
    </div>
  );
}

function salePrice(product: Product, priceMode: PriceMode = "retail") {
  if (priceMode === "wholesale") {
    const wholesale = firstPositiveNumber((product as Record<string, unknown>).wholesalePrice);
    if (wholesale > 0) return wholesale;
  }
  return firstPositiveNumber(
    product.price,
    (product as Record<string, unknown>).salePrice,
    (product as Record<string, unknown>).sellPrice,
    (product as Record<string, unknown>).sotuvNarx,
    (product as Record<string, unknown>).sotuvNarxi,
    (product as Record<string, unknown>).narx,
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
