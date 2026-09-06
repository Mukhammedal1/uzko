import * as React from "react";
import { toast } from "sonner";
import { HandCoins, PackagePlus, RotateCcw, Wifi } from "lucide-react";
import { formatSom } from "@/lib/mock-data";
import type { Product, ReceiptItem } from "@/lib/mock-data";
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
import { QuantityKeypad } from "./QuantityKeypad";
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

const SEARCH_DEBOUNCE_MS = 220;

function parseQueryNumber(value: string) {
  const cleaned = value
    .trim()
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function matchesQuery(product: Product, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const numericQuery = parseQueryNumber(query);
  return (
    product.name.toLowerCase().includes(q) ||
    product.barcode.toLowerCase().includes(q) ||
    (numericQuery !== null && product.price === numericQuery)
  );
}

// Placeholder rasm SVG data URI sifatida generatsiya qilinadi — haqiqiy yuklangan
// rasmlar esa /products/... fayl yo'li bo'ladi. Shu farq bilan ularni ajratamiz.
function hasRealImage(product: Product) {
  return !!product.image && !product.image.startsWith("data:");
}

type KeypadState = { mode: "qty"; line: PosCartLine } | { mode: "discount" } | null;

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
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [finalizeOpen, setFinalizeOpen] = React.useState(false);
  const [oneTimeOpen, setOneTimeOpen] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [keypad, setKeypad] = React.useState<KeypadState>(null);
  const [previewProduct, setPreviewProduct] = React.useState<Product | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const cart = usePosCart();

  // Qidiruv so'rovi debounce bilan qo'llanadi — katta katalogda har harfda
  // qayta filtrlamaslik uchun.
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const isSearching = debouncedQuery.trim().length > 0;

  // Bo'sh qidiruvda — tezkor panel (admin belgilagan, barqaror tartibda).
  // Qidiruv bo'lsa — natijalar (haqiqiy rasmli tovarlar oldinda).
  const gridProducts = React.useMemo(() => {
    if (!isSearching) return products.filter((p) => p.quick);
    const matched = products.filter((product) => matchesQuery(product, debouncedQuery));
    return [...matched].sort((a, b) => Number(hasRealImage(b)) - Number(hasRealImage(a)));
  }, [products, debouncedQuery, isSearching]);

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

  // Qidiruvda aynan bitta mos tovar qolsa — Enter/"Qidirish" uni to'g'ridan-to'g'ri
  // savatchaga qo'shadi (shtrix kod skanerlash bilan bir xil tezkorlik).
  const handleSearchEnter = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const matched = products.filter((product) => matchesQuery(product, q));
    const exactBarcode = products.find((product) => product.barcode.toLowerCase() === q);
    const match = exactBarcode ?? (matched.length === 1 ? matched[0] : undefined);
    if (!match) {
      if (matched.length === 0) toast.error("Tovar topilmadi");
      return;
    }
    handlePick(match);
    setQuery("");
    setDebouncedQuery("");
  };

  // Qidiruvga faqat narx yozilib, ro'yxatdagidan qat'i nazar aynan shu narxda
  // "Yangi tovar" qo'shish kerak bo'lsa — Shift+Enter (tasodifan bir xil narxli
  // boshqa tovar bilan chalkashmasligi uchun oddiy Enter'dan alohida kombinatsiya).
  const handleAddNewPriceItem = () => {
    const numericQuery = parseQueryNumber(query);
    if (numericQuery === null || numericQuery <= 0) return;
    const product: Product = {
      id: `one-time-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: "Yangi tovar",
      price: numericQuery,
      costPrice: 0,
      costCurrency: "UZS",
      barcode: "",
      customCode: "BIR-MARTALIK",
      unit: "dona",
      warehouse: "Bir martalik",
      vitrinaQty: 9999,
      omborQty: 0,
    };
    cart.addProduct(product);
    toast.success("Yangi tovar qo'shildi", { description: formatSom(numericQuery) });
    setQuery("");
    setDebouncedQuery("");
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

  // ── Miqdor/chegirma raqamli klaviaturasi ──────────────────────────────────
  const handleKeypadConfirm = (value: number) => {
    if (keypad?.mode === "qty") {
      const result = cart.setQuantity(keypad.line.product, value);
      if (!result.ok) toast.error(result.reason);
    } else if (keypad?.mode === "discount") {
      cart.setDiscount(Math.min(Math.max(0, value), subtotal));
    }
    setKeypad(null);
  };

  // ── Klaviatura yorliqlari — ixtiyoriy tezlashtiruvchi, touch-only kassada shart emas ──
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (finalizeOpen || keypad) return;

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
        setDebouncedQuery("");
        return;
      }

      if (event.key === "Enter" && !inSearch) {
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        event.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.activeCheck, total, finalizeOpen, keypad]);

  return (
    <div className="flex h-full min-h-0 w-full select-none touch-manipulation flex-col overflow-hidden bg-[#F4F6FA]">
      <PosHeader />

      <div className="flex min-h-0 flex-1">
        {/* Chap ustun: qidiruv + tovarlar */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-shrink-0 space-y-2 border-b border-[#E2E7F0] bg-white p-3">
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {onOpenDebtPayment && (
                <button
                  type="button"
                  onClick={onOpenDebtPayment}
                  className="flex h-11 touch-manipulation items-center gap-1.5 rounded-[10px] border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"
                >
                  <HandCoins className="h-4 w-4" />
                  Qarz so'ndirish
                </button>
              )}
              {onOpenOnlineSales && (
                <button
                  type="button"
                  onClick={onOpenOnlineSales}
                  className="flex h-11 touch-manipulation items-center gap-1.5 rounded-[10px] border border-sky-300 bg-sky-50 px-3 text-xs font-semibold text-sky-700"
                >
                  <Wifi className="h-4 w-4" />
                  Online savdo
                </button>
              )}
              <button
                type="button"
                onClick={() => setReturnOpen(true)}
                className="flex h-11 touch-manipulation items-center gap-1.5 rounded-[10px] border border-orange-300 bg-orange-50 px-3 text-xs font-semibold text-orange-700"
              >
                <RotateCcw className="h-4 w-4" />
                Tovar qaytarish
              </button>
              <button
                type="button"
                onClick={() => setOneTimeOpen(true)}
                className="flex h-11 touch-manipulation items-center gap-1.5 rounded-[10px] border border-[#0836B0]/30 bg-[#0836B0]/5 px-3 text-xs font-semibold text-[#0836B0]"
              >
                <PackagePlus className="h-4 w-4" />
                Bir martalik
              </button>
            </div>
            <ProductSearch
              value={query}
              onChange={setQuery}
              onEnter={handleSearchEnter}
              onShiftEnter={handleAddNewPriceItem}
              inputRef={searchInputRef}
            />
          </div>

          <div className="min-h-0 flex-1 p-3">
            <ProductGrid
              products={gridProducts}
              cartQuantities={cartQuantities}
              onPick={handlePick}
              onPreview={setPreviewProduct}
              mode={isSearching ? "search" : "pinned"}
              query={debouncedQuery}
            />
          </div>
        </div>

        {/* O'ng ustun: savatcha — 388px qat'iy */}
        <CartPanel
          checks={cart.checks}
          activeCheckId={cart.activeCheckId}
          activeCheck={cart.activeCheck}
          onSelectCheck={cart.setActiveCheck}
          onNewCheck={cart.newCheck}
          onCloseCheck={cart.closeCheck}
          onLineQuantityChange={handleLineQuantityChange}
          onOpenQuantityKeypad={(line) => setKeypad({ mode: "qty", line })}
          onRemoveLine={cart.removeLine}
          onOpenDiscountKeypad={() => setKeypad({ mode: "discount" })}
          onClearCheck={cart.clearCheck}
          onConfirm={handleConfirm}
          pendingReturn={pendingReturn}
          onClearPendingReturn={onClearPendingReturn}
        />
      </div>

      <QuantityKeypad
        open={keypad !== null}
        mode={keypad?.mode ?? "qty"}
        initialValue={
          keypad?.mode === "qty" ? keypad.line.quantity : (cart.activeCheck.discount ?? 0)
        }
        max={keypad?.mode === "qty" ? keypad.line.product.vitrinaQty : undefined}
        unit={keypad?.mode === "qty" ? keypad.line.product.unit : undefined}
        onConfirm={handleKeypadConfirm}
        onClose={() => setKeypad(null)}
      />

      <Dialog open={!!previewProduct} onOpenChange={(open) => !open && setPreviewProduct(null)}>
        <DialogContent className="max-w-lg overflow-hidden border-[#E2E7F0] bg-white p-0">
          {previewProduct && (
            <div className="flex flex-col">
              <div className="flex aspect-square w-full items-center justify-center bg-[#F4F6FA]">
                {previewProduct.image ? (
                  <img
                    src={previewProduct.image}
                    alt={previewProduct.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-6xl font-bold text-[#737D91]">
                    {previewProduct.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="space-y-1 p-4">
                <div className="text-base font-semibold text-[#222C3B]">{previewProduct.name}</div>
                <div className="text-lg font-bold text-[#0836B0]">
                  {formatSom(previewProduct.price)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
