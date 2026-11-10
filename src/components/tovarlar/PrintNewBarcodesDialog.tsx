import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Barcode, Printer } from "lucide-react";
import { formatNumberInput, parseNumberInput } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import {
  DEFAULT_PRINT_SETTINGS,
  printProductLabels,
  type PrintableProduct,
} from "@/lib/label-print";

export type PrintBarcodeItem = {
  key: string;
  product: PrintableProduct;
  qtyAdded: number;
  /** true — shtrix kodni tizim o'zi yaratgan (default: soniga mos); false — o'z (ishlab chiqaruvchi) shtrix kodi (default: 2 ta) */
  barcodeAuto: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PrintBarcodeItem[];
};

function defaultCopies(item: PrintBarcodeItem) {
  if (item.barcodeAuto) return String(Math.max(1, Math.round(item.qtyAdded)));
  return "2";
}

export function PrintNewBarcodesDialog({ open, onOpenChange, items }: Props) {
  const { settings } = useApp();
  const [copies, setCopies] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    setCopies((current) => {
      const next: Record<string, string> = {};
      items.forEach((item) => {
        next[item.key] = current[item.key] ?? defaultCopies(item);
      });
      return next;
    });
  }, [open, items]);

  const totalCopies = items.reduce(
    (sum, item) => sum + Math.max(0, parseNumberInput(copies[item.key] ?? "0") || 0),
    0,
  );

  const handlePrint = () => {
    const queue = items
      .map((item) => ({
        product: item.product,
        copies: Math.max(0, Math.round(parseNumberInput(copies[item.key] ?? "0") || 0)),
      }))
      .filter((row) => row.copies > 0);
    if (queue.length === 0) return;
    printProductLabels(queue, settings.labelPrintSettings ?? DEFAULT_PRINT_SETTINGS);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[110] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="h-4 w-4" />
            Shtrix kod chop etish
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {items.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Chop etish uchun tovar topilmadi
            </div>
          )}
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{item.product.name || "—"}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {item.qtyAdded} ta qo'shildi ·{" "}
                  {item.barcodeAuto ? "tizim shtrix kodi" : "o'z shtrix kodi"}
                </div>
              </div>
              <Input
                value={copies[item.key] ?? ""}
                onChange={(e) =>
                  setCopies((current) => ({
                    ...current,
                    [item.key]: formatNumberInput(e.target.value),
                  }))
                }
                inputMode="numeric"
                className="h-9 w-20 text-right text-sm"
              />
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">Jami: {totalCopies} ta yorliq</div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            onClick={handlePrint}
            disabled={totalCopies <= 0}
          >
            <Printer className="h-4 w-4" />
            Chop etish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
