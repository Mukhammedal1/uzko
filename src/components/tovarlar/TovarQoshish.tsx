import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Barcode, Plus, Check, ChevronDown, Trash2 } from "lucide-react";
import {
  MOCK_PRODUCTS,
  MOCK_RATES,
  MOCK_PRODUCT_HISTORY,
  MOCK_SUPPLIER_REPORTS,
  formatSom,
  costInSom,
} from "@/lib/mock-data";
import type { Currency, Product } from "@/lib/mock-data";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import { dispatchSupplierReceipt } from "@/lib/data-actions";
import type { ProductCreateMode } from "@/routes/tovarlar";
import { cn, formatNumberInput, parseNumberInput } from "@/lib/utils";

type NewProductRow = {
  id: string;
  existingProductId?: string;
  name: string;
  barcode: string;
  qty: string;
  costCurrency: Currency;
  costPrice: string;
  saleCurrency: Currency;
  priceMode: "manual" | "percent";
  pricePercent: string;
  price: string;
  wholesalePriceMode: "manual" | "percent";
  wholesalePricePercent: string;
  wholesalePrice: string;
  unit: string;
  perBox: string;
  preventBelowCost: boolean;
  warehouse: string;
  shelfLocation: string;
};

type PriceModeDefault = { mode: "manual" | "percent"; percent: string };

const BOX_UNIT = "dona | karobka";
function isBoxUnit(unit: string) {
  return unit === BOX_UNIT;
}

type SupplierSource = {
  enabled: boolean;
  agentId: string;
  agentName: string;
  agentPhone: string;
  paidAmount: string;
  note: string;
  sendBotUpdate: boolean;
};

const makeNewProductRow = (
  unit = "dona",
  warehouse = "Asosiy ombor",
  priceDefault: PriceModeDefault = { mode: "manual", percent: "" },
  wholesaleDefault: PriceModeDefault = { mode: "manual", percent: "" },
): NewProductRow => ({
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  barcode: "",
  qty: "",
  costCurrency: "UZS",
  costPrice: "",
  saleCurrency: "UZS",
  priceMode: priceDefault.mode,
  pricePercent: priceDefault.percent,
  price: "",
  wholesalePriceMode: wholesaleDefault.mode,
  wholesalePricePercent: wholesaleDefault.percent,
  wholesalePrice: "",
  unit,
  perBox: "",
  preventBelowCost: true,
  warehouse,
  shelfLocation: "",
});

function toNumber(value: unknown) {
  const cleaned = String(value ?? "")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function currencyRate(currency: Currency) {
  return MOCK_RATES[currency] ?? 1;
}

function moneyInputToSom(value: string | number, currency: Currency) {
  return Math.round(Math.max(0, toNumber(value)) * currencyRate(currency));
}

function somToMoneyInput(value: number | undefined, currency: Currency) {
  const amount = Math.max(0, value ?? 0) / currencyRate(currency);
  if (!Number.isFinite(amount)) return "";
  return String(Number(amount.toFixed(currency === "UZS" ? 0 : 2)));
}

function computePercentPrice(
  costPrice: string,
  costCurrency: Currency,
  percent: string,
  saleCurrency: Currency,
) {
  const cost = toNumber(costPrice);
  if (cost <= 0) return "";
  const pct = toNumber(percent);
  const costSom = cost * currencyRate(costCurrency);
  const saleSom = costSom * (1 + pct / 100);
  return somToMoneyInput(saleSom, saleCurrency);
}

function focusNextField(current: HTMLElement) {
  const focusable = Array.from(
    document.querySelectorAll<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
  const index = focusable.indexOf(current);
  if (index > -1 && index + 1 < focusable.length) {
    focusable[index + 1].focus();
  }
}

function makeProductCode(name: string) {
  return (
    name
      .trim()
      .slice(0, 4)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "") + Math.floor(Math.random() * 99)
  );
}

function makeBarcode() {
  return "8690" + String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0");
}

function makeUniqueBarcode(used: Iterable<string> = []) {
  const usedSet = new Set(
    [
      ...MOCK_PRODUCTS.flatMap((product) => splitBarcodes(product.barcode)),
      ...Array.from(used).flatMap((value) => splitBarcodes(value)),
    ].filter(Boolean),
  );
  let barcode = makeBarcode();
  while (usedSet.has(barcode)) barcode = makeBarcode();
  return barcode;
}

function splitBarcodes(value: string) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinBarcodes(values: string[]) {
  return values
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" | ");
}

