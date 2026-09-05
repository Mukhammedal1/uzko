import * as React from "react";
import { toast } from "sonner";
import { HandCoins, PackagePlus, RotateCcw, Wifi } from "lucide-react";
import { formatSom } from "@/lib/mock-data";
import type { Product, ReceiptItem } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FinalizeSaleDialog } from "@/components/sotuv/FinalizeSaleDialog";
import { OneTimeItemDialog } from "@/components/sotuv/OneTimeItemDialog";
import { TovarQaytarish } from "@/components/tovarlar/TovarQaytarish";
import type {
  FinalizedSalePayload,
  FinalizeSaleDetails,
  OneTimeItemInput,
  PendingReturnExchange,
} from "@/components/sotuv/types";
import { PosHeader } from "./PosHeader";
import { ProductSearch } from "./ProductSearch";
import { ProductGrid } from "./ProductGrid";
import { CartPanel } from "./CartPanel";
import { QuickItemsPanel, QUICK_DEFAULT_HEIGHT } from "./QuickItemsPanel";
import { usePosCart, type PosCartLine } from "./usePosCart";

type Props = {
  products: Product[];
  /** Savdo haqiqiy yakunlangach (Savdoni yakunlash popupi tasdiqlangandan so'ng) chaqiriladi. */
  onConfirm?: (payload: { lines: PosCartLine[]; discount: number; total: number }) => void;
  /** Chek yaratish + qaytgan tovar kreditini yakunlash — oddiy sotuv oynasi bilan bir xil manba. */
  onFinalizeSale?: (payload: FinalizedSalePayload, items: ReceiptItem[]) => void;
  onOpenDebtPayment?: () => void;
  onOpenOnlineSales?: () => void;
  /** Tovar qaytarish/almashtirish yaratilganda — pendingReturn'ni tashqariga ko'taradi. */
  onExchangeCreated?: (pendingReturn: PendingReturnExchange) => void;
  pendingReturn?: PendingReturnExchange | null;
  onClearPendingReturn?: () => void;
};

function matchesQuery(product: Product, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return product.name.toLowerCase().includes(q) || product.barcode.toLowerCase().includes(q);
}

// Placeholder rasm SVG data URI sifatida generatsiya qilinadi — haqiqiy yuklangan
// rasmlar esa /products/... fayl yo'li bo'ladi. Shu farq bilan ularni ajratamiz.
function hasRealImage(product: Product) {
  return !!product.image && !product.image.startsWith("data:");
}

