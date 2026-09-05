import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, History, PackageCheck, PackagePlus } from "lucide-react";
import { MOCK_PRODUCTS, getAgentsList } from "@/lib/mock-data";
import type { Currency } from "@/lib/mock-data";
import { recordProductAddition } from "@/lib/data-actions";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import { cn, formatNumberInput, parseNumberInput } from "@/lib/utils";
import { AddedTable, AddedEditLogTable } from "./TovarlarTarixi";

type FormState = {
  productId: string;
  costCurrency: Currency;
  costPrice: string;
  wholesalePrice: string;
  price: string;
  agentId: string;
  warehouse: string;
  shelfLocation: string;
};

function makeEmptyForm(defaultWarehouse: string): FormState {
  return {
    productId: "",
    costCurrency: "UZS",
    costPrice: "",
    wholesalePrice: "",
    price: "",
    agentId: "",
    warehouse: defaultWarehouse,
    shelfLocation: "",
  };
}

/** "Tovar prixod qilish" — bazadagi mavjud mahsulotga narx, taminotchi, ombor
 * va polka joyini belgilaydi (tovar qabul qilinganda). */
export function TovarPrixod() {
  const { settings } = useApp();
  const defaultWarehouse = settings.warehouses[0]?.name ?? "Asosiy ombor";
  const agents = getAgentsList();
  const [tab, setTab] = React.useState<"form" | "tarix" | "tahrir">("form");
  const [form, setForm] = React.useState<FormState>(() => makeEmptyForm(defaultWarehouse));
  const [showValidation, setShowValidation] = React.useState(false);

  const product = MOCK_PRODUCTS.find((p) => p.id === form.productId);
  const agent = agents.find((a) => a.id === form.agentId);

  // Mahsulot tanlanganda joriy narxlari maydonlarga (tahrirlanadigan holda)
  // avtomatik to'ldiriladi — narxlar o'zgargan bo'lishi mumkin, shu yerdan yangilanadi.
  React.useEffect(() => {
    if (!product) return;
    setForm((s) => ({
      ...s,
      costCurrency: product.costCurrency,
      costPrice: formatNumberInput(String(product.costPrice)),
      wholesalePrice: product.wholesalePrice
        ? formatNumberInput(String(product.wholesalePrice))
        : "",
      price: formatNumberInput(String(product.price)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.productId]);

  const productInvalid = showValidation && !form.productId;
  const priceInvalid = showValidation && !(parseNumberInput(form.price) > 0);

  const handleSubmit = () => {
    setShowValidation(true);
    if (!product) {
      toast.error("Mahsulotni tanlang");
      return;
    }
    const priceNumber = Math.max(0, parseNumberInput(form.price) || 0);
    if (priceNumber <= 0) {
      toast.error("Sotuv narxini kiriting");
      return;
    }

    const costNumber = Math.max(0, parseNumberInput(form.costPrice) || 0);
    const wholesaleNumber = Math.max(0, parseNumberInput(form.wholesalePrice) || 0);

    product.costPrice = costNumber || product.costPrice;
    product.costCurrency = form.costCurrency;
    product.price = priceNumber;
    if (wholesaleNumber > 0) product.wholesalePrice = wholesaleNumber;
    product.warehouse = form.warehouse || defaultWarehouse;
    product.shelfLocation = form.shelfLocation || undefined;

    recordProductAddition({
      productName: product.name,
      qty: 0,
      unit: product.unit,
      price: product.price,
      costPrice: product.costPrice,
      warehouse: product.warehouse,
      shelfLocation: product.shelfLocation,
      addedBy: settings.username,
      source: agent
        ? {
            enabled: true,
            agentId: agent.id,
            agentName: agent.name,
            agentPhone: agent.phone,
            paidAmount: "0",
            note: "",
            sendBotUpdate: false,
          }
        : undefined,
    });

    toast.success("Tovar prixod qilindi", {
      description: `${product.name}${agent ? ` · ${agent.name}` : ""}`,
    });
    setForm(makeEmptyForm(defaultWarehouse));
    setShowValidation(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={tab === "form" ? "default" : "outline"}
              onClick={() => setTab("form")}
              className="gap-2"
            >
              <PackagePlus className="h-4 w-4" />
              Tovar prixod qilish
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "tarix" ? "default" : "outline"}
              onClick={() => setTab("tarix")}
              className="gap-2"
            >
              <PackageCheck className="h-4 w-4" />
              Prixodlar tarixi
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "tahrir" ? "default" : "outline"}
              onClick={() => setTab("tahrir")}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              Prixod tarixini tahrirlash
            </Button>
          </div>
          {tab === "form" && (
            <Button onClick={handleSubmit} className="h-8 gap-2 text-xs">
              <Check className="h-4 w-4" />
              Saqlash
            </Button>
          )}
        </div>

        {tab === "tarix" ? (
          <div className="min-h-0 flex-1 overflow-auto">
            <AddedTable />
          </div>
        ) : tab === "tahrir" ? (
          <div className="min-h-0 flex-1 overflow-auto">
            <AddedEditLogTable />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <div className="relative rounded-lg border bg-card p-3 shadow-sm transition-colors focus-within:border-primary/40">
              <div className="mb-2.5 flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground">
                  Prixod ma'lumotlari
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-[minmax(200px,1.6fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_minmax(160px,1fr)_minmax(140px,0.9fr)_minmax(110px,0.8fr)]">
                <Field label="Mahsulot nomi" required error={productInvalid}>
                  <Select
                    value={form.productId || "__none__"}
                    onValueChange={(value) => setForm((s) => ({ ...s, productId: value }))}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-9 text-sm",
                        productInvalid && "border-destructive focus-visible:ring-destructive",
                      )}
                    >
                      <SelectValue placeholder="Mahsulotni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_PRODUCTS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} · {p.customCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Tan narx">
                  <CurrencyField
                    value={form.costPrice}
                    onChange={(value) =>
                      setForm((s) => ({ ...s, costPrice: formatNumberInput(value) }))
                    }
                    placeholder="0"
                    currency={form.costCurrency}
                    currencies={settings.currencies}
                    onCurrencyChange={(value) =>
                      setForm((s) => ({ ...s, costCurrency: value as Currency }))
                    }
                  />
                </Field>

                <Field label="Optom narx">
                  <Input
                    value={form.wholesalePrice}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        wholesalePrice: formatNumberInput(e.target.value),
                      }))
                    }
                    placeholder="0"
                    className="h-9 text-right text-sm"
                    inputMode="decimal"
                  />
                </Field>

                <Field label="Sotuv narx" required error={priceInvalid}>
                  <Input
                    value={form.price}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, price: formatNumberInput(e.target.value) }))
                    }
                    placeholder="0"
                    className={cn(
                      "h-9 text-right text-sm",
                      priceInvalid && "border-destructive focus-visible:ring-destructive",
                    )}
                    inputMode="decimal"
                  />
                </Field>

                <Field label="Taminotchi">
                  <Select
                    value={form.agentId || "__none__"}
                    onValueChange={(value) =>
                      setForm((s) => ({ ...s, agentId: value === "__none__" ? "" : value }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Taminotchini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Tanlanmagan</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Ombor">
                  <Select
                    value={form.warehouse || defaultWarehouse}
                    onValueChange={(value) => setForm((s) => ({ ...s, warehouse: value }))}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.name}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Polka raqami">
                  <Select
                    value={form.shelfLocation || "__empty__"}
                    onValueChange={(value) =>
                      setForm((s) => ({
                        ...s,
                        shelfLocation: value === "__empty__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty__">Tanlanmagan</SelectItem>
                      {settings.shelfLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.name}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
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
        className="h-9 pr-14 text-right text-sm"
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