function makeAgentId() {
  const next = MOCK_SUPPLIER_REPORTS.length + 1;
  return `AG-${String(next).padStart(4, "0")}`;
}

function getAgents() {
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      phone: string;
      botEnabled: boolean;
      totalAmount: number;
      paidAmount: number;
      remainingDebt: number;
    }
  >();
  MOCK_SUPPLIER_REPORTS.forEach((row) => {
    if (!row.agentId) return;
    const current = map.get(row.agentId);
    map.set(row.agentId, {
      id: row.agentId,
      name: row.agentName || "Nomsiz agent",
      phone: row.agentPhone || "",
      botEnabled: (current?.botEnabled ?? false) || Boolean(row.botEnabled),
      totalAmount: (current?.totalAmount ?? 0) + row.totalAmount,
      paidAmount: (current?.paidAmount ?? 0) + row.paidAmount,
      remainingDebt: (current?.remainingDebt ?? 0) + row.remainingDebt,
    });
  });
  return Array.from(map.values());
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function latestProductSource(productName: string) {
  const name = normalizeSearchValue(productName);
  return MOCK_PRODUCT_HISTORY.find(
    (row) => normalizeSearchValue(row.productName) === name && Boolean(row.agentName),
  );
}

function recordProductAddition(input: {
  productName: string;
  qty: number;
  unit: string;
  price: number;
  costPrice: number;
  warehouse: string;
  addedBy: string;
  source?: SupplierSource;
}) {
  const sourceEnabled = Boolean(input.source?.enabled && input.source.agentName.trim());
  const totalAmount = input.qty * input.costPrice;
  const paidAmount = sourceEnabled ? Math.max(0, Number(input.source?.paidAmount) || 0) : undefined;
  MOCK_PRODUCT_HISTORY.unshift({
    id: `ph${Date.now()}-${Math.random()}`,
    date: new Date().toISOString(),
    addedBy: input.addedBy,
    productName: input.productName,
    qty: input.qty,
    unit: input.unit,
    price: input.price,
    costPrice: input.costPrice,
    warehouse: input.warehouse,
    agentName: sourceEnabled ? input.source?.agentName.trim() : undefined,
    agentId: sourceEnabled ? input.source?.agentId || makeAgentId() : undefined,
    agentPhone: sourceEnabled ? input.source?.agentPhone.trim() : undefined,
    paidAmount,
    remainingDebt: sourceEnabled ? Math.max(0, totalAmount - (paidAmount ?? 0)) : undefined,
    totalAmount: sourceEnabled ? totalAmount : undefined,
    note: sourceEnabled ? input.source?.note.trim() : undefined,
  });
  if (input.source?.enabled && input.source.agentName.trim()) {
    MOCK_SUPPLIER_REPORTS.unshift({
      id: `sr${Date.now()}-${Math.random()}`,
      date: new Date().toISOString(),
      addedBy: input.addedBy,
      agentId: input.source.agentId || makeAgentId(),
      agentName: input.source.agentName.trim(),
      agentPhone: input.source.agentPhone.trim(),
      botEnabled: input.source.sendBotUpdate,
      items: [
        { productName: input.productName, qty: input.qty, unit: input.unit, amount: totalAmount },
      ],
      totalAmount,
      paidAmount: paidAmount ?? 0,
      remainingDebt: Math.max(0, totalAmount - (paidAmount ?? 0)),
      note: input.source.note.trim(),
    });
  }
}

export function TovarQoshish({ onDone }: { mode: ProductCreateMode; onDone: () => void }) {
  return <CreateNew onDone={onDone} />;
}

