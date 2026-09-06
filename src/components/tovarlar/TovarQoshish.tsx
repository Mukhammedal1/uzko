import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Barcode, ImagePlus, Layers, Pencil, Plus, Check, Trash2, X } from "lucide-react";
import { MOCK_PRODUCTS, MOCK_NEW_PRODUCT_LOG } from "@/lib/mock-data";
import type { Currency, Product, ProductVariant } from "@/lib/mock-data";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import type { ProductCreateMode } from "@/routes/tovarlar";
import { cn, formatNumberInput, parseNumberInput } from "@/lib/utils";
import { joinBarcodes, makeUniqueBarcode, splitBarcodes } from "@/lib/barcode-utils";

type NewVariantRow = {
  id: string;
  label: string;
  costCurrency: Currency;
  costPrice: string;
  wholesalePrice: string;
  price: string;
  barcode: string;
  image?: string;
};

type NewProductRow = {
  id: string;
  name: string;
  unit: string;
  costCurrency: Currency;
  costPrice: string;
  wholesalePrice: string;
  price: string;
  barcode: string;
  image?: string;
  variantsOpen: boolean;
  variants: NewVariantRow[];
};

const makeNewVariantRow = (): NewVariantRow => ({
  id: `variant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: "",
  costCurrency: "UZS",
  costPrice: "",
  wholesalePrice: "",
  price: "",
  barcode: "",
});

const makeNewProductRow = (unit = "dona"): NewProductRow => ({
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  unit,
  costCurrency: "UZS",
  costPrice: "",
  wholesalePrice: "",
  price: "",
  barcode: "",
  variantsOpen: false,
  variants: [],
});

function makeProductCode(name: string) {
  return (
    name
      .trim()
      .slice(0, 4)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "") + Math.floor(Math.random() * 99)
  );
}

/** "Yangi tovar qo'shish" — bazaga yangi mahsulot yozuvini (rasm bilan) yaratadi.
 * Ombordagi qoldiqni kiritish alohida "Tovar prixod qilish" bo'limida amalga oshiriladi. */
export function TovarQoshish({ onDone }: { mode: ProductCreateMode; onDone: () => void }) {
  const { settings } = useApp();
  const [rows, setRows] = React.useState<NewProductRow[]>(() => [
    makeNewProductRow(settings.units[0]?.name ?? "dona"),
  ]);
  const [showValidation, setShowValidation] = React.useState(false);

  const updateRow = (id: string, patch: Partial<NewProductRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    if (hasOpenVariantEditor) {
      toast.error("Avval boshlangan variantlarni yakunlang");
      return;
    }
    setRows((current) => [...current, makeNewProductRow(settings.units[0]?.name ?? "dona")]);
  };

  const removeRow = (id: string) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const collectUsedBarcodes = () => {
    const used = new Set<string>();
    MOCK_PRODUCTS.forEach((p) => {
      splitBarcodes(p.barcode).forEach((code) => used.add(code));
      p.variants?.forEach((v) => v.barcode && splitBarcodes(v.barcode).forEach((code) => used.add(code)));
    });
    rows.forEach((row) => {
      splitBarcodes(row.barcode).forEach((code) => used.add(code));
      row.variants.forEach((v) => splitBarcodes(v.barcode).forEach((code) => used.add(code)));
    });
    return used;
  };

  const assignBarcode = (id: string) => {
    const usedBarcodes = collectUsedBarcodes();
    const code = makeUniqueBarcode(usedBarcodes);
    updateRow(id, { barcode: code });
  };

  const handleImagePick = (id: string, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateRow(id, { image: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  const hasOpenVariantEditor = rows.some((row) => row.variantsOpen);

  const openVariants = (id: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              variantsOpen: true,
              variants: row.variants.length === 0 ? [makeNewVariantRow()] : row.variants,
            }
          : row,
      ),
    );
  };

  const finishVariants = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const validVariants = row.variants.filter((v) => v.label.trim());
    if (validVariants.length === 0) {
      toast.error("Kamida bitta variant nomini kiriting yoki bekor qiling");
      return;
    }
    setRows((current) =>
      current.map((r) => (r.id === id ? { ...r, variantsOpen: false, variants: validVariants } : r)),
    );
  };

  const cancelVariants = (id: string) => {
    setRows((current) =>
      current.map((r) => (r.id === id ? { ...r, variantsOpen: false, variants: [] } : r)),
    );
  };

  const addVariant = (rowId: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, variants: [...row.variants, makeNewVariantRow()] } : row,
      ),
    );
  };

  const removeVariant = (rowId: string, variantId: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? { ...row, variants: row.variants.filter((v) => v.id !== variantId) }
          : row,
      ),
    );
  };

  const updateVariant = (rowId: string, variantId: string, patch: Partial<NewVariantRow>) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              variants: row.variants.map((v) => (v.id === variantId ? { ...v, ...patch } : v)),
            }
          : row,
      ),
    );
  };

  const assignVariantBarcode = (rowId: string, variantId: string) => {
    const usedBarcodes = collectUsedBarcodes();
    const code = makeUniqueBarcode(usedBarcodes);
    updateVariant(rowId, variantId, { barcode: code });
  };

  const handleVariantImagePick = (rowId: string, variantId: string, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateVariant(rowId, variantId, { image: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  const validRows = rows
    .map((row) => {
      const variantsValue = row.variants.filter((v) => v.label.trim());
      const firstVariant = variantsValue[0];
      const rowCostNumber = Math.max(0, parseNumberInput(row.costPrice) || 0);
      const firstVariantCostNumber = firstVariant
        ? Math.max(0, parseNumberInput(firstVariant.costPrice) || 0)
        : 0;
      return {
        ...row,
        nameValue: row.name.trim(),
        unitValue: row.unit.trim() || settings.units[0]?.name || "dona",
        costCurrency: rowCostNumber > 0 || !firstVariant ? row.costCurrency : firstVariant.costCurrency,
        costNumber: rowCostNumber || firstVariantCostNumber,
        wholesaleNumber:
          Math.max(0, parseNumberInput(row.wholesalePrice) || 0) ||
          (firstVariant ? Math.max(0, parseNumberInput(firstVariant.wholesalePrice) || 0) : 0),
        priceNumber:
          Math.max(0, parseNumberInput(row.price) || 0) ||
          (firstVariant ? Math.max(0, parseNumberInput(firstVariant.price) || 0) : 0),
        barcodeValue: joinBarcodes(splitBarcodes(row.barcode)),
        variantsValue,
      };
    })
    .filter((row) => row.nameValue && (row.priceNumber > 0 || row.variantsValue.length > 0));

  const defaultWarehouse = settings.warehouses[0]?.name ?? "Asosiy ombor";

  const handleSubmit = () => {
    if (hasOpenVariantEditor) {
      toast.error("Avval boshlangan variantlarni yakunlang");
      return;
    }
    setShowValidation(true);
    if (validRows.length === 0) {
      toast.error("Kamida bitta mahsulot nomi va sotuv narxini kiriting");
      return;
    }

    const usedBarcodes = collectUsedBarcodes();
    const nextBarcode = (preferred: string) => {
      const code =
        preferred ||
        (() => {
          const generated = makeUniqueBarcode(usedBarcodes);
          return generated;
        })();
      usedBarcodes.add(code);
      return code;
    };

    validRows.forEach((row) => {
      const barcode = nextBarcode(row.barcodeValue);

      const variants: ProductVariant[] | undefined = row.variantsValue.length
        ? row.variantsValue.map((v) => {
            const vCost = parseNumberInput(v.costPrice) || 0;
            const vWholesale = parseNumberInput(v.wholesalePrice) || 0;
            const vPrice = parseNumberInput(v.price) || 0;
            return {
              id: `v${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              label: v.label.trim(),
              barcode: nextBarcode(joinBarcodes(splitBarcodes(v.barcode))),
              image: v.image,
              price: vPrice > 0 ? vPrice : undefined,
              wholesalePrice: vWholesale > 0 ? vWholesale : undefined,
              costPrice: vCost > 0 ? vCost : undefined,
              costCurrency: vCost > 0 ? v.costCurrency : undefined,
              vitrinaQty: 0,
              omborQty: 0,
            };
          })
        : undefined;

      const newProduct: Product = {
        id: `p${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: row.nameValue,
        image: row.image,
        price: row.priceNumber,
        wholesalePrice: row.wholesaleNumber || undefined,
        costPrice: row.costNumber,
        costCurrency: row.costCurrency,
        barcode,
        customCode: makeProductCode(row.nameValue),
        unit: row.unitValue,
        warehouse: defaultWarehouse,
        shelfLocation: "",
        vitrinaQty: 0,
        omborQty: 0,
        salesHistory: [],
        variants,
      };
      MOCK_PRODUCTS.push(newProduct);

      MOCK_NEW_PRODUCT_LOG.unshift({
        id: `npl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString(),
        addedBy: settings.username,
        productName: newProduct.name,
        unit: newProduct.unit,
        price: newProduct.price,
        costPrice: newProduct.costPrice,
        costCurrency: newProduct.costCurrency,
        wholesalePrice: newProduct.wholesalePrice,
        barcode: newProduct.barcode,
        image: newProduct.image,
      });
    });

    toast.success("Yangi mahsulot(lar) bazaga qo'shildi", {
      description: `${validRows.length} ta mahsulot — qoldiqni "Tovar prixod qilish" bo'limidan kiriting`,
    });
    onDone();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
          <div>
            <div className="text-sm font-semibold">Yangi tovar qo'shish</div>
            <div className="text-[11px] text-muted-foreground">
              Bazaga yangi mahsulot yozuvi yaratiladi. Qoldiqni "Tovar prixod qilish" orqali
              kiriting.
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={hasOpenVariantEditor}
            title={hasOpenVariantEditor ? "Avval boshlangan variantlarni yakunlang" : undefined}
            className="h-8 gap-2 text-xs"
          >
            <Check className="h-4 w-4" />
            Saqlash
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div className="space-y-5">
            {rows.map((row, index) => {
              const nameInvalid = showValidation && !row.name.trim();
              const usesVariants = row.variantsOpen || row.variants.length > 0;
              const priceInvalid =
                showValidation && !usesVariants && !(parseNumberInput(row.price) > 0);
              return (
                <div key={row.id} className="relative">
                  <div className="relative rounded-lg border bg-card p-3 shadow-sm transition-colors focus-within:border-primary/40">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 top-2 h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length <= 1}
                      title="Qatorni o'chirish"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>

                    <div className="mb-2.5 flex items-center gap-2 pr-8">
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "grid grid-cols-1 gap-4 pr-8",
                        usesVariants
                          ? "md:grid-cols-2 xl:grid-cols-[minmax(200px,1.5fr)_minmax(90px,0.6fr)]"
                          : "md:grid-cols-4 xl:grid-cols-[minmax(200px,1.5fr)_minmax(90px,0.6fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_minmax(150px,0.95fr)_minmax(110px,0.8fr)]",
                      )}
                    >
                      <Field label="Mahsulot nomi" required error={nameInvalid}>
                        <Input
                          value={row.name}
                          onChange={(e) => updateRow(row.id, { name: e.target.value })}
                          placeholder="Mahsulot nomini kiriting"
                          className={cn(
                            "h-9 text-xs",
                            nameInvalid && "border-destructive focus-visible:ring-destructive",
                          )}
                        />
                        {row.variants.length === 0 && !row.variantsOpen && (
                          <button
                            type="button"
                            onClick={() => openVariants(row.id)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                          >
                            <Layers className="h-3 w-3" />
                            Qo'shimcha variantlar (rang/razmer/hajm)
                          </button>
                        )}
                        {usesVariants && (
                          <p className="text-[10px] text-muted-foreground">
                            Narx, shtrix kod va rasm har bir variant uchun pastda kiritiladi
                          </p>
                        )}
                      </Field>

                      <Field label="Birlik">
                        <Select
                          value={row.unit || settings.units[0]?.name || "dona"}
                          onValueChange={(value) => updateRow(row.id, { unit: value })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {settings.units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.name}>
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      {!usesVariants && (
                        <>
                          <Field label="Tan narx">
                            <CurrencyField
                              value={row.costPrice}
                              onChange={(value) =>
                                updateRow(row.id, { costPrice: formatNumberInput(value) })
                              }
                              placeholder="0"
                              currency={row.costCurrency}
                              currencies={settings.currencies}
                              onCurrencyChange={(value) =>
                                updateRow(row.id, { costCurrency: value as Currency })
                              }
                            />
                          </Field>

                          <Field label="Optom narx">
                            <Input
                              value={row.wholesalePrice}
                              onChange={(e) =>
                                updateRow(row.id, {
                                  wholesalePrice: formatNumberInput(e.target.value),
                                })
                              }
                              placeholder="0"
                              className="h-9 text-right text-xs"
                              inputMode="decimal"
                            />
                          </Field>

                          <Field label="Sotuv narx" required error={priceInvalid}>
                            <Input
                              value={row.price}
                              onChange={(e) =>
                                updateRow(row.id, { price: formatNumberInput(e.target.value) })
                              }
                              placeholder="0"
                              className={cn(
                                "h-9 text-right text-xs",
                                priceInvalid && "border-destructive focus-visible:ring-destructive",
                              )}
                              inputMode="decimal"
                            />
                          </Field>

                          <Field label="Shtrix kod">
                            <div className="flex gap-1">
                              <Input
                                value={row.barcode}
                                onChange={(e) => updateRow(row.id, { barcode: e.target.value })}
                                placeholder="Shtrix kod"
                                className="h-9 min-w-0 text-xs"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 shrink-0"
                                onClick={() => assignBarcode(row.id)}
                                title="Avtomatik shtrix kod"
                              >
                                <Barcode className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </Field>

                          <Field label="Rasm">
                            <ImageUploadField
                              image={row.image}
                              onPick={(file) => handleImagePick(row.id, file)}
                              onClear={() => updateRow(row.id, { image: undefined })}
                            />
                          </Field>
                        </>
                      )}
                    </div>

                    {row.variantsOpen && (
                      <div className="mt-3 space-y-3 border-t pt-3">
                        {row.variants.map((variant, vIndex) => {
                          const labelInvalid = showValidation && !variant.label.trim();
                          const previewName =
                            (row.name.trim() || "Mahsulot") +
                            (variant.label.trim() ? ` — ${variant.label.trim()}` : "");
                          return (
                            <div key={variant.id} className="relative rounded-md border bg-muted/30 p-3">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="absolute right-1.5 top-1.5 h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeVariant(row.id, variant.id)}
                                title="Variantni o'chirish"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              <div className="mb-2 pr-7 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                Variant {vIndex + 1} — {previewName}
                              </div>
                              <div className="grid grid-cols-1 gap-3 pr-7 md:grid-cols-3 xl:grid-cols-6">
                                <Field label="Variant nomi" required error={labelInvalid}>
                                  <Input
                                    value={variant.label}
                                    onChange={(e) =>
                                      updateVariant(row.id, variant.id, { label: e.target.value })
                                    }
                                    placeholder='Masalan: "Oq"'
                                    className={cn(
                                      "h-9 text-xs",
                                      labelInvalid &&
                                        "border-destructive focus-visible:ring-destructive",
                                    )}
                                  />
                                </Field>

                                <Field label="Tan narx">
                                  <CurrencyField
                                    value={variant.costPrice}
                                    onChange={(value) =>
                                      updateVariant(row.id, variant.id, {
                                        costPrice: formatNumberInput(value),
                                      })
                                    }
                                    placeholder="0"
                                    currency={variant.costCurrency}
                                    currencies={settings.currencies}
                                    onCurrencyChange={(value) =>
                                      updateVariant(row.id, variant.id, {
                                        costCurrency: value as Currency,
                                      })
                                    }
                                  />
                                </Field>

                                <Field label="Optom narx">
                                  <Input
                                    value={variant.wholesalePrice}
                                    onChange={(e) =>
                                      updateVariant(row.id, variant.id, {
                                        wholesalePrice: formatNumberInput(e.target.value),
                                      })
                                    }
                                    placeholder="0"
                                    className="h-9 text-right text-xs"
                                    inputMode="decimal"
                                  />
                                </Field>

                                <Field label="Sotuv narx">
                                  <Input
                                    value={variant.price}
                                    onChange={(e) =>
                                      updateVariant(row.id, variant.id, {
                                        price: formatNumberInput(e.target.value),
                                      })
                                    }
                                    placeholder="0"
                                    className="h-9 text-right text-xs"
                                    inputMode="decimal"
                                  />
                                </Field>

                                <Field label="Shtrix kod">
                                  <div className="flex gap-1">
                                    <Input
                                      value={variant.barcode}
                                      onChange={(e) =>
                                        updateVariant(row.id, variant.id, { barcode: e.target.value })
                                      }
                                      placeholder="Shtrix kod"
                                      className="h-9 min-w-0 text-xs"
                                    />
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="h-9 w-9 shrink-0"
                                      onClick={() => assignVariantBarcode(row.id, variant.id)}
                                      title="Avtomatik shtrix kod"
                                    >
                                      <Barcode className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </Field>

                                <Field label="Rasm">
                                  <ImageUploadField
                                    image={variant.image}
                                    onPick={(file) => handleVariantImagePick(row.id, variant.id, file)}
                                    onClear={() =>
                                      updateVariant(row.id, variant.id, { image: undefined })
                                    }
                                  />
                                </Field>
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => addVariant(row.id)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Variant qo'shish
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => finishVariants(row.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Variantlarni yakunlash
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs text-muted-foreground"
                            onClick={() => cancelVariants(row.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                            Bekor qilish
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Variantlarni yakunlamaguncha boshqa tovar qo'sha olmaysiz.
                        </p>
                      </div>
                    )}

                    {!row.variantsOpen && row.variants.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          <Layers className="h-3 w-3" />
                          {row.variants.length} variant
                        </span>
                        {row.variants.map((v) => (
                          <span
                            key={v.id}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {v.label}
                          </span>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 gap-1 text-[10px]"
                          onClick={() => openVariants(row.id)}
                        >
                          <Pencil className="h-3 w-3" />
                          Tahrirlash
                        </Button>
                      </div>
                    )}
                  </div>

                  {index === rows.length - 1 && (
                    <Button
                      type="button"
                      size="icon"
                      disabled={hasOpenVariantEditor}
                      className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-blue-800 text-white shadow-md hover:bg-blue-900 disabled:opacity-40"
                      onClick={addRow}
                      title={
                        hasOpenVariantEditor
                          ? "Avval boshlangan variantlarni yakunlang"
                          : "Qator qo'shish"
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function ImageUploadField({
  image,
  onPick,
  onClear,
}: {
  image?: string;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (image) {
    return (
      <div className="relative h-9 w-9">
        <img src={image} alt="Mahsulot rasmi" className="h-9 w-9 rounded-md border object-cover" />
        <button
          type="button"
          onClick={onClear}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
          aria-label="Rasmni olib tashlash"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        className="h-9 w-9 p-0"
        onClick={() => inputRef.current?.click()}
        title="Rasm yuklash"
      >
        <ImagePlus className="h-4 w-4 text-muted-foreground" />
      </Button>
    </>
  );
}

function Field({
  label,
  children,
  required,
  error,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label
        className={cn(
          "flex items-center gap-0.5 text-xs font-medium",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {label}
        {required && (
          <span className={error ? "text-destructive" : "text-muted-foreground/60"}>*</span>
        )}
      </Label>
      {children}
      {error && <div className="text-[10px] font-medium text-destructive">Majburiy maydon</div>}
    </div>
  );
}

function CurrencyField({
  value,
  onChange,
  placeholder,
  currency,
  currencies,
  onCurrencyChange,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  currency: string;
  currencies: string[];
  onCurrencyChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pr-14 text-right text-xs"
        inputMode="decimal"
      />
      <Select value={currency} onValueChange={onCurrencyChange}>
        <SelectTrigger className="absolute right-0 top-0 h-9 w-14 cursor-pointer justify-center border-0 bg-transparent px-1.5 text-[10px] font-semibold uppercase text-muted-foreground shadow-none hover:text-primary focus:ring-0 focus:ring-offset-0 [&>span]:line-clamp-1 [&_svg]:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {currencies.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
