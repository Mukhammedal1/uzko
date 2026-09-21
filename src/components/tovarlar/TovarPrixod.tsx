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
  ChevronRight,
  CreditCard,
  HandCoins,
  History,
  Landmark,
  PackageCheck,
  PackagePlus,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  MOCK_PAYMENT_METHODS,
  MOCK_PRODUCTS,
  MOCK_RATES,
  MOCK_WITHDRAWALS,
  computeMarkupPrice,
  reverseMarkupPercent,
  formatMoney,
  getAgentsList,
  productHasVariants,
  resolveVariant,
} from "@/lib/mock-data";
import type { Currency, PaymentKind, PaymentMethod, Product } from "@/lib/mock-data";
import { recordProductAddition } from "@/lib/data-actions";
import { MarkupRow } from "@/components/tovarlar/TovarQoshish";
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

type PrixodRow = {
  id: string;
  productId: string;
  variantId: string;
  qty: string;
  costCurrency: Currency;
  costPrice: string;
  wholesalePrice: string;
  wholesaleMarkupPercent: string;
  wholesaleMarkupWarn: boolean;
  price: string;
  priceMarkupPercent: string;
  priceMarkupWarn: boolean;
  minStockAlert: string;
  warehouse: string;
  shelfLocation: string;
};

let prixodRowSeq = 0;

function makeEmptyRow(): PrixodRow {
  prixodRowSeq += 1;
  return {
    id: `pr-${Date.now()}-${prixodRowSeq}`,
    productId: "",
    variantId: "",
    qty: "",
    costCurrency: "UZS",
    costPrice: "",
    wholesalePrice: "",
    wholesaleMarkupPercent: "",
    wholesaleMarkupWarn: false,
    price: "",
    priceMarkupPercent: "",
    priceMarkupWarn: false,
    minStockAlert: "",
    warehouse: "",
    shelfLocation: "",
  };
}

/** Qatordagi tanlovni ota-tovar, variant va ular birlashgan ishchi nusxaga ochadi. */
function resolveRowProduct(row: Pick<PrixodRow, "productId" | "variantId">) {
  const parent = MOCK_PRODUCTS.find((p) => p.id === row.productId);
  const variant = parent?.variants?.find((v) => v.id === row.variantId);
  const product = parent && variant ? resolveVariant(parent, variant) : parent;
  return { parent, variant, product };
}

/** "Tovar prixod qilish" — bazadagi mavjud mahsulotlarga narx, taminotchi, ombor
 * va polka joyini belgilaydi (tovar qabul qilinganda). Bir nechta tovar bir vaqtda kiritiladi. */
