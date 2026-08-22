import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatSom } from "@/lib/mock-data";
import { useApp } from "@/lib/app-context";
import type { CartItem, Discount } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  discount: Discount;
  subtotal: number;
  discountAmount: number;
  total: number;
};

export function DemoReceiptDialog({
  open,
  onOpenChange,
  items,
  discount,
  subtotal,
  discountAmount,
  total,
}: Props) {
  const { settings } = useApp();
  const receipt = settings.receiptSettings;
  const widthClass = receipt.width === "58" ? "max-w-[280px]" : "max-w-sm";
  const fontSizeClass =
    receipt.fontSize === "small"
      ? "text-[10px]"
      : receipt.fontSize === "large"
        ? "text-sm"
        : "text-xs";
  const now = new Date();
  const dateStr = now.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={widthClass}>
        <DialogHeader className="print:hidden">
          <DialogTitle>Demo chek</DialogTitle>
        </DialogHeader>

        <div
          id="demo-receipt"
          className={`receipt-print rounded-md border bg-white p-4 font-mono text-black ${fontSizeClass}`}
        >
          <div className="text-center">
            {receipt.showLogo && (
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded bg-black/80 text-[9px] font-bold text-white">
                LOGO
              </div>
            )}
            <div className="text-sm font-bold">{receipt.storeName || "UZKO SAVDO"}</div>
            {receipt.showAddress && receipt.address && (
              <div className="mt-0.5 text-[10px]">{receipt.address}</div>
            )}
            {receipt.showPhone && receipt.phone && (
              <div className="mt-0.5 text-[10px]">Tel: {receipt.phone}</div>
            )}
            {receipt.social && <div className="text-[10px]">{receipt.social}</div>}
            {receipt.showCashier && (
              <div className="mt-0.5 text-[10px]">Kassir: {settings.username}</div>
            )}
            <div className="mt-0.5 text-[10px]">{dateStr}</div>
            <div className="my-2 border-b border-dashed border-black/40" />
            <div className="rounded border-2 border-black/60 py-1 text-[11px] font-bold tracking-wider">
              *** DEMO — TO'LANMAGAN ***
            </div>
            <div className="my-2 border-b border-dashed border-black/40" />
          </div>

          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-black/40">
                <th className="py-0.5 text-left font-bold">Mahsulot</th>
                <th className="py-0.5 text-right font-bold">Jami</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="align-top">
                  <td className="py-0.5">
                    <div>
                      {it.product.name}
                      {it.source === "one-time" ? " (bir martalik)" : ""}
                    </div>
                    {receipt.showProductCode && (
                      <div className="text-[10px]">
                        Kod: {it.product.customCode || it.product.barcode}
                      </div>
                    )}
                    <div className="text-[10px]">
                      {it.quantity} {it.product.unit} × {formatSom(salePrice(it.product))}
                    </div>
                    {it.note && <div className="text-[10px]">Izoh: {it.note}</div>}
                  </td>
                  <td className="py-0.5 text-right tabular-nums">
                    {formatSom(salePrice(it.product) * safeNumber(it.quantity))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="my-2 border-b border-dashed border-black/40" />

          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span>Oraliq:</span>
              <span className="tabular-nums">{formatSom(subtotal)}</span>
            </div>
            {discount.type !== "none" && (
              <div className="flex justify-between">
                <span>Skidka:</span>
                <span className="tabular-nums">−{formatSom(discountAmount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-black pt-1 text-sm font-bold">
              <span>JAMI:</span>
              <span className="tabular-nums">{formatSom(total)}</span>
            </div>
          </div>

          {receipt.showQr && (
            <div className="mt-2 flex justify-center text-[9px]">
              <div className="rounded border border-black/40 px-3 py-2 text-center">QR-kod</div>
            </div>
          )}

          <div className="my-2 border-b border-dashed border-black/40" />
          <div className="whitespace-pre-wrap text-center text-[10px]">
            {receipt.extraNote || "Bu chek faqat narxlarni solishtirish uchun."}
            <br />
            Hech qanday to'lov amalga oshirilmagan.
          </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Yopish
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Chop etish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function salePrice(product: unknown) {
  const record = product && typeof product === "object" ? (product as Record<string, unknown>) : {};
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