export function PosPage({
  products,
  onConfirm,
  onFinalizeSale,
  onOpenDebtPayment,
  onOpenOnlineSales,
  onExchangeCreated,
  pendingReturn,
  onClearPendingReturn,
}: Props) {
  const [query, setQuery] = React.useState("");
  const [finalizeOpen, setFinalizeOpen] = React.useState(false);
  const [oneTimeOpen, setOneTimeOpen] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const cart = usePosCart();

  const filteredProducts = React.useMemo(() => {
    const base = products.filter((product) => matchesQuery(product, query));
    // Haqiqiy rasmli mahsulotlar ro'yxat boshida ko'rinishi uchun oldinga chiqariladi.
    return [...base].sort((a, b) => Number(hasRealImage(b)) - Number(hasRealImage(a)));
  }, [products, query]);

  const quickProducts = React.useMemo(() => products.filter((p) => p.quick), [products]);
  const [quickCollapsed, setQuickCollapsed] = React.useState(false);
  const [quickHeight, setQuickHeight] = React.useState(QUICK_DEFAULT_HEIGHT);

  const cartQuantities = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of cart.activeCheck.lines) map[line.product.id] = line.quantity;
    return map;
  }, [cart.activeCheck]);

  const subtotal = cart.activeCheck.lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );
  const currentSaleTotal = Math.max(0, subtotal - cart.activeCheck.discount);
  const returnCredit = pendingReturn?.total ?? 0;
  const total = Math.max(0, currentSaleTotal - returnCredit);

  React.useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handlePick = (product: Product) => {
    const result = cart.addProduct(product);
    if (!result.ok) toast.error(result.reason);
  };

  const handleLineQuantityChange = (line: PosCartLine, quantity: number) => {
    const result = cart.setQuantity(line.product, quantity);
    if (!result.ok) toast.error(result.reason);
  };

  const handleSearchEnter = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const exactBarcode = products.find((product) => product.barcode.toLowerCase() === q);
    const match = exactBarcode ?? filteredProducts[0];
    if (!match) {
      toast.error("Tovar topilmadi");
      return;
    }
    handlePick(match);
    setQuery("");
  };

  const handleConfirm = () => {
    if (cart.activeCheck.lines.length === 0) return;
    setFinalizeOpen(true);
  };

  const handleFinalizeConfirm = (details: FinalizeSaleDetails) => {
    const lines = cart.activeCheck.lines;
    const items: ReceiptItem[] = lines.map((line) => ({
      productId: line.product.id,
      name: line.product.name,
      price: line.product.price,
      qty: line.quantity,
      unit: line.product.unit,
      source: line.product.customCode === "BIR-MARTALIK" ? "one-time" : "catalog",
    }));

    onFinalizeSale?.(
      { ...details, subtotal, discountAmount: cart.activeCheck.discount, total },
      items,
    );

    toast.success("Savdo muvaffaqiyatli yakunlandi", { description: formatSom(total) });
    onConfirm?.({ lines, discount: cart.activeCheck.discount, total });
    cart.clearCheck();
    setFinalizeOpen(false);
  };

  const handleAddOneTimeItem = (item: OneTimeItemInput) => {
    const product: Product = {
      id: `one-time-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    cart.addProduct(product);
    cart.setQuantity(product, item.quantity);
  };

  const handleSetDiscount = () => {
    const raw = window.prompt(
      "Chegirma summasi (so'mda):",
      String(cart.activeCheck.discount || ""),
    );
    if (raw === null) return;
    const parsed = Number.parseFloat(raw.replace(/\s/g, "").replace(",", "."));
    cart.setDiscount(Number.isFinite(parsed) ? Math.min(Math.max(0, parsed), subtotal) : 0);
  };

  // ── Global klaviatura yorliqlari ──────────────────────────────────────────
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Yakunlash popupi ochiq bo'lsa — u o'z Esc/Enter'ini boshqaradi.
      if (finalizeOpen) return;

      const target = event.target as HTMLElement | null;
      const inSearch = target === searchInputRef.current;

      if (event.key === "F2") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setQuery("");
        cart.clearCheck();
        return;
      }

      if (event.key === "Enter" && !inSearch) {
        const tag = target?.tagName;
        // Matn kiritish maydonlarida (chegirma, miqdor) Enter o'z vazifasini
        // bajarsin — faqat boshqa joyda savdoni yakunlaydi.
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        event.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.activeCheck, total, finalizeOpen]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F4F6FA]">
      <PosHeader />

      <div className="flex min-h-0 flex-1">
        {/* Chap ustun: qidiruv + tovarlar */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-shrink-0 space-y-2 border-b border-[#E2E7F0] bg-white p-3">
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {onOpenDebtPayment && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenDebtPayment}
                  className="h-8 gap-1.5 border-emerald-300 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700"
                >
                  <HandCoins className="h-3.5 w-3.5" />
                  Qarz so'ndirish
                </Button>
              )}
              {onOpenOnlineSales && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenOnlineSales}
                  className="h-8 gap-1.5 border-sky-300 bg-sky-50 px-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 hover:text-sky-700"
                >
                  <Wifi className="h-3.5 w-3.5" />
                  Online savdo
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReturnOpen(true)}
                className="h-8 gap-1.5 border-orange-300 bg-orange-50 px-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 hover:text-orange-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Tovar qaytarish
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOneTimeOpen(true)}
                className="h-8 gap-1.5 border-[#0836B0]/30 bg-[#0836B0]/5 px-2 text-xs font-semibold text-[#0836B0] hover:bg-[#0836B0]/10"
              >
                <PackagePlus className="h-3.5 w-3.5" />
                Bir martalik
              </Button>
            </div>
            <ProductSearch
              value={query}
              onChange={setQuery}
              onEnter={handleSearchEnter}
              inputRef={searchInputRef}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <ProductGrid
              products={filteredProducts}
              cartQuantities={cartQuantities}
              onPick={handlePick}
            />
          </div>

          {quickProducts.length > 0 && (
            <QuickItemsPanel
              products={quickProducts}
              collapsed={quickCollapsed}
              onToggleCollapsed={() => setQuickCollapsed((v) => !v)}
              height={quickHeight}
              onHeightChange={setQuickHeight}
              onPick={handlePick}
            />
          )}
        </div>

        {/* O'ng ustun: savatcha — 372px qat'iy */}
        <CartPanel
          checks={cart.checks}
          activeCheckId={cart.activeCheckId}
          activeCheck={cart.activeCheck}
          onSelectCheck={cart.setActiveCheck}
          onNewCheck={cart.newCheck}
          onCloseCheck={cart.closeCheck}
          onLineQuantityChange={handleLineQuantityChange}
          onRemoveLine={cart.removeLine}
          onSetDiscount={handleSetDiscount}
          onClearCheck={cart.clearCheck}
          onConfirm={handleConfirm}
          pendingReturn={pendingReturn}
          onClearPendingReturn={onClearPendingReturn}
        />
      </div>

      <OneTimeItemDialog
        open={oneTimeOpen}
        onOpenChange={setOneTimeOpen}
        onAdd={handleAddOneTimeItem}
      />

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="h-[94dvh] max-w-7xl overflow-hidden border-[#E2E7F0] bg-white p-0">
          <DialogHeader className="flex-row items-center gap-2 space-y-0 border-b border-[#E2E7F0] px-4 py-3">
            <RotateCcw className="h-4 w-4 text-[#0836B0]" />
            <DialogTitle className="text-sm font-semibold text-[#222C3B]">
              Tovar qaytarish
            </DialogTitle>
          </DialogHeader>
          <div className="h-[calc(94dvh-53px)] overflow-hidden bg-[#F4F6FA]">
            <TovarQaytarish
              exchangeShortcut
              onExchangeCreated={(nextReturn) => {
                onExchangeCreated?.(nextReturn);
                setReturnOpen(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <FinalizeSaleDialog
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        total={total}
        onConfirm={handleFinalizeConfirm}
      />
    </div>
  );
}
