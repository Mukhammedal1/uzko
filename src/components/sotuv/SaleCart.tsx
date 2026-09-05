import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatSom, formatMoney } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import type {
  CartItem,
  Discount,
  FinalizeSaleDetails,
  FinalizedSalePayload,
  OneTimeItemInput,
  PendingReturnExchange,
  PriceMode,
} from "./types";
import { DiscountDialog } from "./DiscountDialog";
import { FinalizeSaleDialog } from "./FinalizeSaleDialog";
import { DemoReceiptDialog } from "./DemoReceiptDialog";
import { OneTimeItemDialog } from "./OneTimeItemDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Tag,
  CheckCheck,
  X,
  ShoppingCart,
  Copy,
  Plus,
  Minus,
  Receipt,
  PackagePlus,
  RotateCcw,
  HandCoins,
  Wifi,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  items: CartItem[];
  discount: Discount;
  onChangeQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onSetDiscount: (d: Discount) => void;
  onFinalize: (payload: FinalizedSalePayload) => void;
  onAddOneTimeItem: (item: OneTimeItemInput) => void;
  onOpenDebtPayment?: () => void;
  onOpenOnlineSales?: () => void;
  onOpenReturn?: () => void;
  pendingReturn?: PendingReturnExchange | null;
  onClearPendingReturn?: () => void;
  onCopy?: (id: string) => void;
  priceMode?: PriceMode;
  onOpenPosUi?: () => void;
  currency?: string;
  currencies?: string[];
  onChangeCurrency?: (code: string) => void;
  onChangePriceMode?: (mode: PriceMode) => void;
};

