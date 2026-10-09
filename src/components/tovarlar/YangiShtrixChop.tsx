import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Printer } from "lucide-react";
import { formatNumberInput, parseNumberInput } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { DEFAULT_PRINT_SETTINGS, printProductLabels } from "@/lib/label-print";
import type { PrintBarcodeItem } from "@/components/tovarlar/PrintNewBarcodesDialog";

type Props = {
  items: PrintBarcodeItem[];
  /** Ro'yxatni yopish (bekor qilish) */
  onCancel: () => void;
  /** Chop etilgandan keyin oynani yopish */
  onPrinted: () => void;
};

/** Joriy qo'shilgan tovarlardan istalganini tanlab, har biriga istalgan nusxada shtrix kod chop etish.
 * Natija oynasining ichida pastda ochiladi. */
export function YangiShtrixChop({ items, onCancel, onPrinted }: Props) {
  const { settings } = useApp();
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [copies, setCopies] = React.useState<Record<string, string>>({});
  const [bulkCopies, setBulkCopies] = React.useState("1");

  React.useEffect(() => {
    setSelected(Object.fromEntries(items.map((item) => [item.key, true])));
    setCopies(Object.fromEntries(items.map((item) => [item.key, String(item.copies ?? 1)])));
    setBulkCopies("1");
  }, [items]);

  const selectedItems = items.filter((item) => selected[item.key]);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const copiesOf = (key: string) =>
    Math.max(0, Math.round(parseNumberInput(copies[key] ?? "0") || 0));

  const totalLabels = selectedItems.reduce((sum, item) => sum + copiesOf(item.key), 0);

  const toggleAll = (checked: boolean) => {
    setSelected(Object.fromEntries(items.map((item) => [item.key, checked])));
  };

  const applyBulk = () => {
    const value = Math.max(1, Math.round(parseNumberInput(bulkCopies) || 1));
    setCopies((current) => {
      const next = { ...current };
      selectedItems.forEach((item) => {
        next[item.key] = String(value);
      });
      return next;
    });
  };

  const handlePrint = () => {
    const queue = selectedItems
      .map((item) => ({ product: item.product, copies: copiesOf(item.key) }))
      .filter((row) => row.copies > 0);
    if (queue.length === 0) return;
    printProductLabels(queue, settings.labelPrintSettings ?? DEFAULT_PRINT_SETTINGS);
    onPrinted();
  };

  return (
    <div className="flex flex-col gap-3 border-t pt-4">

        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(v === true)} />
            Hammasini tanlash
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={bulkCopies}
              onChange={(e) => setBulkCopies(formatNumberInput(e.target.value))}
              inputMode="numeric"
              className="h-8 w-16 text-right text-xs"
            />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={applyBulk}>
              Tanlanganlarga qo'llash
            </Button>
          </div>
        </div>

        <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <Checkbox
                  checked={!!selected[item.key]}
                  onCheckedChange={(v) =>
                    setSelected((current) => ({ ...current, [item.key]: v === true }))
                  }
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.product.name || "—"}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    {item.product.barcode}
                  </div>
                </div>
              </label>
              <Input
                value={copies[item.key] ?? ""}
                onChange={(e) =>
                  setCopies((current) => ({
                    ...current,
                    [item.key]: formatNumberInput(e.target.value),
                  }))
                }
                disabled={!selected[item.key]}
                inputMode="numeric"
                className="h-9 w-20 text-right text-sm"
              />
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          {selectedItems.length} ta tovar tanlangan · Jami: {totalLabels} ta yorliq
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Bekor qilish
          </Button>
          <Button
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            onClick={handlePrint}
            disabled={totalLabels <= 0}
          >
            <Printer className="h-4 w-4" />
            Chop etish
          </Button>
        </div>
    </div>
  );
}
