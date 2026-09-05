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
import { Barcode, ImagePlus, Plus, Check, Trash2, X } from "lucide-react";
import { MOCK_PRODUCTS, MOCK_NEW_PRODUCT_LOG } from "@/lib/mock-data";
import type { Currency, Product } from "@/lib/mock-data";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import type { ProductCreateMode } from "@/routes/tovarlar";
import { cn, formatNumberInput, parseNumberInput } from "@/lib/utils";
import { joinBarcodes, makeUniqueBarcode, splitBarcodes } from "@/lib/barcode-utils";

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
};

const makeNewProductRow = (unit = "dona"): NewProductRow => ({
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  unit,
  costCurrency: "UZS",
  costPrice: "",
  wholesalePrice: "",
  price: "",
  barcode: "",
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
    setRows((current) => [...current, makeNewProductRow(settings.units[0]?.name ?? "dona")]);
  };

  const removeRow = (id: string) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const assignBarcode = (id: string) => {
    const usedBarcodes = new Set(MOCK_PRODUCTS.flatMap((p) => splitBarcodes(p.barcode)));
    rows.forEach((row) => splitBarcodes(row.barcode).forEach((code) => usedBarcodes.add(code)));
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

  const validRows = rows
    .map((row) => ({
      ...row,
      nameValue: row.name.trim(),
      unitValue: row.unit.trim() || settings.units[0]?.name || "dona",
      costNumber: Math.max(0, parseNumberInput(row.costPrice) || 0),
      wholesaleNumber: Math.max(0, parseNumberInput(row.wholesalePrice) || 0),
      priceNumber: Math.max(0, parseNumberInput(row.price) || 0),
      barcodeValue: joinBarcodes(splitBarcodes(row.barcode)),
    }))
    .filter((row) => row.nameValue && row.priceNumber > 0);

  const defaultWarehouse = settings.warehouses[0]?.name ?? "Asosiy ombor";

  const handleSubmit = () => {
    setShowValidation(true);
    if (validRows.length === 0) {
      toast.error("Kamida bitta mahsulot nomi va sotuv narxini kiriting");
      return;
    }

    const usedBarcodes = new Set(MOCK_PRODUCTS.flatMap((p) => splitBarcodes(p.barcode)));
    validRows.forEach((row) => {
      const barcode =
        row.barcodeValue ||
        (() => {
          const code = makeUniqueBarcode(usedBarcodes);
          usedBarcodes.add(code);
          return code;
        })();
      usedBarcodes.add(barcode);

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
          <Button onClick={handleSubmit} className="h-8 gap-2 text-xs">
            <Check className="h-4 w-4" />
            Saqlash
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div className="space-y-5">
            {rows.map((row, index) => {
              const nameInvalid = showValidation && !row.name.trim();
              const priceInvalid = showValidation && !(parseNumberInput(row.price) > 0);
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

                    <div className="grid grid-cols-1 gap-4 pr-8 md:grid-cols-4 xl:grid-cols-[minmax(200px,1.5fr)_minmax(90px,0.6fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_minmax(150px,0.95fr)_minmax(110px,0.8fr)]">
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
                            updateRow(row.id, { wholesalePrice: formatNumberInput(e.target.value) })
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
                    </div>
                  </div>

                  {index === rows.length - 1 && (
                    <Button
                      type="button"
                      size="icon"
                      className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-blue-800 text-white shadow-md hover:bg-blue-900"
                      onClick={addRow}
                      title="Qator qo'shish"
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