function CreateNew({ onDone }: { onDone: () => void }) {
  const { settings } = useApp();
  const defaultWarehouse = settings.warehouses[0] ?? "Asosiy ombor";
  const agents = getAgents();
  const [source, setSource] = React.useState<SupplierSource>({
    enabled: false,
    agentId: makeAgentId(),
    agentName: "",
    agentPhone: "",
    paidAmount: "0",
    note: "",
    sendBotUpdate: true,
  });
  const [priceDefault, setPriceDefault] = React.useState<PriceModeDefault>({
    mode: "manual",
    percent: "",
  });
  const [wholesaleDefault, setWholesaleDefault] = React.useState<PriceModeDefault>({
    mode: "manual",
    percent: "",
  });
  const [rows, setRows] = React.useState<NewProductRow[]>(() => [
    makeNewProductRow(settings.units[0] ?? "dona", defaultWarehouse),
  ]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [showValidation, setShowValidation] = React.useState(false);
  const [deductFromCashbox, setDeductFromCashbox] = React.useState(true);
  const [showNoteField, setShowNoteField] = React.useState(false);
  const selectedAgent = React.useMemo(
    () => agents.find((agent) => agent.id === source.agentId),
    [agents, source.agentId],
  );

  const productSuggestionsFor = (row: NewProductRow) => {
    const q = normalizeSearchValue(row.name);
    if (q.length < 2) return [];
    return MOCK_PRODUCTS.filter((product) =>
      `${product.name} ${product.customCode} ${product.barcode}`.toLowerCase().includes(q),
    ).slice(0, 6);
  };

  const updateRow = (id: string, patch: Partial<NewProductRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      makeNewProductRow(
        settings.units[0] ?? "dona",
        defaultWarehouse,
        priceDefault,
        wholesaleDefault,
      ),
    ]);
  };

  const removeRow = (id: string) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const assignBarcode = (id: string) => {
    const row = rows.find((item) => item.id === id);
    const used = rows.filter((item) => item.id !== id).map((item) => item.barcode);
    const nextCode = makeUniqueBarcode(used);
    const currentCodes = splitBarcodes(row?.barcode ?? "");
    updateRow(id, { barcode: joinBarcodes([...currentCodes, nextCode]) });
  };

  const removeBarcodeChip = (id: string, code: string) => {
    const row = rows.find((item) => item.id === id);
    const nextCodes = splitBarcodes(row?.barcode ?? "").filter((item) => item !== code);
    updateRow(id, { barcode: joinBarcodes(nextCodes) });
  };

  const selectExistingProduct = (rowId: string, product: Product) => {
    const currency = product.costCurrency;
    const sourceInfo = latestProductSource(product.name);
    updateRow(rowId, {
      existingProductId: product.id,
      name: product.name,
      barcode: product.barcode,
      costCurrency: currency,
      costPrice: formatNumberInput(product.costPrice),
      saleCurrency: currency,
      priceMode: "manual",
      pricePercent: "",
      price: somToMoneyInput(product.price, currency),
      wholesalePriceMode: "manual",
      wholesalePricePercent: "",
      wholesalePrice: somToMoneyInput(product.wholesalePrice, currency),
      unit: product.unit,
      warehouse: settings.warehouses.includes(product.warehouse)
        ? product.warehouse
        : defaultWarehouse,
      shelfLocation: product.shelfLocation ?? "",
    });
    if (sourceInfo?.agentName) {
      setSource({
        enabled: true,
        agentId: sourceInfo.agentId || makeAgentId(),
        agentName: sourceInfo.agentName,
        agentPhone: sourceInfo.agentPhone || "",
        paidAmount: source.paidAmount || "0",
        note: sourceInfo.note || "",
        sendBotUpdate: true,
      });
    }
    toast.success("Bazadagi mahsulot tanlandi", {
      description: product.name,
    });
  };

  const validRows = rows
    .map((row) => {
      const boxUnit = isBoxUnit(row.unit);
      const perBoxNumber = Math.max(0, parseNumberInput(row.perBox) || 0);
      const enteredQty = Math.max(0, parseNumberInput(row.qty) || 0);
      return {
        ...row,
        name: row.name.trim(),
        warehouseValue: row.warehouse.trim() || defaultWarehouse,
        shelfLocationValue: row.shelfLocation.trim(),
        perBoxNumber,
        qtyNumber: boxUnit ? enteredQty * Math.max(1, perBoxNumber) : enteredQty,
        costNumber: Math.max(0, parseNumberInput(row.costPrice) || 0),
        priceSom: moneyInputToSom(row.price, row.saleCurrency),
        wholesalePriceSom: moneyInputToSom(row.wholesalePrice, row.saleCurrency),
        unitValue: boxUnit ? "dona" : ((row.unit.trim() || settings.units[0]) ?? "dona"),
        barcodeValue: joinBarcodes(splitBarcodes(row.barcode)),
      };
    })
    .filter(
      (row) => row.name && row.qtyNumber > 0 && (!isBoxUnit(row.unit) || row.perBoxNumber > 0),
    );

  const totalCostSom = validRows.reduce(
    (sum, row) => sum + row.qtyNumber * row.costNumber * (MOCK_RATES[row.costCurrency] ?? 1),
    0,
  );
  const openConfirm = () => {
    setShowValidation(true);
    if (validRows.length === 0) return toast.error("Kamida bitta tovar nomi va sonini kiriting");
    if (!source.enabled) {
      setSource({
        enabled: false,
        agentId: makeAgentId(),
        agentName: "",
        agentPhone: "",
        paidAmount: "0",
        note: "",
        sendBotUpdate: true,
      });
    }
    setConfirmOpen(true);
  };

  const finalizeReceiving = () => {
    const totalPaid = Math.max(0, parseNumberInput(source.paidAmount) || 0);
    const sourceEnabled = Boolean(source.enabled && source.agentName.trim());
    if (source.enabled && !source.agentName.trim()) {
      toast.error("Agent ismini kiriting yoki hech qisi yo'q deb belgilang");
      return;
    }

    const usedBarcodes = new Set(
      MOCK_PRODUCTS.flatMap((product) => splitBarcodes(product.barcode)),
    );
    rows.forEach((row) => {
      splitBarcodes(row.barcode).forEach((barcode) => usedBarcodes.add(barcode));
    });

    validRows.forEach((row, index) => {
      const rowBarcodes = splitBarcodes(row.barcodeValue);
      const nextBarcodes = rowBarcodes.length > 0 ? rowBarcodes : [makeUniqueBarcode(usedBarcodes)];
      nextBarcodes.forEach((barcode) => usedBarcodes.add(barcode));
      const barcode = joinBarcodes(nextBarcodes);
      const existingProduct = row.existingProductId
        ? MOCK_PRODUCTS.find((product) => product.id === row.existingProductId)
        : undefined;
      const rowWarehouse = row.warehouseValue || defaultWarehouse;
      const newProd: Product = existingProduct ?? {
        id: `p${Date.now()}-${index}`,
        name: row.name,
        price: row.priceSom,
        wholesalePrice: row.wholesalePriceSom,
        costPrice: row.costNumber,
        costCurrency: row.costCurrency,
        barcode,
        customCode: makeProductCode(row.name),
        unit: row.unitValue,
        warehouse: rowWarehouse,
        shelfLocation: "",
        vitrinaQty: 0,
        omborQty: 0,
        salesHistory: [],
      };
      newProd.name = row.name;
      newProd.price = row.priceSom;
      newProd.wholesalePrice = row.wholesalePriceSom;
      newProd.costPrice = row.costNumber;
      newProd.costCurrency = row.costCurrency;
      newProd.barcode = barcode;
      newProd.unit = row.unitValue;
      newProd.warehouse = rowWarehouse;
      newProd.shelfLocation = row.shelfLocationValue;
      newProd.preventBelowCost = row.preventBelowCost;
      if (isBoxUnit(row.unit)) newProd.perBox = row.perBoxNumber;
      newProd.omborQty += row.qtyNumber;
      if (!existingProduct) MOCK_PRODUCTS.push(newProd);

      const rowCostSom = row.qtyNumber * row.costNumber * (MOCK_RATES[row.costCurrency] ?? 1);
      const paidShare =
        sourceEnabled && totalCostSom > 0 ? Math.round((totalPaid * rowCostSom) / totalCostSom) : 0;

      recordProductAddition({
        productName: newProd.name,
        qty: newProd.omborQty,
        unit: newProd.unit,
        price: newProd.price,
        costPrice: costInSom(newProd),
        warehouse: newProd.warehouse,
        shelfLocation: newProd.shelfLocation,
        addedBy: settings.username,
        source: sourceEnabled
          ? {
              ...source,
              paidAmount: String(paidShare),
              note: source.note,
            }
          : {
              enabled: false,
              agentId: "",
              agentName: "",
              agentPhone: "",
              paidAmount: "0",
              note: "",
              sendBotUpdate: false,
            },
      });
    });

    if (
      sourceEnabled &&
      source.sendBotUpdate &&
      source.agentPhone.trim() &&
      source.agentName.trim()
    ) {
      dispatchSupplierReceipt({
        receiptId: `AGENT-${Date.now()}`,
        report: {
          agentId: source.agentId || makeAgentId(),
          agentName: source.agentName.trim(),
          agentPhone: source.agentPhone.trim(),
          totalAmount: totalCostSom,
          paidAmount: totalPaid,
          remainingDebt: Math.max(0, totalCostSom - totalPaid),
        },
        note: source.note.trim() || `${validRows.length} ta tovar bo'yicha prixod`,
      });
    }

    setConfirmOpen(false);
    setShowValidation(false);
    toast.success("Mahsulotlar qabul qilindi", {
      description: `${validRows.length} xil mahsulot qabul qilindi`,
    });
    onDone();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
          <div>
            <div className="text-sm font-semibold">Mahsulot qabul qilish</div>
            <div className="text-[11px] text-muted-foreground">
              Qatorlar ko'payganda faqat shu ro'yxat scroll qiladi.
            </div>
          </div>
          <Button onClick={openConfirm} className="h-8 gap-2 text-xs">
            <Check className="h-4 w-4" />
            Tasdiqlash
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div className="space-y-5">
            {rows.map((row, index) => {
              const productSuggestions = productSuggestionsFor(row);
              const nameInvalid = showValidation && !row.name.trim();
              const qtyInvalid = showValidation && !(parseNumberInput(row.qty) > 0);
              const boxUnit = isBoxUnit(row.unit);
              const perBoxInvalid =
                showValidation && boxUnit && !(parseNumberInput(row.perBox) > 0);
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

                    <div className="mb-2.5 flex min-w-0 items-center justify-between gap-2 pr-8">
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      {row.existingProductId ? (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                          Bazadagi mahsulot tanlandi
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Yangi tovar
                        </span>
                      )}
                    </div>

                    <div
                      className={cn(
                        "grid grid-cols-1 gap-4 pr-8 md:grid-cols-5",
                        boxUnit
                          ? "xl:grid-cols-[minmax(200px,1.5fr)_minmax(160px,0.8fr)_minmax(90px,0.55fr)_minmax(150px,0.95fr)_minmax(150px,0.95fr)_minmax(150px,0.95fr)_minmax(150px,0.95fr)_minmax(130px,0.8fr)_minmax(110px,0.7fr)]"
                          : "xl:grid-cols-[minmax(200px,1.5fr)_minmax(80px,0.5fr)_minmax(90px,0.55fr)_minmax(150px,0.95fr)_minmax(150px,0.95fr)_minmax(150px,0.95fr)_minmax(150px,0.95fr)_minmax(130px,0.8fr)_minmax(110px,0.7fr)]",
                      )}
                    >
                      <Field label="Tovar nomi" required error={nameInvalid}>
                        <div className="relative">
                          <Input
                            value={row.name}
                            onChange={(e) =>
                              updateRow(row.id, {
                                name: e.target.value,
                                existingProductId: undefined,
                              })
                            }
                            placeholder="Mahsulot nomini kiriting"
                            className={cn(
                              "h-9 text-xs",
                              nameInvalid && "border-destructive focus-visible:ring-destructive",
                            )}
                          />
                          {productSuggestions.length > 0 && !row.existingProductId && (
                            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-44 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
                              {productSuggestions.map((product) => {
                                const sourceInfo = latestProductSource(product.name);
                                return (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => selectExistingProduct(row.id, product)}
                                    className="w-full rounded px-2 py-0.5 text-left text-[9px] hover:bg-muted"
                                  >
                                    <div className="font-semibold">{product.name}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {formatSom(costInSom(product))}
                                      {sourceInfo?.agentName ? ` · ${sourceInfo.agentName}` : ""}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </Field>

                      <Field label="Soni" required error={qtyInvalid}>
                        <div className="flex gap-1">
                          <Input
                            value={row.qty}
                            onChange={(e) =>
                              updateRow(row.id, { qty: formatNumberInput(e.target.value) })
                            }
                            placeholder="0"
                            className={cn(
                              "h-9 min-w-0 flex-1 text-right text-xs",
                              qtyInvalid && "border-destructive focus-visible:ring-destructive",
                            )}
                            inputMode="decimal"
                          />
                          {boxUnit && (
                            <Input
                              value={row.perBox}
                              onChange={(e) =>
                                updateRow(row.id, { perBox: formatNumberInput(e.target.value) })
                              }
                              placeholder="O'ramdagi soni"
                              title="1 karobkada nechta dona bo'lishini kiriting"
                              className={cn(
                                "h-9 min-w-0 flex-1 text-right text-xs",
                                perBoxInvalid &&
                                  "border-destructive focus-visible:ring-destructive",
                              )}
                              inputMode="decimal"
                            />
                          )}
                        </div>
                      </Field>

                      <Field label="Birligi">
                        <Select
                          value={row.unit || settings.units[0] || "dona"}
                          onValueChange={(value) => updateRow(row.id, { unit: value })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {settings.units.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Tan narxi">
                        <div className="space-y-1">
                          <CurrencyField
                            value={row.costPrice}
                            onChange={(value) =>
                              updateRow(row.id, { costPrice: formatNumberInput(value) })
                            }
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              focusNextField(e.currentTarget);
                            }}
                            placeholder="0"
                            currency={row.costCurrency || settings.currencies[0] || "UZS"}
                            currencies={settings.currencies}
                            onCurrencyChange={(value) =>
                              updateRow(row.id, { costCurrency: value as Currency })
                            }
                          />
                          <label className="flex select-none items-center gap-1.5 pl-0.5">
                            <Checkbox
                              checked={row.preventBelowCost}
                              onCheckedChange={(checked) =>
                                updateRow(row.id, { preventBelowCost: checked === true })
                              }
                            />
                            <span className="text-[10px] leading-none text-muted-foreground">
                              Tan narxdan past sotilmasin
                            </span>
                          </label>
                        </div>
                      </Field>

                      <Field label="Sotuv narxi">
                        <div className="space-y-1">
                          <CurrencyField
                            value={row.priceMode === "percent" ? row.pricePercent : row.price}
                            onChange={(value) =>
                              updateRow(
                                row.id,
                                row.priceMode === "percent"
                                  ? { pricePercent: formatNumberInput(value) }
                                  : { price: formatNumberInput(value) },
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              if (row.priceMode === "percent") {
                                updateRow(row.id, {
                                  price: computePercentPrice(
                                    row.costPrice,
                                    row.costCurrency,
                                    row.pricePercent,
                                    row.saleCurrency,
                                  ),
                                });
                                setPriceDefault((current) => ({
                                  ...current,
                                  percent: row.pricePercent,
                                }));
                              }
                              focusNextField(e.currentTarget);
                            }}
                            onBlur={
                              row.priceMode === "percent"
                                ? () => {
                                    updateRow(row.id, {
                                      price: computePercentPrice(
                                        row.costPrice,
                                        row.costCurrency,
                                        row.pricePercent,
                                        row.saleCurrency,
                                      ),
                                    });
                                    setPriceDefault((current) => ({
                                      ...current,
                                      percent: row.pricePercent,
                                    }));
                                  }
                                : undefined
                            }
                            placeholder={row.priceMode === "percent" ? "Foiz, %" : "0"}
                            currency={row.saleCurrency || settings.currencies[0] || "UZS"}
                            currencies={settings.currencies}
                            onCurrencyChange={(value) =>
                              updateRow(row.id, { saleCurrency: value as Currency })
                            }
                          />
                          <label className="flex select-none items-center gap-1.5 pl-0.5">
                            <Checkbox
                              checked={row.priceMode === "percent"}
                              onCheckedChange={(checked) => {
                                const mode = checked ? "percent" : "manual";
                                updateRow(row.id, { priceMode: mode });
                                setPriceDefault((current) => ({ ...current, mode }));
                              }}
                            />
                            <span className="text-[10px] leading-none text-muted-foreground">
                              Foizda hisoblash
                            </span>
                          </label>
                        </div>
                      </Field>

                      <Field label="Optom narxi">
                        <div className="space-y-1">
                          <CurrencyField
                            value={
                              row.wholesalePriceMode === "percent"
                                ? row.wholesalePricePercent
                                : row.wholesalePrice
                            }
                            onChange={(value) =>
                              updateRow(
                                row.id,
                                row.wholesalePriceMode === "percent"
                                  ? { wholesalePricePercent: formatNumberInput(value) }
                                  : { wholesalePrice: formatNumberInput(value) },
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              if (row.wholesalePriceMode === "percent") {
                                updateRow(row.id, {
                                  wholesalePrice: computePercentPrice(
                                    row.costPrice,
                                    row.costCurrency,
                                    row.wholesalePricePercent,
                                    row.saleCurrency,
                                  ),
                                });
                                setWholesaleDefault((current) => ({
                                  ...current,
                                  percent: row.wholesalePricePercent,
                                }));
                              }
                              focusNextField(e.currentTarget);
                            }}
                            onBlur={
                              row.wholesalePriceMode === "percent"
                                ? () => {
                                    updateRow(row.id, {
                                      wholesalePrice: computePercentPrice(
                                        row.costPrice,
                                        row.costCurrency,
                                        row.wholesalePricePercent,
                                        row.saleCurrency,
                                      ),
                                    });
                                    setWholesaleDefault((current) => ({
                                      ...current,
                                      percent: row.wholesalePricePercent,
                                    }));
                                  }
                                : undefined
                            }
                            placeholder={row.wholesalePriceMode === "percent" ? "Foiz, %" : "0"}
                            currency={row.saleCurrency || settings.currencies[0] || "UZS"}
                            currencies={settings.currencies}
                            onCurrencyChange={(value) =>
                              updateRow(row.id, { saleCurrency: value as Currency })
                            }
                          />
                          <label className="flex select-none items-center gap-1.5 pl-0.5">
                            <Checkbox
                              checked={row.wholesalePriceMode === "percent"}
                              onCheckedChange={(checked) => {
                                const mode = checked ? "percent" : "manual";
                                updateRow(row.id, { wholesalePriceMode: mode });
                                setWholesaleDefault((current) => ({ ...current, mode }));
                              }}
                            />
                            <span className="text-[10px] leading-none text-muted-foreground">
                              Foizda hisoblash
                            </span>
                          </label>
                        </div>
                      </Field>

                      <Field label="Shtrix kod">
                        {splitBarcodes(row.barcode).length >= 2 ? (
                          <div className="flex gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 flex-1 justify-between px-2 text-xs font-normal"
                                >
                                  <span className="truncate">
                                    {splitBarcodes(row.barcode).length} ta kod
                                  </span>
                                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-56 p-1">
                                {splitBarcodes(row.barcode).map((code) => (
                                  <div
                                    key={code}
                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                                  >
                                    <span className="flex-1 truncate text-xs font-medium">
                                      {code}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeBarcodeChip(row.id, code)}
                                      className="shrink-0 text-muted-foreground hover:text-destructive"
                                      title="Shtrix kodni o'chirish"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </PopoverContent>
                            </Popover>
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
                        ) : (
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
                        )}
                      </Field>

                      <Field label="Ombor">
                        <Select
                          value={row.warehouse || defaultWarehouse}
                          onValueChange={(value) => updateRow(row.id, { warehouse: value })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {settings.warehouses.map((w) => (
                              <SelectItem key={w} value={w}>
                                {w}
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
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__empty__">Tanlanmagan</SelectItem>
                            {settings.shelfLocations.map((loc) => (
                              <SelectItem key={loc} value={loc}>
                                {loc}
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Qabul ma'lumotlari</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/10 p-3 text-center">
              <div className="text-sm text-muted-foreground">
                {validRows.length} ta mahsulot
              </div>
              <div className="text-xl font-bold">{formatSom(totalCostSom)}</div>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                Kimdan qabul qilindi?
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={!source.enabled ? "default" : "outline"}
                  onClick={() =>
                    setSource({
                      enabled: false,
                      agentId: makeAgentId(),
                      agentName: "",
                      agentPhone: "",
                      paidAmount: "0",
                      note: "",
                      sendBotUpdate: true,
                    })
                  }
                >
                  Agentsiz
                </Button>
                <Button
                  type="button"
                  variant={source.enabled ? "default" : "outline"}
                  onClick={() => {
                    if (source.enabled) return;
                    setSource((current) => ({ ...current, enabled: true }));
                  }}
                >
                  Agent tanlash
                </Button>
              </div>
            </div>

            {source.enabled && (
              <div className="space-y-3 rounded-lg border p-3">
                <div>
                  <Label className="mb-1 block text-xs">Agent</Label>
                  <Select
                    value={source.agentName.trim() ? source.agentId : "__none__"}
                    onValueChange={(value) => {
                      const agent = agents.find((item) => item.id === value);
                      if (!agent) return;
                      setSource((current) => ({
                        ...current,
                        enabled: true,
                        agentId: agent.id,
                        agentName: agent.name,
                        agentPhone: agent.phone,
                        sendBotUpdate: agent.botEnabled,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Agent tanlang">
                        {source.agentName.trim() || undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {source.agentName.trim() && !selectedAgent && (
                        <SelectItem value={source.agentId}>
                          {source.agentName} · avtomatik aniqlandi
                        </SelectItem>
                      )}
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {source.agentName.trim() && !selectedAgent && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Bu mahsulotni oldin shu agent olib kelgan — avtomatik tanlandi.
                    </div>
                  )}
                </div>

                <div>
                  <Label className="mb-1 block text-xs">Hozir necha so'm to'laysiz?</Label>
                  <Input
                    type="number"
                    value={source.paidAmount}
                    onChange={(e) => setSource({ ...source, paidAmount: e.target.value })}
                    className="h-9"
                    placeholder="0"
                  />
                  {(() => {
                    const paid = Math.max(0, parseNumberInput(source.paidAmount) || 0);
                    const remaining = totalCostSom - paid;
                    const overpaid = remaining < 0;
                    return (
                      <div
                        className={cn(
                          "mt-1 text-xs font-medium",
                          overpaid ? "text-destructive" : "text-success",
                        )}
                      >
                        {overpaid
                          ? `Ortiqcha to'lov: ${formatSom(Math.abs(remaining))}`
                          : `Qoldiq: ${formatSom(remaining)}`}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Qaerdan to'lanmoqda?
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={deductFromCashbox ? "default" : "outline"}
                      onClick={() => setDeductFromCashbox(true)}
                    >
                      Kassadan
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!deductFromCashbox ? "default" : "outline"}
                      onClick={() => setDeductFromCashbox(false)}
                    >
                      Keyinroq
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {showNoteField ? (
              <div>
                <Label className="mb-1 block text-xs">Izoh</Label>
                <Input
                  value={source.note}
                  onChange={(e) => setSource({ ...source, note: e.target.value })}
                  placeholder="Ixtiyoriy izoh"
                  className="h-9 text-sm"
                  autoFocus
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNoteField(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                + Izoh qo'shish
              </button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={finalizeReceiving}
            >
              Qabul qilish ({formatSom(totalCostSom)})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  onKeyDown,
  onBlur,
  placeholder,
  invalid,
  currency,
  currencies,
  onCurrencyChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  currency: string;
  currencies: string[];
  onCurrencyChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        className={cn(
          "h-9 pr-14 text-right text-xs",
          invalid && "border-destructive focus-visible:ring-destructive",
        )}
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
