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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  CalendarDays,
  Check,
  CreditCard,
  HandCoins,
  History,
  Landmark,
  PackageCheck,
  PackagePlus,
  Wallet,
} from "lucide-react";
import {
  MOCK_PAYMENT_METHODS,
  MOCK_PRODUCTS,
  MOCK_RATES,
  MOCK_WITHDRAWALS,
  formatMoney,
  getAgentsList,
} from "@/lib/mock-data";
import type { Currency, PaymentKind, PaymentMethod, Product } from "@/lib/mock-data";
import { recordProductAddition } from "@/lib/data-actions";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import { cn, formatNumberInput, parseNumberInput } from "@/lib/utils";
import { AddedTable, AddedEditLogTable } from "./TovarlarTarixi";

const PAYMENT_KIND_ICON: Record<PaymentKind, typeof Wallet> = {
  cash: Wallet,
  card: CreditCard,
  currency: Landmark,
  transfer: Building2,
  wallet: HandCoins,
};

const PRIXOD_PAYMENT_METHODS = [...MOCK_PAYMENT_METHODS].sort((a, b) => a.sortOrder - b.sortOrder);

type FormState = {
  productId: string;
  qty: string;
  costCurrency: Currency;
  costPrice: string;
  wholesalePrice: string;
  price: string;
  minStockAlert: string;
  agentId: string;
  warehouse: string;
  shelfLocation: string;
};

function makeEmptyForm(): FormState {
  return {
    productId: "",
    qty: "",
    costCurrency: "UZS",
    costPrice: "",
    wholesalePrice: "",
    price: "",
    minStockAlert: "",
    agentId: "",
    warehouse: "",
    shelfLocation: "",
  };
}

/** "Tovar prixod qilish" — bazadagi mavjud mahsulotga narx, taminotchi, ombor
 * va polka joyini belgilaydi (tovar qabul qilinganda). */
