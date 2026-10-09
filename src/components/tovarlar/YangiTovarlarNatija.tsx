import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Barcode, Check } from "lucide-react";
import { MOCK_RATES, costInSom, formatSom, priceInSom, type Product } from "@/lib/mock-data";
import type { PrintBarcodeItem } from "@/components/tovarlar/PrintNewBarcodesDialog";
import { YangiShtrixChop } from "@/components/tovarlar/YangiShtrixChop";

/** Mahsulot yoki uning variantlari bo'yicha tan narxlar (so'mda). */
function unitCostsInSom(product: Product): number[] {
  const variants = product.variants ?? [];
  if (variants.length === 0) return [costInSom(product)];
  return variants.map((v) =>
    v.costPrice !== undefined
      ? v.costPrice * (MOCK_RATES[v.costCurrency ?? "UZS"] ?? 1)
      : costInSom(product),
  );
}

/** Chop etish uchun: variantli mahsulot har bir variantiga alohida yorliq. */
function buildPrintItems(products: Product[]): PrintBarcodeItem[] {
  return products.flatMap((product) => {
    const variants = product.variants ?? [];
    const price = Math.round(priceInSom(product));
    const costPrice = Math.round(costInSom(product));
    if (variants.length === 0) {
      return [
        {
          key: product.id,
          product: {
            name: product.name,
            barcode: product.barcode,
            customCode: product.customCode,
            price,
            costPrice,
            shelfLocation: product.shelfLocation ?? "",
          },
          qtyAdded: 1,
          barcodeAuto: true,
          subtitle: "yangi tovar",
          copies: 1,
        },
      ];
    }
    return variants
      .filter((v) => v.barcode)
      .map((v) => ({
        key: `${product.id}-${v.id}`,
        product: {
          name: `${product.name} — ${v.label}`,
          barcode: v.barcode ?? "",
          customCode: v.customCode ?? "",
          price:
            v.price !== undefined
              ? Math.round(v.price * (MOCK_RATES[v.priceCurrency ?? "UZS"] ?? 1))
              : price,
          costPrice:
            v.costPrice !== undefined
              ? Math.round(v.costPrice * (MOCK_RATES[v.costCurrency ?? "UZS"] ?? 1))
              : costPrice,
          shelfLocation: product.shelfLocation ?? "",
        },
        qtyAdded: 1,
        barcodeAuto: true,
        subtitle: "variant",
        copies: 1,
      }));
  });
}

type Props = {
  open: boolean;
  products: Product[];
  onClose: () => void;
};

/** Yangi tovar(lar) saqlangandan keyin chiqadigan popup. Shtrix kod tugmasi shu oynaning
 * ichida tanlash ro'yxatini ochadi (ikkinchi popup yo'q). */
export function YangiTovarlarNatija({ open, products, onClose }: Props) {
  const [mode, setMode] = React.useState<"summary" | "print">("summary");

  React.useEffect(() => {
    if (!open) setMode("summary");
  }, [open]);

  const productCount = products.length;
  const variantCount = products.reduce((sum, p) => sum + (p.variants?.length ?? 0), 0);
  const costTotal = products.reduce(
    (sum, p) => sum + unitCostsInSom(p).reduce((acc, value) => acc + value, 0),
    0,
  );
  const printItems = React.useMemo(() => buildPrintItems(products), [products]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={mode === "print" ? "max-w-lg" : "max-w-md"}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-4 w-4" />
          </span>
          <div>
            <DialogTitle className="text-base font-semibold">Yangi tovarlar qo'shildi</DialogTitle>
            <div className="text-xs text-muted-foreground">
              Qoldiqni "Tovar prixod qilish" bo'limidan kiriting.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Qo'shilgan tovar" value={String(productCount)} />
          <StatCard label="Variantlar" value={String(variantCount)} />
          <StatCard label="Tan narx jami" value={formatSom(costTotal)} />
        </div>

        {mode === "summary" ? (
          <>
            <Button
              variant="outline"
              className="h-10 w-full gap-2"
              onClick={() => setMode("print")}
              disabled={printItems.length === 0}
            >
              <Barcode className="h-4 w-4" />
              Shtrix kod chop etish
            </Button>

            <div className="flex justify-end">
              <Button variant="outline" className="h-9" onClick={onClose}>
                Yopish
              </Button>
            </div>
          </>
        ) : (
          <YangiShtrixChop
            items={printItems}
            onCancel={() => setMode("summary")}
            onPrinted={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-lg font-bold leading-tight">{value}</div>
    </div>
  );
}
