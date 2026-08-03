import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product } from "@/lib/mock-data";
import { formatMoney, isProductAtLimit } from "@/lib/mock-data";
import { AlertTriangle } from "lucide-react";
import type { PriceMode } from "./types";

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: Product, quantity: number, priceMode: PriceMode) => void;
  currency?: string;
};

const WEIGHT_UNITS = new Set(["kg"]);

export function QuantityModal({ product, open, onOpenChange, onAdd, currency = "UZS" }: Props) {
  const [qty, setQty] = React.useState("1");
  const [boxMode, setBoxMode] = React.useState<"dona" | "karobka">("dona");
  const [amountMode, setAmountMode] = React.useState<"qty" | "amount">("qty");
  const [selectedPriceMode, setSelectedPriceMode] = React.useState<PriceMode>("retail");

  const hasBoxOption =
    !!product &&
    selectedPriceMode === "wholesale" &&
    product.unit === "dona" &&
    (product.perBox ?? 0) > 1;
  const isWeightUnit = !!product && WEIGHT_UNITS.has(product.unit);

  React.useEffect(() => {
    if (open && product) {
      setQty("1");
      setBoxMode("dona");
      setAmountMode("qty");
      setSelectedPriceMode("retail");
    }
  }, [open, product]);

  if (!product) return null;

  const price = salePrice(product, selectedPriceMode);
  const enteredValue = parseFloat(qty) || 0;

  const numQty = hasBoxOption
    ? boxMode === "karobka"
      ? enteredValue * (product.perBox ?? 1)
      : enteredValue
    : isWeightUnit && amountMode === "amount"
      ? price > 0
        ? enteredValue / price
        : 0
      : enteredValue;

  const totalPrice = numQty * price;
  const totalAvailable = product.vitrinaQty;
  const exceeds = numQty > totalAvailable;

  const handleAdd = () => {
    if (numQty > 0 && !exceeds) {
      onAdd(product, numQty, selectedPriceMode);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Narxi:</span>
            <span className="font-medium">
              {formatMoney(price, currency)} / {product.unit}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Vitrinada:</span>
            <span
              className={"font-semibold " + (product.vitrinaQty === 0 ? "text-destructive" : "")}
            >
              {product.vitrinaQty} {product.unit}
            </span>
          </div>
          {isProductAtLimit(product) && (
            <div className="mt-2 flex items-center justify-between rounded-md bg-amber-50 px-2 py-1 text-amber-700">
              <span className="inline-flex items-center gap-1 text-xs font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Limitga yetgan
              </span>
              <span className="text-xs font-bold">
                {product.minStockAlert} {product.unit}
              </span>
            </div>
          )}
        </div>

        <div>
          <Label className="mb-2 block">Narx turi</Label>
          <div className="grid grid-cols-2 gap-1.5 rounded-md bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setSelectedPriceMode("retail")}
              className={
                "rounded-sm px-2 py-1.5 text-sm font-semibold transition-colors " +
                (selectedPriceMode === "retail"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground")
              }
            >
              Oddiy narx
            </button>
            <button
              type="button"
              onClick={() => setSelectedPriceMode("wholesale")}
              className={
                "rounded-sm px-2 py-1.5 text-sm font-semibold transition-colors " +
                (selectedPriceMode === "wholesale"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground")
              }
            >
              Optom narx
            </button>
          </div>
        </div>

        {hasBoxOption && (
          <div className="grid grid-cols-2 gap-1.5 rounded-md bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => {
                setBoxMode("dona");
                setQty("1");
              }}
              className={
                "rounded-sm px-2 py-1.5 text-sm font-semibold transition-colors " +
                (boxMode === "dona" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")
              }
            >
              Dona
            </button>
            <button
              type="button"
              onClick={() => {
                setBoxMode("karobka");
                setQty("1");
              }}
              className={
                "rounded-sm px-2 py-1.5 text-sm font-semibold transition-colors " +
                (boxMode === "karobka" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")
              }
            >
              Karobka ({product.perBox} dona)
            </button>
          </div>
        )}

        {isWeightUnit && (
          <div className="grid grid-cols-2 gap-1.5 rounded-md bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => {
                setAmountMode("qty");
                setQty("1");
              }}
              className={
                "rounded-sm px-2 py-1.5 text-sm font-semibold transition-colors " +
                (amountMode === "qty" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")
              }
            >
              Miqdor ({product.unit})
            </button>
            <button
              type="button"
              onClick={() => {
                setAmountMode("amount");
                setQty("");
              }}
              className={
                "rounded-sm px-2 py-1.5 text-sm font-semibold transition-colors " +
                (amountMode === "amount"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground")
              }
            >
              Summasi (so'm)
            </button>
          </div>
        )}

        <div>
          <Label className="mb-2 block">
            {hasBoxOption
              ? boxMode === "karobka"
                ? "Nechta karobka"
                : "Umumiy soni (dona)"
              : isWeightUnit && amountMode === "amount"
                ? "Summasi (so'm)"
                : `Umumiy soni (${product.unit})`}
          </Label>
          <Input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            min={0}
            step="any"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          {hasBoxOption && boxMode === "karobka" && enteredValue > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">= {numQty} dona</p>
          )}
          {isWeightUnit && amountMode === "amount" && enteredValue > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              = {numQty.toFixed(3)} {product.unit}
            </p>
          )}
          {exceeds && (
            <p className="mt-1 text-xs font-medium text-destructive">
              Yetarli emas! Mavjud: {totalAvailable} {product.unit}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-2">
          <span className="text-sm text-muted-foreground">Jami:</span>
          <span className="text-lg font-bold text-primary">
            {formatMoney(totalPrice, currency)}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor
          </Button>
          <Button onClick={handleAdd} disabled={numQty <= 0 || exceeds}>
            Savatchaga qo'shish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