export function TovarPrixod() {
  const { settings } = useApp();
  const defaultWarehouse = settings.warehouses[0]?.name ?? "Asosiy ombor";
  const agents = getAgentsList();
  const [tab, setTab] = React.useState<"bugun" | "tahrir">("bugun");
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(() => makeEmptyForm());
  const [showValidation, setShowValidation] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [paymentPaidAmount, setPaymentPaidAmount] = React.useState("");
  const [paymentMethodId, setPaymentMethodId] = React.useState<string>("cash");
  const [paymentOutflowSource, setPaymentOutflowSource] = React.useState<"kassa" | "other">(
    "kassa",
  );
  const [paymentNote, setPaymentNote] = React.useState("");

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
      minStockAlert:
        typeof product.minStockAlert === "number"
          ? formatNumberInput(String(product.minStockAlert))
          : "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.productId]);

  const productInvalid = showValidation && !form.productId;
  const qtyInvalid = showValidation && !(parseNumberInput(form.qty) > 0);
  const priceInvalid = showValidation && !(parseNumberInput(form.price) > 0);
  const agentInvalid = showValidation && !agent;

  const qtyForDialog = Math.max(0, parseNumberInput(form.qty) || 0);
  const totalCostForDialog = product
    ? qtyForDialog * (Math.max(0, parseNumberInput(form.costPrice) || 0) || product.costPrice)
    : 0;

  const paymentPaidNumber = Math.max(0, parseNumberInput(paymentPaidAmount) || 0);
  const paymentRemaining = Math.max(0, totalCostForDialog - paymentPaidNumber);
  const paymentMethodInvalid = showValidation && paymentPaidNumber > 0 && !paymentMethodId;
  const selectedPaymentMethod = PRIXOD_PAYMENT_METHODS.find((m) => m.id === paymentMethodId);
  // Bank orqali o'tkazmadan boshqa hamma usulda — chiqim kassadanmi yoki
  // boshqa manbadanmi so'raladi (o'tkazma kassaga umuman tegmaydi).
  const askOutflowSource = paymentPaidNumber > 0 && selectedPaymentMethod?.kind !== "transfer";

  /** Prixodni yakuniy saqlaydi. `payment` — agent bo'lsa, popupda tanlangan to'lov holati. */
  const finalizeProductAddition = (
    payment: { method: PaymentMethod; paidAmount: number; fromKassa: boolean } | null,
  ) => {
    if (!product) return;
    const qtyNumber = Math.max(0, parseNumberInput(form.qty) || 0);
    const priceNumber = Math.max(0, parseNumberInput(form.price) || 0);
    const costNumber = Math.max(0, parseNumberInput(form.costPrice) || 0);
    const wholesaleNumber = Math.max(0, parseNumberInput(form.wholesalePrice) || 0);

    product.costPrice = costNumber || product.costPrice;
    product.costCurrency = form.costCurrency;
    product.price = priceNumber;
    if (wholesaleNumber > 0) product.wholesalePrice = wholesaleNumber;
    product.warehouse = form.warehouse || defaultWarehouse;
    product.shelfLocation = form.shelfLocation || undefined;
    product.omborQty = (product.omborQty || 0) + qtyNumber;
    product.minStockAlert = form.minStockAlert.trim()
      ? Math.max(0, parseNumberInput(form.minStockAlert) || 0)
      : undefined;

    const totalCost = qtyNumber * product.costPrice;
    const paidAmount = payment ? Math.max(0, Math.min(totalCost, payment.paidAmount)) : 0;

    const { invoiceNumber } = recordProductAddition({
      productName: product.name,
      qty: qtyNumber,
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
            paidAmount: String(paidAmount),
            note: payment
              ? `${payment.method.name} orqali to'landi (${payment.method.kind === "transfer" ? "o'tkazma" : payment.fromKassa ? "kassadan" : "boshqa manbadan"})${paymentNote.trim() ? ` · ${paymentNote.trim()}` : ""}`
              : paymentNote.trim(),
            sendBotUpdate: false,
          }
        : undefined,
    });

    // Kassadan chiqim faqat foydalanuvchi "Kassadan" deb tanlaganda yoziladi
    // (o'tkazmadan boshqa har bir usulda shu savol so'raladi — bekor qilinsa
    // yoki "Boshqa manbadan" tanlansa, kassaga tegilmaydi).
    if (agent && payment && paidAmount > 0 && payment.fromKassa) {
      const rate = MOCK_RATES[product.costCurrency] ?? 1;
      const kind = payment.method.kind;
      MOCK_WITHDRAWALS.push({
        id: `CH-prixod-${Date.now()}`,
        date: new Date().toISOString(),
        cashier: settings.username,
        category: "Agentlarga to'lov",
        cash: kind === "cash" ? Math.round(paidAmount * rate) : 0,
        cardAmount: kind === "card" ? Math.round(paidAmount * rate) : 0,
        currencies: kind === "currency" ? [{ code: product.costCurrency, amount: paidAmount }] : [],
        note: `Tovar prixodi uchun to'lov (${payment.method.name}) · ${product.name}`,
        agentId: agent.id,
      });
    }

    const remaining = Math.max(0, totalCost - paidAmount);
    toast.success(`Tovar prixod qilindi · ${invoiceNumber}`, {
      description: agent
        ? remaining > 0
          ? `${product.name} · ${agent.name} · qarz: ${formatMoney(remaining, product.costCurrency)}`
          : `${product.name} · ${agent.name} · to'liq to'landi`
        : product.name,
    });

    setForm(makeEmptyForm());
    setShowValidation(false);
    setPaymentOpen(false);
    setFormOpen(false);
  };

  const openForm = () => {
    setForm(makeEmptyForm());
    setShowValidation(false);
    setFormOpen(true);
  };

  const handleSubmit = () => {
    setShowValidation(true);
    if (!product) {
      toast.error("Mahsulotni tanlang");
      return;
    }
    const qtyNumber = Math.max(0, parseNumberInput(form.qty) || 0);
    if (qtyNumber <= 0) {
      toast.error("Miqdorni kiriting");
      return;
    }
    const priceNumber = Math.max(0, parseNumberInput(form.price) || 0);
    if (priceNumber <= 0) {
      toast.error("Sotuv narxini kiriting");
      return;
    }
    if (!agent) {
      toast.error("Taminotchini tanlang");
      return;
    }

    // Taminotchi tanlangan — to'lov holatini popupda so'raymiz, saqlash shu yerda to'xtaydi.
    setPaymentPaidAmount("0");
    setPaymentMethodId("cash");
    setPaymentOutflowSource("kassa");
    setPaymentNote("");
    setPaymentOpen(true);
  };

  const handlePaymentConfirm = () => {
    if (paymentPaidNumber <= 0) {
      finalizeProductAddition(null);
      return;
    }
    const method = PRIXOD_PAYMENT_METHODS.find((m) => m.id === paymentMethodId);
    if (!method) {
      setShowValidation(true);
      toast.error("To'lov usulini tanlang");
      return;
    }
    finalizeProductAddition({
      method,
      paidAmount: paymentPaidNumber,
      fromKassa: method.kind === "transfer" ? false : paymentOutflowSource === "kassa",
    });
  };

  if (formOpen) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <section className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-primary" />
              <div className="text-sm font-semibold">Tovar prixod qilish</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setFormOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button onClick={handleSubmit} className="h-8 gap-2 text-xs">
                <Check className="h-4 w-4" />
                Saqlash
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-[minmax(200px,1.6fr)_minmax(100px,0.6fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_minmax(110px,0.7fr)_minmax(160px,1fr)_minmax(140px,0.9fr)_minmax(110px,0.8fr)]">
              <Field label="Mahsulot nomi" required error={productInvalid}>
                <ProductCombobox
                  products={MOCK_PRODUCTS}
                  value={form.productId}
                  onChange={(id) => setForm((s) => ({ ...s, productId: id }))}
                  invalid={productInvalid}
                />
              </Field>

              <Field label="Soni" required error={qtyInvalid}>
                <Input
                  value={form.qty}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, qty: formatNumberInput(e.target.value) }))
                  }
                  placeholder="0"
                  className={cn(
                    "h-9 text-right text-sm",
                    qtyInvalid && "border-destructive focus-visible:ring-destructive",
                  )}
                  inputMode="decimal"
                />
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

              <Field label="Limit">
                <Input
                  value={form.minStockAlert}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      minStockAlert: formatNumberInput(e.target.value),
                    }))
                  }
                  placeholder="—"
                  title="Shu miqdordan kamaysa, ogohlantiriladi"
                  className="h-9 text-right text-sm"
                  inputMode="decimal"
                />
              </Field>

              <Field label="Taminotchi" required error={agentInvalid}>
                <Select
                  value={form.agentId || "__none__"}
                  onValueChange={(value) =>
                    setForm((s) => ({ ...s, agentId: value === "__none__" ? "" : value }))
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "h-9 text-sm",
                      agentInvalid && "border-destructive focus-visible:ring-destructive",
                    )}
                  >
                    <SelectValue placeholder="Taminotchini tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>
                      Taminotchini tanlang
                    </SelectItem>
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
                  value={form.warehouse || "__none__"}
                  onValueChange={(value) =>
                    setForm((s) => ({ ...s, warehouse: value === "__none__" ? "" : value }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Tanlanmagan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tanlanmagan</SelectItem>
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
        </section>

        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
            <DialogHeader className="space-y-0 border-b px-5 py-3">
              <DialogTitle className="text-base font-semibold">Prixodni yakunlash</DialogTitle>
            </DialogHeader>

            <div className="flex items-end justify-between gap-4 border-b bg-muted/30 px-5 py-3">
              <div>
                <div className="text-xs text-muted-foreground">Qo'shilayotgan tovar</div>
                <div className="text-sm font-semibold">{product?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {qtyForDialog} {product?.unit}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Tan narxda jami</div>
                <div
                  data-no-translate
                  className="text-2xl font-bold leading-none tabular-nums text-primary"
                >
                  {formatMoney(totalCostForDialog, form.costCurrency)}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">Taminotchi</span>
                <span className="text-sm font-semibold">{agent?.name ?? "—"}</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Berilgan summa ({form.costCurrency})</Label>
                <Input
                  value={paymentPaidAmount}
                  onChange={(e) => setPaymentPaidAmount(formatNumberInput(e.target.value))}
                  className="h-11 text-right text-lg font-bold tabular-nums"
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">To'lov usuli</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PRIXOD_PAYMENT_METHODS.map((method) => {
                    const Icon = PAYMENT_KIND_ICON[method.kind] ?? Wallet;
                    const active = paymentMethodId === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethodId(method.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 rounded-md border px-1 py-2.5 transition-colors",
                          active
                            ? "border-2 border-primary bg-primary/10"
                            : "border-input bg-card hover:border-primary/50",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span
                          className={cn(
                            "text-center text-[11px] font-semibold leading-tight",
                            active ? "text-primary" : "text-foreground",
                          )}
                        >
                          {method.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {paymentMethodInvalid && (
                  <div className="text-[11px] font-medium text-destructive">
                    To'lov usulini tanlang
                  </div>
                )}
              </div>

              {askOutflowSource && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Chiqim qayerdan</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentOutflowSource("kassa")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                        paymentOutflowSource === "kassa"
                          ? "border-2 border-primary bg-primary/10 text-primary"
                          : "border-input text-foreground hover:border-primary/50",
                      )}
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Kassadan
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOutflowSource("other")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                        paymentOutflowSource === "other"
                          ? "border-2 border-primary bg-primary/10 text-primary"
                          : "border-input text-foreground hover:border-primary/50",
                      )}
                    >
                      Boshqa manbadan
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {paymentOutflowSource === "kassa"
                      ? "Bu summa kassadan chiqim sifatida yoziladi"
                      : "Kassaga tegilmaydi — faqat agentga to'lov sifatida qayd etiladi"}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/30">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <HandCoins className="h-3.5 w-3.5 text-amber-600" />
                  Qoldiq — qarz sifatida yoziladi
                </span>
                <span
                  data-no-translate
                  className="font-bold tabular-nums text-amber-700 dark:text-amber-500"
                >
                  {formatMoney(paymentRemaining, form.costCurrency)}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Izoh — ixtiyoriy</Label>
                <Textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Masalan: naqd qo'lda berildi"
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </div>

            <DialogFooter className="border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="button" onClick={handlePaymentConfirm} className="gap-2">
                <Check className="h-4 w-4" />
                Tasdiqlash va saqlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={tab === "bugun" ? "default" : "outline"}
              onClick={() => setTab("bugun")}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Prixodlar
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
          <Button onClick={openForm} className="h-8 gap-2 text-xs">
            <PackagePlus className="h-4 w-4" />
            Tovar prixod qilish
          </Button>
        </div>

        {tab === "tahrir" ? (
          <div className="min-h-0 flex-1 overflow-auto">
            <AddedEditLogTable />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <AddedTable initialDateMode="today" />
          </div>
        )}
      </section>
    </div>
  );
}

function ProductCombobox({
  products,
  value,
  onChange,
  invalid,
}: {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
  invalid?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selected = products.find((p) => p.id === value);

  // Ro'yxatdan tashqariga bosilganda yopiladi.
  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.customCode.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q),
    );
  }, [products, query]);

  const displayValue = open ? query : (selected?.name ?? query);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder="Mahsulot nomini yozing..."
        className={cn(
          "h-9 text-sm",
          invalid && "border-destructive focus-visible:ring-destructive",
        )}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md">
          {filtered.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              Mahsulot topilmadi
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p.id);
                  setQuery("");
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground",
                  p.id === value && "bg-accent/60",
                )}
              >
                <span className="truncate text-xs font-medium">{p.name}</span>
                <span className="truncate text-[11px] text-muted-foreground">{p.customCode}</span>
              </button>
            ))
          )}
        </div>
      )}
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