export function TovarPrixod() {
  const { settings } = useApp();
  const defaultWarehouse = settings.warehouses[0]?.name ?? "Asosiy ombor";
  const agents = getAgentsList();
  const [tab, setTab] = React.useState<"bugun" | "tahrir">("bugun");
  const [formOpen, setFormOpen] = React.useState(false);
  const [rows, setRows] = React.useState<PrixodRow[]>(() => [makeEmptyRow()]);
  const [agentId, setAgentId] = React.useState("");
  const [showValidation, setShowValidation] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [paymentPaidAmount, setPaymentPaidAmount] = React.useState("");
  const [paymentMethodId, setPaymentMethodId] = React.useState<string>("cash");
  const [paymentOutflowSource, setPaymentOutflowSource] = React.useState<"kassa" | "other">(
    "kassa",
  );
  const [paymentNote, setPaymentNote] = React.useState("");

  const agent = agents.find((a) => a.id === agentId);

  const updateRow = (id: string, patch: Partial<PrixodRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  // Qulflangan foizlar: null bo'lsa qulf o'chiq. Qiymat qulflangan paytdagi
  // foizga qotib qoladi va shu qiymat yangi qo'shiladigan qatorlarga ko'chadi.
  const [lockedWholesalePercent, setLockedWholesalePercent] = React.useState<string | null>(null);
  const [lockedPricePercent, setLockedPricePercent] = React.useState<string | null>(null);

  const addRow = () =>
    setRows((current) => [
      ...current,
      {
        ...makeEmptyRow(),
        wholesaleMarkupPercent: lockedWholesalePercent ?? "",
        priceMarkupPercent: lockedPricePercent ?? "",
      },
    ]);

  const toggleWholesaleLock = (row: PrixodRow) =>
    setLockedWholesalePercent((prev) => (prev !== null ? null : row.wholesaleMarkupPercent || "0"));

  const togglePriceLock = (row: PrixodRow) =>
    setLockedPricePercent((prev) => (prev !== null ? null : row.priceMarkupPercent || "0"));

  const removeRow = (id: string) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  // Mahsulot tanlanganda joriy narxlari maydonlarga (tahrirlanadigan holda)
  // avtomatik to'ldiriladi — narxlar o'zgargan bo'lishi mumkin, shu yerdan yangilanadi.
  const selectProduct = (rowId: string, productId: string, variantId: string) => {
    const { product } = resolveRowProduct({ productId, variantId });
    if (!product) {
      updateRow(rowId, { productId, variantId });
      return;
    }
    updateRow(rowId, {
      productId,
      variantId,
      costCurrency: product.costCurrency,
      costPrice: formatNumberInput(String(product.costPrice)),
      wholesalePrice: product.wholesalePrice
        ? formatNumberInput(String(product.wholesalePrice))
        : "",
      wholesaleMarkupPercent:
        typeof product.wholesaleMarkupPercent === "number"
          ? formatNumberInput(String(product.wholesaleMarkupPercent))
          : "",
      wholesaleMarkupWarn: false,
      price: formatNumberInput(String(product.price)),
      priceMarkupPercent:
        typeof product.priceMarkupPercent === "number"
          ? formatNumberInput(String(product.priceMarkupPercent))
          : "",
      priceMarkupWarn: false,
      minStockAlert:
        typeof product.minStockAlert === "number"
          ? formatNumberInput(String(product.minStockAlert))
          : "",
    });
  };

  const wholesaleCurrencyOf = (row: PrixodRow): Currency =>
    resolveRowProduct(row).product?.wholesaleCurrency ?? "UZS";
  const priceCurrencyOf = (row: PrixodRow): Currency =>
    resolveRowProduct(row).product?.priceCurrency ?? "UZS";

  /** Tan narx (yoki uning valyutasi) o'zgarganda — foiz maydoni to'ldirilgan
   * bo'lsa, Optom narx va Sotuv narx shu foiz asosida darhol qayta hisoblanadi. */
  const applyAutoMarkup = (
    row: PrixodRow,
    nextCostPrice: string,
    nextCostCurrency: Currency,
  ): Partial<PrixodRow> => {
    const cost = parseNumberInput(nextCostPrice);
    if (!(cost > 0)) return {};
    const patch: Partial<PrixodRow> = {};
    const wPercent = parseNumberInput(row.wholesaleMarkupPercent);
    if (wPercent > 0) {
      patch.wholesalePrice = formatNumberInput(
        String(computeMarkupPrice(cost, nextCostCurrency, wholesaleCurrencyOf(row), wPercent)),
      );
      patch.wholesaleMarkupWarn = false;
    }
    const pPercent = parseNumberInput(row.priceMarkupPercent);
    if (pPercent > 0) {
      patch.price = formatNumberInput(
        String(computeMarkupPrice(cost, nextCostCurrency, priceCurrencyOf(row), pPercent)),
      );
      patch.priceMarkupWarn = false;
    }
    return patch;
  };

  /** Foiz maydonidagi (yoki Enter/tugma bosilgandagi) foiz asosida narxni hisoblaydi. */
  const applyMarkup = (row: PrixodRow, kind: "wholesale" | "price") => {
    const cost = parseNumberInput(row.costPrice);
    const warnKey = kind === "wholesale" ? "wholesaleMarkupWarn" : "priceMarkupWarn";
    if (!cost) {
      updateRow(row.id, { [warnKey]: true });
      toast.error("Avval tan narxni kiriting");
      return;
    }
    const percent = parseNumberInput(
      kind === "wholesale" ? row.wholesaleMarkupPercent : row.priceMarkupPercent,
    );
    const result = computeMarkupPrice(
      cost,
      row.costCurrency,
      kind === "wholesale" ? wholesaleCurrencyOf(row) : priceCurrencyOf(row),
      percent,
    );
    updateRow(row.id, {
      [kind === "wholesale" ? "wholesalePrice" : "price"]: formatNumberInput(String(result)),
      [warnKey]: false,
    });
  };

  /** Optom/sotuv narx qo'lda o'zgartirilib, inputdan chiqilganda (blur) — tan
   * narxdan qancha foiz ustama qo'yilgani orqaga hisoblanib, foiz maydoniga yoziladi. */
  const handleMarkupBlur = (row: PrixodRow, kind: "wholesale" | "price") => {
    const cost = parseNumberInput(row.costPrice);
    const priceNum = parseNumberInput(kind === "wholesale" ? row.wholesalePrice : row.price);
    const warnKey = kind === "wholesale" ? "wholesaleMarkupWarn" : "priceMarkupWarn";
    if (!cost) {
      updateRow(row.id, { [warnKey]: priceNum > 0 });
      return;
    }
    if (!priceNum) {
      updateRow(row.id, { [warnKey]: false });
      return;
    }
    const percent = reverseMarkupPercent(
      cost,
      row.costCurrency,
      priceNum,
      kind === "wholesale" ? wholesaleCurrencyOf(row) : priceCurrencyOf(row),
    );
    const percentKey = kind === "wholesale" ? "wholesaleMarkupPercent" : "priceMarkupPercent";
    updateRow(row.id, {
      [percentKey]: percent === null ? row[percentKey] : formatNumberInput(String(percent)),
      [warnKey]: percent === null,
    });
  };

  const agentInvalid = showValidation && !agent;

  const rowQty = (row: PrixodRow) => Math.max(0, parseNumberInput(row.qty) || 0);
  const rowUnitCost = (row: PrixodRow, fallback: number) =>
    Math.max(0, parseNumberInput(row.costPrice) || 0) || fallback;
  const rate = (code: string) => MOCK_RATES[code] ?? 1;

  const filledRows = rows
    .map((row) => ({ row, ...resolveRowProduct(row) }))
    .filter((item): item is typeof item & { product: Product } => Boolean(item.product));

  // Qatorlar turli valyutada bo'lishi mumkin — to'lov bitta valyutada: hammasi
  // bir xil bo'lsa o'sha, aks holda UZS ekvivalentida.
  const paymentCurrency: Currency = filledRows.every(
    (item) => item.row.costCurrency === filledRows[0]?.row.costCurrency,
  )
    ? (filledRows[0]?.row.costCurrency ?? "UZS")
    : "UZS";
  const totalCostForDialog = filledRows.reduce(
    (sum, { row, product }) =>
      sum +
      (rowQty(row) * rowUnitCost(row, product.costPrice) * rate(row.costCurrency)) /
        rate(paymentCurrency),
    0,
  );

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
    // To'langan summa qatorlar bo'ylab ketma-ket taqsimlanadi (to'lov valyutasida).
    let paidLeft = payment ? Math.min(totalCostForDialog, payment.paidAmount) : 0;
    let paidTotal = 0;
    const invoiceNumbers: string[] = [];
    const debtParts: number[] = [];

    for (const item of rows) {
      const { parent, variant, product } = resolveRowProduct(item);
      if (!product) continue;
      const qtyNumber = rowQty(item);
      const priceNumber = Math.max(0, parseNumberInput(item.price) || 0);
      const costNumber = Math.max(0, parseNumberInput(item.costPrice) || 0);
      const wholesaleNumber = Math.max(0, parseNumberInput(item.wholesalePrice) || 0);

      product.costPrice = costNumber || product.costPrice;
      product.costCurrency = item.costCurrency;
      product.price = priceNumber;
      product.priceMarkupPercent = parseNumberInput(item.priceMarkupPercent) || undefined;
      if (wholesaleNumber > 0) product.wholesalePrice = wholesaleNumber;
      product.wholesaleMarkupPercent = parseNumberInput(item.wholesaleMarkupPercent) || undefined;
      product.warehouse = item.warehouse || defaultWarehouse;
      product.shelfLocation = item.shelfLocation || undefined;
      product.omborQty = (product.omborQty || 0) + qtyNumber;
      product.minStockAlert = item.minStockAlert.trim()
        ? Math.max(0, parseNumberInput(item.minStockAlert) || 0)
        : undefined;

      if (parent && variant) {
        Object.assign(variant, {
          costPrice: product.costPrice,
          costCurrency: product.costCurrency,
          price: product.price,
          wholesalePrice: product.wholesalePrice,
          omborQty: product.omborQty,
          minStockAlert: product.minStockAlert,
        });
        parent.warehouse = product.warehouse;
        parent.shelfLocation = product.shelfLocation;
      }

      const totalCost = qtyNumber * product.costPrice;
      const totalInPayCurrency = (totalCost * rate(item.costCurrency)) / rate(paymentCurrency);
      const allocated = Math.min(paidLeft, totalInPayCurrency);
      paidLeft -= allocated;
      paidTotal += allocated;
      const paidAmount = (allocated * rate(paymentCurrency)) / rate(item.costCurrency);
      debtParts.push(((totalCost - paidAmount) * rate(item.costCurrency)) / rate(paymentCurrency));

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
      invoiceNumbers.push(invoiceNumber);
    }

    // Kassadan chiqim faqat foydalanuvchi "Kassadan" deb tanlaganda yoziladi
    // (o'tkazmadan boshqa har bir usulda shu savol so'raladi — bekor qilinsa
    // yoki "Boshqa manbadan" tanlansa, kassaga tegilmaydi).
    if (agent && payment && paidTotal > 0 && payment.fromKassa) {
      const kind = payment.method.kind;
      MOCK_WITHDRAWALS.push({
        id: `CH-prixod-${Date.now()}`,
        date: new Date().toISOString(),
        cashier: settings.username,
        category: "Agentlarga to'lov",
        cash: kind === "cash" ? Math.round(paidTotal * rate(paymentCurrency)) : 0,
        cardAmount: kind === "card" ? Math.round(paidTotal * rate(paymentCurrency)) : 0,
        currencies: kind === "currency" ? [{ code: paymentCurrency, amount: paidTotal }] : [],
        note: `Tovar prixodi uchun to'lov (${payment.method.name}) · ${filledRows.map((i) => i.product.name).join(", ")}`,
        agentId: agent.id,
      });
    }

    const remaining = Math.max(
      0,
      debtParts.reduce((a, b) => a + b, 0),
    );
    const title =
      filledRows.length === 1 ? filledRows[0].product.name : `${filledRows.length} ta tovar`;
    const invoiceLabel =
      invoiceNumbers.length > 1
        ? `${invoiceNumbers[0]} — ${invoiceNumbers[invoiceNumbers.length - 1]}`
        : invoiceNumbers[0];
    toast.success(`Tovar prixod qilindi · ${invoiceLabel}`, {
      description: agent
        ? remaining > 0
          ? `${title} · ${agent.name} · qarz: ${formatMoney(remaining, paymentCurrency)}`
          : `${title} · ${agent.name} · to'liq to'landi`
        : title,
    });

    setRows([makeEmptyRow()]);
    setAgentId("");
    setShowValidation(false);
    setPaymentOpen(false);
    setFormOpen(false);
  };

  const openForm = () => {
    setRows([makeEmptyRow()]);
    setAgentId("");
    setLockedWholesalePercent(null);
    setLockedPricePercent(null);
    setShowValidation(false);
    setFormOpen(true);
  };

  const handleSubmit = () => {
    setShowValidation(true);
    for (const [index, row] of rows.entries()) {
      const label = rows.length > 1 ? ` (${index + 1}-qator)` : "";
      if (!resolveRowProduct(row).product) {
        toast.error(`Mahsulotni tanlang${label}`);
        return;
      }
      if (rowQty(row) <= 0) {
        toast.error(`Miqdorni kiriting${label}`);
        return;
      }
      if (!(parseNumberInput(row.price) > 0)) {
        toast.error(`Sotuv narxini kiriting${label}`);
        return;
      }
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

          <div className="min-h-0 flex-1 overflow-auto p-3">
            <div className="space-y-5">
              {rows.map((row, index) => {
                const { product } = resolveRowProduct(row);
                const productInvalid = showValidation && !product;
                const qtyInvalid = showValidation && !(parseNumberInput(row.qty) > 0);
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

                      <div className="grid grid-cols-1 gap-4 pr-8 md:grid-cols-4 xl:grid-cols-[minmax(200px,1.6fr)_minmax(100px,0.6fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_minmax(110px,0.7fr)_minmax(160px,1fr)_minmax(140px,0.9fr)_minmax(110px,0.8fr)]">
                        <Field label="Mahsulot nomi" required error={productInvalid}>
                          <ProductCombobox
                            products={MOCK_PRODUCTS}
                            value={row.productId}
                            variantId={row.variantId}
                            onChange={(id, variantId = "") => selectProduct(row.id, id, variantId)}
                            invalid={productInvalid}
                          />
                        </Field>

                        <Field label="Soni" required error={qtyInvalid}>
                          <Input
                            value={row.qty}
                            onChange={(e) =>
                              updateRow(row.id, { qty: formatNumberInput(e.target.value) })
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
                            value={row.costPrice}
                            onChange={(value) => {
                              const formatted = formatNumberInput(value);
                              updateRow(row.id, {
                                costPrice: formatted,
                                ...applyAutoMarkup(row, formatted, row.costCurrency),
                              });
                            }}
                            placeholder="0"
                            currency={row.costCurrency}
                            currencies={settings.currencies}
                            onCurrencyChange={(value) => {
                              const currency = value as Currency;
                              updateRow(row.id, {
                                costCurrency: currency,
                                ...applyAutoMarkup(row, row.costPrice, currency),
                              });
                            }}
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
                            onBlur={() => handleMarkupBlur(row, "wholesale")}
                            placeholder="0"
                            className="h-9 text-right text-sm"
                            inputMode="decimal"
                          />
                          <MarkupRow
                            percent={row.wholesaleMarkupPercent}
                            warn={row.wholesaleMarkupWarn}
                            locked={lockedWholesalePercent !== null}
                            onToggleLock={() => toggleWholesaleLock(row)}
                            onPercentChange={(value) =>
                              updateRow(row.id, { wholesaleMarkupPercent: value })
                            }
                            onApply={() => applyMarkup(row, "wholesale")}
                          />
                        </Field>

                        <Field label="Sotuv narx" required error={priceInvalid}>
                          <Input
                            value={row.price}
                            onChange={(e) =>
                              updateRow(row.id, { price: formatNumberInput(e.target.value) })
                            }
                            onBlur={() => handleMarkupBlur(row, "price")}
                            placeholder="0"
                            className={cn(
                              "h-9 text-right text-sm",
                              priceInvalid && "border-destructive focus-visible:ring-destructive",
                            )}
                            inputMode="decimal"
                          />
                          <MarkupRow
                            percent={row.priceMarkupPercent}
                            warn={row.priceMarkupWarn}
                            locked={lockedPricePercent !== null}
                            onToggleLock={() => togglePriceLock(row)}
                            onPercentChange={(value) =>
                              updateRow(row.id, { priceMarkupPercent: value })
                            }
                            onApply={() => applyMarkup(row, "price")}
                          />
                        </Field>

                        <Field label="Limit">
                          <Input
                            value={row.minStockAlert}
                            onChange={(e) =>
                              updateRow(row.id, {
                                minStockAlert: formatNumberInput(e.target.value),
                              })
                            }
                            placeholder="—"
                            title="Shu miqdordan kamaysa, ogohlantiriladi"
                            className="h-9 text-right text-sm"
                            inputMode="decimal"
                          />
                        </Field>

                        <Field label="Taminotchi" required error={agentInvalid}>
                          <Select
                            value={agentId || "__none__"}
                            disabled={index > 0}
                            onValueChange={(value) => setAgentId(value === "__none__" ? "" : value)}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-9 text-sm",
                                agentInvalid && "border-destructive focus-visible:ring-destructive",
                              )}
                              title={
                                index > 0
                                  ? "Birinchi qatordagi taminotchi avtomatik qo'llanadi"
                                  : undefined
                              }
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
                            value={row.warehouse || "__none__"}
                            onValueChange={(value) =>
                              updateRow(row.id, { warehouse: value === "__none__" ? "" : value })
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
                            value={row.shelfLocation || "__empty__"}
                            onValueChange={(value) =>
                              updateRow(row.id, {
                                shelfLocation: value === "__empty__" ? "" : value,
                              })
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

        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
            <DialogHeader className="space-y-0 border-b px-5 py-3">
              <DialogTitle className="text-base font-semibold">Prixodni yakunlash</DialogTitle>
            </DialogHeader>

            <div className="flex items-end justify-between gap-4 border-b bg-muted/30 px-5 py-3">
              <div>
                <div className="text-xs text-muted-foreground">Qo'shilayotgan tovar</div>
                {filledRows.map(({ row, product }) => (
                  <div key={row.id} className="text-sm">
                    <span className="font-semibold">{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      · {rowQty(row)} {product.unit}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Tan narxda jami</div>
                <div
                  data-no-translate
                  className="text-2xl font-bold leading-none tabular-nums text-primary"
                >
                  {formatMoney(totalCostForDialog, paymentCurrency)}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">Taminotchi</span>
                <span className="text-sm font-semibold">{agent?.name ?? "—"}</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Berilgan summa ({paymentCurrency})</Label>
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
                  {formatMoney(paymentRemaining, paymentCurrency)}
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
  variantId,
  onChange,
  invalid,
}: {
  products: Product[];
  value: string;
  variantId?: string;
  onChange: (id: string, variantId?: string) => void;
  invalid?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selected = products.find((p) => p.id === value);
  const selectedVariant = selected?.variants?.find((v) => v.id === variantId);
  // Variantli tovar ustiga borilganda o'ng tomonda variantlar paneli ochiladi.
  const [hovered, setHovered] = React.useState<{ id: string; top: number } | null>(null);
  // Bosib qo'yilgan panel sichqoncha chiqib ketganda yopilmaydi (sensorli ekran uchun).
  const [pinned, setPinned] = React.useState(false);
  const hoveredProduct = hovered ? products.find((p) => p.id === hovered.id) : undefined;

  // Ro'yxatdan tashqariga bosilganda yopiladi.
  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHovered(null);
        setPinned(false);
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

  const displayValue = open
    ? query
    : selected
      ? selectedVariant
        ? `${selected.name} — ${selectedVariant.label}`
        : selected.name
      : query;

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
          setHovered(null);
          setPinned(false);
        }}
        placeholder="Mahsulot nomini yozing..."
        className={cn(
          "h-9 text-sm",
          invalid && "border-destructive focus-visible:ring-destructive",
        )}
        autoComplete="off"
      />
      {open && (
        <div
          className="absolute z-50 mt-1 w-full"
          onMouseLeave={() => {
            if (!pinned) setHovered(null);
          }}
        >
          <div className="max-h-64 overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                Mahsulot topilmadi
              </div>
            ) : (
              filtered.map((p) => {
                const hasVariants = productHasVariants(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={(e) =>
                      !pinned &&
                      setHovered(
                        hasVariants
                          ? {
                              id: p.id,
                              top:
                                e.currentTarget.getBoundingClientRect().top -
                                (containerRef.current?.getBoundingClientRect().bottom ?? 0),
                            }
                          : null,
                      )
                    }
                    onClick={(e) => {
                      if (hasVariants) {
                        setPinned(true);
                        setHovered({
                          id: p.id,
                          top:
                            e.currentTarget.getBoundingClientRect().top -
                            (containerRef.current?.getBoundingClientRect().bottom ?? 0),
                        });
                        return;
                      }
                      onChange(p.id);
                      setQuery("");
                      setOpen(false);
                      setHovered(null);
                      setPinned(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground",
                      (p.id === value || hovered?.id === p.id) && "bg-accent/60",
                    )}
                  >
                    <span className="flex min-w-0 flex-col items-start">
                      <span className="truncate text-xs font-medium">{p.name}</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {p.customCode}
                      </span>
                    </span>
                    {hasVariants && (
                      <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground">
                        {p.variants!.length} variant
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {hoveredProduct && productHasVariants(hoveredProduct) && hovered && (
            <div
              className="absolute left-full z-50 ml-1 max-h-64 w-56 overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
              style={{ top: Math.max(0, hovered.top) }}
            >
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Variantni tanlang
              </div>
              {hoveredProduct.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(hoveredProduct.id, v.id);
                    setQuery("");
                    setOpen(false);
                    setHovered(null);
                    setPinned(false);
                  }}
                  className={cn(
                    "flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground",
                    hoveredProduct.id === value && v.id === variantId && "bg-accent/60",
                  )}
                >
                  <span className="truncate text-xs font-medium">{v.label}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {v.customCode ?? v.barcode ?? `Qoldiq: ${v.omborQty ?? 0}`}
                  </span>
                </button>
              ))}
            </div>
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