export function SaleCart({
  items,
  discount,
  onChangeQty,
  onRemove,
  onSetDiscount,
  onFinalize,
  onAddOneTimeItem,
  onOpenDebtPayment,
  onOpenOnlineSales,
  onOpenReturn,
  pendingReturn,
  onClearPendingReturn,
  onCopy,
  priceMode = "retail",
  onOpenPosUi,
  currency = "UZS",
  currencies,
  onChangeCurrency,
  onChangePriceMode,
}: Props) {
  const [discountOpen, setDiscountOpen] = React.useState(false);
  const [finalizeOpen, setFinalizeOpen] = React.useState(false);
  const [demoOpen, setDemoOpen] = React.useState(false);
  const [oneTimeOpen, setOneTimeOpen] = React.useState(false);

  const lineTotal = (it: CartItem) =>
    salePrice(it.product, it.priceMode ?? priceMode) * safeNumber(it.quantity);
  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);

  const discountAmount =
    discount.type === "amount"
      ? Math.min(discount.value, subtotal)
      : discount.type === "percent"
        ? (subtotal * discount.value) / 100
        : 0;

  const currentSaleTotal = Math.max(0, subtotal - discountAmount);
  const returnCredit = pendingReturn?.total ?? 0;
  const total = Math.max(0, currentSaleTotal - returnCredit);
  const handleFinalize = (details: FinalizeSaleDetails) => {
    onFinalize({
      ...details,
      subtotal,
      discountAmount,
      total,
    });
    toast.success("Savdo muvaffaqiyatli yakunlandi", {
      description: `Jami: ${formatMoney(total, currency)}`,
    });
  };

  const handleCopy = (it: CartItem) => {
    if (onCopy) {
      onCopy(it.id);
    } else {
      onChangeQty(it.id, it.quantity + 1);
    }
    toast.success("Nusxa olindi", { description: it.product.name });
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Chap qism: Savatcha jadvali */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-11 flex-shrink-0 items-center justify-between gap-3 border-b bg-card px-3">
          <div className="flex min-w-0 items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">Savatcha</div>
              <div className="text-[11px] text-muted-foreground">{items.length} pozitsiya</div>
            </div>
            {onOpenPosUi && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenPosUi}
                className="ml-2 h-8 gap-1.5 border-primary/30 bg-primary/5 px-2 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                POS UI
              </Button>
            )}

            {onChangeCurrency && (
              <Select value={currency} onValueChange={onChangeCurrency}>
                <SelectTrigger className="h-8 w-[86px] px-2 text-[11px] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(currencies ?? [currency]).map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {onChangePriceMode && (
              <div className="flex h-8 items-center rounded-md border bg-muted/30 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={priceMode === "retail" ? "default" : "ghost"}
                  className="h-6 px-2 text-[11px]"
                  onClick={() => onChangePriceMode("retail")}
                >
                  Oddiy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={priceMode === "wholesale" ? "default" : "ghost"}
                  className="h-6 px-2 text-[11px]"
                  onClick={() => onChangePriceMode("wholesale")}
                >
                  Optom
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenDebtPayment && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenDebtPayment}
                className="h-8 gap-1.5 border-emerald-300 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700"
              >
                <HandCoins className="h-4 w-4" />
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
                <Wifi className="h-4 w-4" />
                Online savdo
              </Button>
            )}
            {onOpenReturn && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenReturn}
                className="h-8 gap-1.5 border-orange-300 bg-orange-50 px-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 hover:text-orange-700"
              >
                <RotateCcw className="h-4 w-4" />
                Tovar qaytarish
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOneTimeOpen(true)}
              className="h-8 gap-1.5 border-primary/30 bg-primary/5 px-2 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
            >
              <PackagePlus className="h-4 w-4" />
              Bir martalik
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <ShoppingCart className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Mahsulot tanlanmagan</p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              Pastdagi qidiruv orqali mahsulot qo'shing
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left font-semibold">Nomi</th>
                  <th className="px-3 py-2 text-right font-semibold">Narxi</th>
                  <th className="w-40 px-3 py-2 text-center font-semibold">Miqdor</th>
                  <th className="px-3 py-2 text-left font-semibold">Birlik</th>
                  <th className="px-3 py-2 text-right font-semibold">Jami</th>
                  <th className="w-24 px-3 py-2 text-center font-semibold">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b transition-colors hover:bg-muted/40">
                    <td className="px-3 py-1.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="truncate font-medium">{it.product.name}</div>
                        {it.source === "one-time" && (
                          <Badge variant="secondary" className="shrink-0 text-[9px]">
                            bir martalik
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {it.source === "one-time"
                          ? it.note || "Bazaga qo'shilmaydi"
                          : it.product.customCode}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatMoney(salePrice(it.product, it.priceMode ?? priceMode), currency)}
                      {it.priceMode === "wholesale" && (
                        <span className="ml-1 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-bold uppercase text-primary">
                          Optom
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => onChangeQty(it.id, Math.max(0, it.quantity - 1))}
                          disabled={it.quantity <= 0}
                          aria-label="Kamaytirish"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => onChangeQty(it.id, parseFloat(e.target.value) || 0)}
                          className="h-7 w-14 rounded border bg-background px-1 text-center text-xs tabular-nums"
                          min={0}
                          step="any"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => onChangeQty(it.id, it.quantity + 1)}
                          aria-label="Ko'paytirish"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{it.product.unit}</td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                      {formatMoney(lineTotal(it), currency)}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => handleCopy(it)}
                          aria-label="Nusxa olish"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onRemove(it.id)}
                          aria-label="O'chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* O'ng qism: Total panel */}
      <aside className="flex w-72 flex-shrink-0 flex-col overflow-hidden border-l bg-muted/20 p-2">
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border-2 border-primary/20 bg-card p-2.5 shadow-md">
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Oraliq summa:</span>
              <span
                key={`subtotal-${subtotal}`}
                data-no-translate
                className="font-medium tabular-nums"
              >
                {formatMoney(subtotal, currency)}
              </span>
            </div>

            {discount.type !== "none" && (
              <div className="flex items-center justify-between text-xs text-success">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {discount.type === "amount" && "Skidka"}
                  {discount.type === "percent" && `Skidka (${discount.value}%)`}
                  <button
                    onClick={() => onSetDiscount({ type: "none" })}
                    className="ml-0.5 rounded p-0.5 hover:bg-success/10"
                    aria-label="Skidkani olib tashlash"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
                <span
                  key={`discount-${discountAmount}`}
                  data-no-translate
                  className="font-medium tabular-nums"
                >
                  −{formatMoney(discountAmount, currency)}
                </span>
              </div>
            )}

            {pendingReturn && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-2 text-xs text-orange-700">
                <div className="flex items-center justify-between gap-2">
                  <span>Qaytgan mahsulot:</span>
                  <span className="font-bold tabular-nums">
                    {formatMoney(pendingReturn.total, currency)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span>Joriy savdo:</span>
                  <span className="font-bold tabular-nums">
                    {formatMoney(currentSaleTotal, currency)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="mt-1 flex items-center justify-between gap-2 text-success">
                    <span>Joriy skidka:</span>
                    <span className="font-bold tabular-nums">
                      -{formatMoney(discountAmount, currency)}
                    </span>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between gap-2 border-t border-orange-200 pt-1">
                  <span>Farqi:</span>
                  <span className="font-bold tabular-nums">{formatMoney(total, currency)}</span>
                </div>
                {onClearPendingReturn && (
                  <button
                    type="button"
                    onClick={onClearPendingReturn}
                    className="mt-1 text-[11px] font-semibold underline"
                  >
                    Qaytarishni bekor qilish
                  </button>
                )}
              </div>
            )}

            <div className="my-1 h-px bg-border" />

            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-muted-foreground">JAMI:</span>
              <div className="text-right">
                <span
                  key={`total-${total}`}
                  data-no-translate
                  className="text-lg font-bold tabular-nums text-primary"
                >
                  {formatMoney(total, currency)}
                </span>
                {currency !== "UZS" && (
                  <div
                    className="text-xs font-medium tabular-nums text-muted-foreground"
                    data-no-translate
                  >
                    {formatSom(total)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid flex-shrink-0 grid-cols-3 gap-1 pt-2">
            <Button
              variant="outline"
              onClick={() => setDiscountOpen(true)}
              disabled={items.length === 0}
              className="h-8 gap-1 px-1 text-xs"
              size="sm"
            >
              <Tag className="h-3.5 w-3.5" />
              Skidka
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDemoOpen(true)}
              disabled={items.length === 0}
              className="h-8 gap-1 px-1 text-xs"
              size="sm"
            >
              <Receipt className="h-3.5 w-3.5" />
              Demo
            </Button>
            <Button
              onClick={() => setFinalizeOpen(true)}
              disabled={items.length === 0}
              className="h-8 gap-1 px-1 text-xs"
              size="sm"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Yakun
            </Button>
          </div>
        </div>
      </aside>

      <DiscountDialog
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        subtotal={subtotal}
        current={discount}
        onApply={onSetDiscount}
      />
      <FinalizeSaleDialog
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        total={total}
        onConfirm={handleFinalize}
      />
      <OneTimeItemDialog
        open={oneTimeOpen}
        onOpenChange={setOneTimeOpen}
        onAdd={onAddOneTimeItem}
      />
      <DemoReceiptDialog
        open={demoOpen}
        onOpenChange={setDemoOpen}
        items={items}
        discount={discount}
        subtotal={subtotal}
        discountAmount={discountAmount}
        total={total}
      />
    </div>
  );
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
