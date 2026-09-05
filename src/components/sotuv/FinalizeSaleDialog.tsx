import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatNumberInput, parseNumberInput } from "@/lib/utils";
import {
  User,
  HandCoins,
  UserPlus,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Wallet,
  Landmark,
  Building2,
  Split,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  formatSom,
  MOCK_CREDIT_CUSTOMERS,
  MOCK_LOYAL_CUSTOMERS,
  MOCK_PAYMENT_METHODS,
  MOCK_RATES,
  type CreditCustomer,
  type CustomerType,
  type Currency,
  type LoyalCustomer,
  type PaymentBreakdownRow,
  type PaymentKind,
  type PaymentMethod,
} from "@/lib/mock-data";
import { NasiyachiPicker, SelectedCustomerCard } from "./NasiyachiPicker";
import {
  accrueLoyalCashback,
  addCreditCustomer,
  addCreditSale,
  fullCustomerName,
  searchLoyalCustomers,
} from "@/lib/data-actions";
import { toast } from "sonner";
import type { FinalizeSaleDetails } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (details: FinalizeSaleDetails) => void;
};

const TYPE_OPTIONS: { value: CustomerType; label: string; icon: React.ReactNode }[] = [
  { value: "oddiy", label: "Oddiy", icon: <User className="h-4 w-4" /> },
  { value: "nasiya", label: "Nasiya", icon: <HandCoins className="h-4 w-4" /> },
];

const CURRENCY_OPTIONS = ["USD", "RUB", "EUR"] as const;
const DUE_PRESETS = [7, 15, 30] as const;

const MONTHS_UZ = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

function toDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dueDateAfter(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

function formatDueLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()}-${MONTHS_UZ[date.getMonth()]}, ${date.getFullYear()}`;
}

type DueMode = (typeof DUE_PRESETS)[number] | "custom";
type InvalidField = "customer" | "due" | "payment" | null;

// ─── To'lov usullari — umumiy komponent ─────────────────────────────────────
// Ro'yxat MOCK_PAYMENT_METHODS'dan (sozlamalar) keladi, kodga qattiq
// yozilmagan. Ikkala ko'rinishda ham (Oddiy to'lov, Nasiya oldindan to'lov)
// shu bitta blok ishlatiladi — faqat `mode` xulq-atvorni farqlaydi.

const KIND_ICON: Record<PaymentKind, typeof Wallet> = {
  cash: Wallet,
  card: CreditCard,
  currency: Landmark,
  transfer: Building2,
  wallet: HandCoins,
};

function iconOf(method: PaymentMethod) {
  return KIND_ICON[method.kind] ?? Wallet;
}

function methodById(id: string) {
  return MOCK_PAYMENT_METHODS.find((item) => item.id === id) ?? MOCK_PAYMENT_METHODS[0];
}

const PINNED_METHODS = MOCK_PAYMENT_METHODS.filter((m) => m.isPinned).sort(
  (a, b) => a.sortOrder - b.sortOrder,
);
const HIDDEN_METHODS = MOCK_PAYMENT_METHODS.filter((m) => !m.isPinned).sort(
  (a, b) => a.sortOrder - b.sortOrder,
);

const CARD_NETWORKS = ["Humo", "Uzcard"] as const;

/** Bitta to'lov qatori. Valyutada `rate` — qo'lda tahrirlanadigan kurs. */
type PayRow = {
  id: string;
  methodId: string;
  amount: string;
  currency: string;
  rate: string;
  rateTouched: boolean;
  /** Terminal (karta) qatorlarida — qaysi tarmoq orqali o'tkazilgani */
  cardNetwork: (typeof CARD_NETWORKS)[number];
};

function makePayRow(methodId: string): PayRow {
  return {
    id: `${methodId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    methodId,
    amount: "",
    currency: "USD",
    rate: formatInputNumber(MOCK_RATES.USD ?? 1),
    rateTouched: false,
    cardNetwork: "Humo",
  };
}

/** Qator summasi so'mda — valyuta qatorlari qator kursiga ko'paytiriladi. */
function payRowSom(row: PayRow) {
  const amount = parsePaymentValue(row.amount);
  const method = methodById(row.methodId);
  if (method.kind !== "currency") return amount;
  return amount * parsePaymentValue(row.rate);
}

/**
 * Bitta usul, to'liq summani yopishi kutilgan holatda (Oddiy to'lov,
 * aralashsiz) maydon bo'sh qoldirilsa — aniq summa qabul qilinadi.
 * Aralash to'lovda yoki nasiya oldindan to'lovda avto to'ldirish yo'q —
 * kassir aynan qancha kiritganini yozadi.
 */
function effectiveRows(rows: PayRow[], total: number, autoFillSingle: boolean): PayRow[] {
  if (!autoFillSingle || rows.length !== 1) return rows;
  const row = rows[0];
  if (row.amount.trim() !== "") return rows;
  const method = methodById(row.methodId);
  const rate = parsePaymentValue(row.rate) || 1;
  const filled = method.kind === "currency" ? total / rate : total;
  return [{ ...row, amount: formatInputNumber(filled) }];
}

/** Qatorlarni so'm bo'yicha `total`dan oshmaydigan qilib breakdownga yig'adi — ortig'i qaytim hisoblanadi, breakdownga kirmaydi. */
function payRowsToBreakdown(
  rows: PayRow[],
  total: number,
): NonNullable<FinalizeSaleDetails["paymentBreakdown"]> {
  let cash = 0;
  let card = 0;
  let transfer = 0;
  let wallet = 0;
  let currencyAmount = 0;
  let currencyCode: string | undefined;
  let currencyInSom = 0;
  const detailRows: PaymentBreakdownRow[] = [];
  let applied = 0;

  for (const row of rows) {
    const method = methodById(row.methodId);
    const rawSom = payRowSom(row);
    if (rawSom <= 0) continue;

    const remaining = Math.max(0, total - applied);
    const som = Math.min(rawSom, remaining);
    applied += som;
    if (som <= 0) continue;

    const ratio = som / rawSom;

    if (method.kind === "cash") cash += som;
    else if (method.kind === "card") card += som;
    else if (method.kind === "transfer") transfer += som;
    else if (method.kind === "wallet") wallet += som;
    else if (method.kind === "currency") {
      currencyAmount += parsePaymentValue(row.amount) * ratio;
      currencyCode = row.currency;
      currencyInSom += som;
    }

    detailRows.push({
      methodId: method.id,
      methodName: method.name,
      amountSom: som,
      currency: method.kind === "currency" ? row.currency : undefined,
      currencyAmount:
        method.kind === "currency" ? parsePaymentValue(row.amount) * ratio : undefined,
      rate: method.kind === "currency" ? parsePaymentValue(row.rate) : undefined,
      rateSource: method.kind === "currency" ? (row.rateTouched ? "manual" : "system") : undefined,
      cardType: method.kind === "card" ? row.cardNetwork : undefined,
    });
  }

  return {
    cash,
    card,
    transfer,
    wallet,
    currencyAmount,
    currencyCode,
    currencyInSom,
    rows: detailRows,
  };
}

function PaymentMethodsBlock({
  mode,
  rows,
  onRows,
  invalid,
}: {
  mode: "regular" | "prepay";
  rows: PayRow[];
  onRows: (updater: (current: PayRow[]) => PayRow[]) => void;
  invalid?: boolean;
}) {
  const single = rows.length === 1 ? rows[0] : null;
  const isMixed = rows.length > 1;
  // "Boshqa" ichidagi usul tanlangan bo'lsa yoki aralash faol bo'lsa,
  // guruh avtomatik ochiq turadi — holat alohida saqlanmaydi.
  const otherSelected =
    isMixed || (single !== null && HIDDEN_METHODS.some((m) => m.id === single.methodId));
  const [manuallyOpened, setManuallyOpened] = React.useState(false);
  const otherGroupOpen = otherSelected || manuallyOpened;

  React.useEffect(() => {
    if (otherSelected) setManuallyOpened(false);
  }, [otherSelected]);

  const chooseSingle = (methodId: string) => {
    if (single?.methodId === methodId) {
      onRows(() => []);
      return;
    }
    onRows(() => [makePayRow(methodId)]);
  };

  const toggleMixed = () => {
    if (isMixed) {
      onRows(() => []);
      return;
    }
    onRows(() => [makePayRow(PINNED_METHODS[0]?.id ?? "cash")]);
  };

  const updateRow = (id: string, patch: Partial<PayRow>) => {
    onRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id: string) => {
    onRows((current) => current.filter((row) => row.id !== id));
  };

  const addMixedRow = () => {
    const used = new Set(rows.map((row) => row.methodId));
    const next = MOCK_PAYMENT_METHODS.map((m) => m.id).find((id) => !used.has(id));
    if (!next) return;
    onRows((current) => [...current, makePayRow(next)]);
  };

  const jamiOlindi = rows.reduce((sum, row) => sum + payRowSom(row), 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {PINNED_METHODS.map((method) => (
          <MethodTile
            key={method.id}
            method={method}
            active={!isMixed && single?.methodId === method.id}
            onClick={() => chooseSingle(method.id)}
          />
        ))}
        <MethodTile
          label="Boshqa"
          icon={ChevronDown}
          active={otherGroupOpen}
          onClick={() => {
            if (otherSelected) {
              onRows(() => []);
              return;
            }
            setManuallyOpened((current) => !current);
          }}
        />
      </div>

      {otherGroupOpen && (
        <div className="grid grid-cols-3 gap-2">
          {HIDDEN_METHODS.map((method) => (
            <MethodTile
              key={method.id}
              method={method}
              active={!isMixed && single?.methodId === method.id}
              onClick={() => chooseSingle(method.id)}
            />
          ))}
          <MethodTile label="Aralash to'lov" icon={Split} active={isMixed} onClick={toggleMixed} />
        </div>
      )}

      {single &&
        (mode === "prepay" ||
          single.methodId === "currency" ||
          methodById(single.methodId).kind === "card") && (
          <SingleRowFields
            row={single}
            onChange={(patch) => updateRow(single.id, patch)}
            hideAmount={
              mode === "regular" &&
              (single.methodId === "currency" || methodById(single.methodId).kind === "card")
            }
          />
        )}

      {isMixed && (
        <div className="space-y-2">
          {rows.map((row) => (
            <MixedRow
              key={row.id}
              row={row}
              onChange={(patch) => updateRow(row.id, patch)}
              onRemove={() => removeRow(row.id)}
            />
          ))}

          {rows.length < MOCK_PAYMENT_METHODS.length && (
            <button
              type="button"
              onClick={addMixedRow}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0836B0] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              To'lov usuli qo'shish
            </button>
          )}

          <div className="flex items-center justify-between rounded-md bg-[#F4F5F9] px-3 py-2 text-sm">
            <span className="text-[#737D91]">Jami olindi</span>
            <span data-no-translate className="font-semibold tabular-nums text-[#222C3B]">
              {formatSom(jamiOlindi)}
            </span>
          </div>
        </div>
      )}

      {invalid && rows.length === 0 && (
        <div className="text-xs font-medium text-[#C43B3B]">To'lov usulini tanlang</div>
      )}
    </div>
  );
}

function MethodTile({
  method,
  label,
  icon,
  active,
  onClick,
}: {
  method?: PaymentMethod;
  label?: string;
  icon?: typeof Wallet;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = icon ?? (method ? iconOf(method) : Wallet);
  const title = label ?? method?.name ?? "";
  const subtitle = method?.subtitle;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-md border px-1 py-2.5 transition-colors",
        active
          ? "border-2 border-[#0836B0] bg-[#0836B0]/10"
          : "border-[#AEB9D4] bg-[#FDFDFD] hover:border-[#0836B0]",
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-[#0836B0]" : "text-[#737D91]")} />
      <span
        className={cn(
          "text-center text-[11px] font-semibold leading-tight",
          active ? "text-[#0836B0]" : "text-[#222C3B]",
        )}
      >
        {title}
      </span>
      {subtitle && (
        <span className="text-center text-[10px] leading-tight text-[#737D91]">{subtitle}</span>
      )}
    </button>
  );
}

const FIELD_CLASS =
  "h-10 border-[#AEB9D4] bg-[#FDFDFD] text-right tabular-nums text-[#222C3B] placeholder:text-[#737D91]";

/** cash / card / transfer / wallet — bitta summa maydoni. currency — kurs bilan. */
function SingleRowFields({
  row,
  onChange,
  hideAmount,
}: {
  row: PayRow;
  onChange: (patch: Partial<PayRow>) => void;
  hideAmount?: boolean;
}) {
  const method = methodById(row.methodId);
  if (method.kind === "card") {
    return (
      <div className="flex items-center gap-2">
        <CardNetworkToggle
          value={row.cardNetwork}
          onChange={(cardNetwork) => onChange({ cardNetwork })}
        />
        {!hideAmount && (
          <Input
            value={row.amount}
            onChange={(event) => onChange({ amount: formatNumberInput(event.target.value) })}
            inputMode="decimal"
            placeholder="0"
            className={cn(FIELD_CLASS, "flex-1")}
          />
        )}
      </div>
    );
  }
  if (method.kind !== "currency") {
    return (
      <Input
        value={row.amount}
        onChange={(event) => onChange({ amount: formatNumberInput(event.target.value) })}
        inputMode="decimal"
        placeholder="0"
        className={FIELD_CLASS}
      />
    );
  }
  return <CurrencyFields row={row} onChange={onChange} hideAmount={hideAmount} />;
}

function CardNetworkToggle({
  value,
  onChange,
}: {
  value: (typeof CARD_NETWORKS)[number];
  onChange: (network: (typeof CARD_NETWORKS)[number]) => void;
}) {
  return (
    <div className="flex flex-shrink-0 rounded-md border border-[#AEB9D4] p-0.5">
      {CARD_NETWORKS.map((network) => (
        <button
          key={network}
          type="button"
          onClick={() => onChange(network)}
          className={cn(
            "rounded px-2.5 py-1.5 text-xs font-semibold transition-colors",
            value === network
              ? "bg-[#0836B0]/10 text-[#0836B0]"
              : "text-[#737D91] hover:text-[#222C3B]",
          )}
        >
          {network}
        </button>
      ))}
    </div>
  );
}

function CurrencyFields({
  row,
  onChange,
  hideAmount,
}: {
  row: PayRow;
  onChange: (patch: Partial<PayRow>) => void;
  hideAmount?: boolean;
}) {
  const systemRate = MOCK_RATES[row.currency] ?? 1;
  const currentRate = parsePaymentValue(row.rate);
  const diffPercent = systemRate > 0 ? (Math.abs(currentRate - systemRate) / systemRate) * 100 : 0;
  const rateDiffers = row.rateTouched && diffPercent > 3;

  return (
    <div>
      <div className="flex items-center gap-2">
        <Select
          value={row.currency}
          onValueChange={(value) =>
            onChange({
              currency: value,
              rate: formatInputNumber(MOCK_RATES[value] ?? 1),
              rateTouched: false,
            })
          }
        >
          <SelectTrigger className="h-10 w-[104px] border-[#AEB9D4] bg-[#FDFDFD] text-[#222C3B]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_OPTIONS.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={row.rate}
          onChange={(event) =>
            onChange({ rate: formatNumberInput(event.target.value), rateTouched: true })
          }
          inputMode="decimal"
          aria-label="Kurs"
          className={cn(FIELD_CLASS, hideAmount ? "flex-1" : "w-[120px]")}
        />
        {!hideAmount && (
          <Input
            value={row.amount}
            onChange={(event) => onChange({ amount: formatNumberInput(event.target.value) })}
            inputMode="decimal"
            placeholder="0"
            className={cn(FIELD_CLASS, "flex-1")}
          />
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        {row.rateTouched ? (
          <button
            type="button"
            onClick={() => onChange({ rate: formatInputNumber(systemRate), rateTouched: false })}
            className="text-[#737D91]"
          >
            Tizim kursi {formatInputNumber(systemRate)} ·{" "}
            <span className="font-medium text-[#0836B0]">Tiklash</span>
          </button>
        ) : (
          <span />
        )}
        <span data-no-translate className="text-[#737D91]">
          So'mda {formatSom(payRowSom(row))}
        </span>
      </div>
      {rateDiffers && (
        <div className="mt-0.5 text-xs font-medium text-[#C43B3B]">
          Tizim kursidan {Math.round(diffPercent)}% farq qiladi
        </div>
      )}
    </div>
  );
}

function MixedRow({
  row,
  onChange,
  onRemove,
}: {
  row: PayRow;
  onChange: (patch: Partial<PayRow>) => void;
  onRemove: () => void;
}) {
  const method = methodById(row.methodId);
  const Icon = iconOf(method);

  if (method.kind === "currency") {
    return (
      <div className="rounded-md border border-[#AEB9D4] bg-[#FDFDFD] px-2.5 py-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 flex-shrink-0 text-[#737D91]" />
          <div className="min-w-0 flex-1">
            <CurrencyFields row={row} onChange={onChange} />
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Qatorni o'chirish"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-[#737D91] hover:bg-[#0836B0]/5 hover:text-[#222C3B]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#AEB9D4] bg-[#FDFDFD] px-2.5 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 flex-shrink-0 text-[#737D91]" />
        <span className="flex-1 truncate text-sm text-[#222C3B]">{method.name}</span>
        {method.kind === "card" && (
          <CardNetworkToggle
            value={row.cardNetwork}
            onChange={(cardNetwork) => onChange({ cardNetwork })}
          />
        )}
        <Input
          value={row.amount}
          onChange={(event) => onChange({ amount: formatNumberInput(event.target.value) })}
          inputMode="decimal"
          placeholder="0"
          className={cn(FIELD_CLASS, "w-[160px]")}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Qatorni o'chirish"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-[#737D91] hover:bg-[#0836B0]/5 hover:text-[#222C3B]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Asosiy dialog ───────────────────────────────────────────────────────────

export function FinalizeSaleDialog({ open, onOpenChange, total, onConfirm }: Props) {
  const [type, setType] = React.useState<CustomerType>("oddiy");
  const [picked, setPicked] = React.useState<CreditCustomer | null>(null);
  const [loyalQuery, setLoyalQuery] = React.useState("");
  const [loyalPicked, setLoyalPicked] = React.useState<LoyalCustomer | null>(null);
  const loyalResults = React.useMemo(
    () => (loyalPicked ? [] : searchLoyalCustomers(loyalQuery)),
    [loyalQuery, loyalPicked],
  );
  const [addOpen, setAddOpen] = React.useState(false);
  const [dueMode, setDueMode] = React.useState<DueMode>(30);
  const [customDue, setCustomDue] = React.useState("");
  const [note, setNote] = React.useState("");
  const [payRows, setPayRows] = React.useState<PayRow[]>([]);
  const [prepayRows, setPrepayRows] = React.useState<PayRow[]>([]);
  const [generalDebtTarget, setGeneralDebtTarget] = React.useState("general");
  const [invalidField, setInvalidField] = React.useState<InvalidField>(null);
  const [limitWarnOpen, setLimitWarnOpen] = React.useState(false);
  const givenInputRef = React.useRef<HTMLInputElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const dueInputRef = React.useRef<HTMLInputElement>(null);

  // TODO: backend tayyor bo'lganda shu snapshot o'rniga API/hook chaqiriladi.
  // Ro'yxat modal ochilganda bir marta olinadi, filtrlash frontendda bo'ladi.
  const [customers, setCustomers] = React.useState<CreditCustomer[]>([]);

  React.useEffect(() => {
    if (open) {
      setCustomers([...MOCK_CREDIT_CUSTOMERS]);
      setPayRows((current) => (current.length > 0 ? current : [makePayRow("cash")]));
      return;
    }
    setType("oddiy");
    setPicked(null);
    setLoyalQuery("");
    setLoyalPicked(null);
    setDueMode(30);
    setCustomDue("");
    setNote("");
    setPayRows([]);
    setPrepayRows([]);
    setGeneralDebtTarget("general");
    setInvalidField(null);
  }, [open]);

  // Xaridor turi almashganda to'lov holati toza boshlansin.
  // Oddiyda "Naqd" boshlang'ich tanlov sifatida turadi — shu bilan "Mijoz
  // berdi / Qaytim" bloki darrov ko'rinadi va Enter/F1-F3 ishlay boshlaydi.
  React.useEffect(() => {
    setPayRows(type === "oddiy" ? [makePayRow("cash")] : []);
    setPrepayRows([]);
    setInvalidField(null);
    if (type === "nasiya") searchInputRef.current?.focus();
  }, [type]);

  React.useEffect(() => {
    setGeneralDebtTarget("general");
  }, [picked?.id]);

  const isNasiya = type === "nasiya";
  const hasObjects = Boolean(picked?.objects?.length);
  const selectedObject =
    generalDebtTarget === "general"
      ? null
      : ((picked?.objects ?? []).find((item) => item.id === generalDebtTarget) ?? null);

  const resolvedDueDate = dueMode === "custom" ? customDue : dueDateAfter(dueMode);

  // ── Hisob-kitob: bitta manba, ikkala ko'rinish ham shundan foydalanadi ────
  // Oddiy to'lovda yagona usul tanlangan bo'lsa, bo'sh maydon "aniq summa"
  // sifatida qabul qilinadi (spek 2-d). Nasiya oldindan to'lovda va aralash
  // to'lovda avto to'ldirish yo'q.
  const regularRows = React.useMemo(() => effectiveRows(payRows, total, true), [payRows, total]);
  const activeRows = isNasiya ? prepayRows : regularRows;
  const jamiOlindi = activeRows.reduce((sum, row) => sum + payRowSom(row), 0);
  const nasiyagaYoziladi = Math.max(0, total - jamiOlindi);
  const qaytim = Math.max(0, jamiOlindi - total);
  const yangiQarzi = picked ? picked.currentDebt + nasiyagaYoziladi : 0;
  const limit = picked?.limit ?? 0;
  const overLimit = isNasiya && limit > 0 && yangiQarzi > limit;

  const singleRegular = !isNasiya && payRows.length === 1 ? payRows[0] : null;
  const singleRegularMethod = singleRegular ? methodById(singleRegular.methodId) : null;
  const showGivenBlock =
    !isNasiya &&
    singleRegular !== null &&
    (singleRegularMethod?.kind === "cash" || singleRegularMethod?.kind === "currency");
  const showMixedChangeLine = !isNasiya && payRows.length > 1;

  const givenRate =
    singleRegularMethod?.kind === "currency"
      ? parsePaymentValue(singleRegular?.rate ?? "") ||
        MOCK_RATES[singleRegular?.currency ?? "USD"] ||
        1
      : 1;
  const exactGiven = givenRate > 0 ? total / givenRate : 0;
  const givenEmpty = !singleRegular || singleRegular.amount.trim() === "";

  const canSubmitRegular = !isNasiya && payRows.length > 0 && nasiyagaYoziladi === 0;

  const fillFullAmount = () => {
    if (prepayRows.length === 0) {
      setPrepayRows([{ ...makePayRow("cash"), amount: formatInputNumber(total) }]);
      return;
    }
    setPrepayRows((current) =>
      current.map((row, index) => {
        if (index > 0) return { ...row, amount: "" };
        const method = methodById(row.methodId);
        const rate = parsePaymentValue(row.rate) || 1;
        return {
          ...row,
          amount: formatInputNumber(method.kind === "currency" ? total / rate : total),
        };
      }),
    );
  };

  // ── Yakunlash ──────────────────────────────────────────────────────────────
  const submitNasiya = () => {
    if (!picked) return;
    const paymentBreakdown = payRowsToBreakdown(activeRows, total);
    const paidAmount = Math.min(total, jamiOlindi);

    // Qarz qolmasa nasiya yozuvi yaratilmaydi — bu oddiy to'liq to'lovga aylanadi
    if (nasiyagaYoziladi > 0) {
      addCreditSale(picked, total, {
        note,
        dueDate: resolvedDueDate,
        paidAmount,
        objectId: selectedObject?.id,
        objectName: selectedObject?.name,
      });
      toast.success(`Nasiyaga yozildi: ${fullCustomerName(picked)}`, {
        description: formatSom(nasiyagaYoziladi),
      });
    } else if (qaytim > 0) {
      toast.success("Savdo to'liq to'landi", { description: `Qaytim: ${formatSom(qaytim)}` });
    } else {
      toast.success("Savdo to'liq to'landi");
    }

    const loyalCashbackEarned = loyalPicked
      ? accrueLoyalCashback(loyalPicked.id, total)
      : undefined;
    if (loyalPicked && loyalCashbackEarned) {
      toast.success(`Cashback yozildi: ${fullCustomerName(loyalPicked)}`, {
        description: `+${formatSom(loyalCashbackEarned)}`,
      });
    }

    onConfirm({
      customerType: "nasiya",
      customerId: picked.id,
      customerName: fullCustomerName(picked),
      customerPhone: picked.phone,
      loyalCustomerId: loyalPicked?.id,
      loyalCardNumber: loyalPicked?.cardNumber,
      loyalCustomerName: loyalPicked ? fullCustomerName(loyalPicked) : undefined,
      loyalCashbackEarned,
      paidAmount,
      debtAmount: nasiyagaYoziladi,
      paymentBreakdown,
    });
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (isNasiya) {
      if (!picked) {
        setInvalidField("customer");
        searchInputRef.current?.focus();
        return;
      }
      if (!resolvedDueDate) {
        setInvalidField("due");
        dueInputRef.current?.focus();
        return;
      }
      setInvalidField(null);
      if (overLimit) {
        setLimitWarnOpen(true);
        return;
      }
      submitNasiya();
      return;
    }

    if (payRows.length === 0) {
      setInvalidField("payment");
      return;
    }
    if (!canSubmitRegular) {
      setInvalidField("payment");
      givenInputRef.current?.focus();
      return;
    }

    const paymentBreakdown = payRowsToBreakdown(regularRows, total);
    const loyalCashbackEarned = loyalPicked
      ? accrueLoyalCashback(loyalPicked.id, total)
      : undefined;
    if (loyalPicked && loyalCashbackEarned) {
      toast.success(`Cashback yozildi: ${fullCustomerName(loyalPicked)}`, {
        description: `+${formatSom(loyalCashbackEarned)}`,
      });
    }

    onConfirm({
      customerType: "oddiy",
      loyalCustomerId: loyalPicked?.id,
      loyalCardNumber: loyalPicked?.cardNumber,
      loyalCustomerName: loyalPicked ? fullCustomerName(loyalPicked) : undefined,
      loyalCashbackEarned,
      paidAmount: total,
      debtAmount: 0,
      paymentBreakdown,
    });
    onOpenChange(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "F7" && isNasiya) {
      event.preventDefault();
      setAddOpen(true);
      return;
    }
    if (!isNasiya && (event.key === "F1" || event.key === "F2" || event.key === "F3")) {
      const index = event.key === "F1" ? 0 : event.key === "F2" ? 1 : 2;
      const method = PINNED_METHODS[index];
      if (method) {
        event.preventDefault();
        setPayRows([makePayRow(method.id)]);
      }
      return;
    }
    if (event.key === "Enter") {
      const target = event.target as HTMLElement;
      if (target instanceof HTMLTextAreaElement) return;
      // Mijoz qidiruvi kabi boshqa maydonlarda Enter o'z ishini qilsin
      if (!isNasiya && target instanceof HTMLInputElement && target !== givenInputRef.current)
        return;
      event.preventDefault();
      handleConfirm();
    }
  };

  const handleNewCustomer = (customer: CreditCustomer) => {
    addCreditCustomer(customer);
    setCustomers((current) => [customer, ...current]);
    setPicked(customer);
    setInvalidField(null);
    toast.success("Yangi nasiyachi qo'shildi");
  };

  const confirmLabel =
    isNasiya && nasiyagaYoziladi <= 0 ? "Yakunlash · Enter" : "Nasiyaga berish · Enter";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (isNasiya) searchInputRef.current?.focus();
            else givenInputRef.current?.focus();
          }}
          className={cn(
            "flex max-h-[92dvh] flex-col gap-0 overflow-hidden border-[#AEB9D4] bg-[#FDFDFD] p-0 transition-[width] duration-200",
            isNasiya ? "w-[960px] max-w-[96vw]" : "w-[600px] max-w-[96vw]",
          )}
        >
          <DialogHeader className="flex-shrink-0 space-y-0 border-b border-[#AEB9D4] px-5 py-3">
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle className="text-base font-semibold text-[#222C3B]">
                Savdoni yakunlash
              </DialogTitle>
              <span className="text-xs text-[#737D91]">Esc — bekor</span>
            </div>
          </DialogHeader>

          <div className="flex flex-shrink-0 items-end justify-between gap-4 border-b border-[#AEB9D4] px-5 py-3">
            <div>
              <div className="text-xs text-[#737D91]">To'lash uchun</div>
              <div
                data-no-translate
                className="text-[30px] font-bold leading-none tabular-nums text-[#222C3B]"
              >
                {formatSom(total)}
              </div>
            </div>

            <div className="flex flex-shrink-0 rounded-md border border-[#AEB9D4] p-0.5">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-4 py-1.5 text-sm transition-colors",
                    type === opt.value
                      ? "bg-[#0836B0]/10 font-semibold text-[#0836B0]"
                      : "text-[#737D91] hover:text-[#222C3B]",
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 border-b border-[#AEB9D4] bg-[#F4F5F9] px-5 py-2">
            <Star className="h-4 w-4 flex-shrink-0 text-amber-500" />
            {loyalPicked ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className="truncate text-sm font-semibold text-[#222C3B]">
                  {fullCustomerName(loyalPicked)}
                </span>
                <span className="font-mono text-[#737D91]">{loyalPicked.cardNumber}</span>
                <span className="text-[#737D91]">
                  {loyalPicked.discountPercent}% skidka · {loyalPicked.cashbackPercent}% cashback
                </span>
                <span className="font-semibold text-[#0836B0]">
                  Balans: {formatSom(loyalPicked.cashbackBalance)}
                </span>
                <button
                  type="button"
                  onClick={() => setLoyalPicked(null)}
                  className="ml-auto flex-shrink-0 text-[#737D91] hover:text-destructive"
                  aria-label="Sodiq mijozni bekor qilish"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Label className="flex-shrink-0 text-xs font-medium text-[#222C3B]">
                  Sodiq mijoz:
                </Label>
                <div className="relative min-w-0 flex-1">
                  <Input
                    value={loyalQuery}
                    onChange={(e) => setLoyalQuery(e.target.value)}
                    placeholder="Karta raqami, tel yoki ism-familya bo'yicha qidirish..."
                    className="h-8 border-[#AEB9D4] bg-white text-xs"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.stopPropagation();
                        if (loyalResults.length > 0) {
                          setLoyalPicked(loyalResults[0]);
                          setLoyalQuery("");
                        }
                      }
                    }}
                  />
                  {loyalQuery.trim() && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border bg-white shadow-md">
                      {loyalResults.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Sodiq mijoz topilmadi
                        </div>
                      ) : (
                        loyalResults.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => {
                              setLoyalPicked(customer);
                              setLoyalQuery("");
                            }}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60"
                          >
                            <span className="font-medium">{fullCustomerName(customer)}</span>
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-muted-foreground">
                                {customer.cardNumber}
                              </span>
                              <span className="font-semibold text-[#0836B0]">
                                {formatSom(customer.cashbackBalance)}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {isNasiya ? (
            <div className="flex min-h-0 flex-1 items-stretch">
              {/* ── Chap ustun: nasiyachi ─────────────────────────────────── */}
              <div className="flex min-h-0 w-[402px] flex-shrink-0 flex-col gap-2 border-r border-[#AEB9D4] bg-[#F4F5F9] p-4">
                <div className="flex flex-shrink-0 items-center justify-between gap-2">
                  <Label className="text-sm text-[#222C3B]">Nasiyachi</Label>
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="text-xs font-semibold text-[#0836B0] hover:underline"
                  >
                    + Yangi nasiyachi · F7
                  </button>
                </div>

                <NasiyachiPicker
                  customers={customers}
                  inputRef={searchInputRef}
                  collapsed={Boolean(picked)}
                  invalid={invalidField === "customer"}
                  onSelect={(customer) => {
                    setPicked(customer);
                    setInvalidField(null);
                  }}
                  onAddNew={() => setAddOpen(true)}
                />

                {picked && (
                  <SelectedCustomerCard
                    customer={picked}
                    saleDebt={nasiyagaYoziladi}
                    onClear={() => setPicked(null)}
                  />
                )}
              </div>

              {/* ── O'ng ustun: muddat va oldindan to'lov ─────────────────── */}
              <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="space-y-2">
                  <Label className="text-sm text-[#222C3B]">To'lov muddati</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {DUE_PRESETS.map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          setDueMode(days);
                          setInvalidField(null);
                        }}
                        className={cn(
                          "rounded-md border px-2 py-2 text-sm font-semibold transition-colors",
                          dueMode === days
                            ? "border-2 border-[#0836B0] bg-[#0836B0]/10 text-[#0836B0]"
                            : "border-[#AEB9D4] text-[#222C3B] hover:border-[#0836B0] hover:text-[#0836B0]",
                        )}
                      >
                        {days} kun
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDueMode("custom")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-sm font-semibold transition-colors",
                        dueMode === "custom"
                          ? "border-2 border-[#0836B0] bg-[#0836B0]/10 text-[#0836B0]"
                          : "border-[#AEB9D4] text-[#222C3B] hover:border-[#0836B0] hover:text-[#0836B0]",
                        invalidField === "due" && "border-[#C43B3B] text-[#C43B3B]",
                      )}
                    >
                      <CalendarDays className="h-4 w-4" />
                      Sana
                    </button>
                  </div>

                  {dueMode === "custom" && (
                    <Input
                      ref={dueInputRef}
                      type="date"
                      value={customDue}
                      min={toDateInput(new Date())}
                      onChange={(event) => {
                        setCustomDue(event.target.value);
                        setInvalidField(null);
                      }}
                      className={cn(
                        "h-10 border-[#AEB9D4] bg-[#FDFDFD] text-[#222C3B]",
                        invalidField === "due" && "border-[#C43B3B]",
                      )}
                    />
                  )}

                  <div
                    className={cn(
                      "text-xs",
                      invalidField === "due" ? "text-[#C43B3B]" : "text-[#737D91]",
                    )}
                  >
                    {resolvedDueDate
                      ? `Qaytarish sanasi: ${formatDueLabel(resolvedDueDate)}`
                      : "Sanani tanlang"}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm text-[#222C3B]">Oldindan to'lov</Label>
                    <button
                      type="button"
                      onClick={fillFullAmount}
                      className="text-xs font-semibold text-[#0836B0] hover:underline"
                    >
                      Butun summani
                    </button>
                  </div>

                  <PaymentMethodsBlock mode="prepay" rows={prepayRows} onRows={setPrepayRows} />
                </div>

                {picked && hasObjects && (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-[#222C3B]">Qarz qayerga yoziladi</Label>
                    <Select value={generalDebtTarget} onValueChange={setGeneralDebtTarget}>
                      <SelectTrigger className="h-10 border-[#AEB9D4] bg-[#FDFDFD] text-[#222C3B]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Umumiy qarzga yozish</SelectItem>
                        {(picked.objects ?? []).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm text-[#222C3B]">Izoh — ixtiyoriy</Label>
                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Masalan: qurilish tugagach to'laydi"
                    rows={2}
                    className="resize-none border-[#AEB9D4] bg-[#FDFDFD] text-[#222C3B] placeholder:text-[#737D91]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 px-5 py-4">
              <div className="space-y-3">
                <div className="text-sm font-medium text-[#222C3B]">To'lov usuli</div>

                <PaymentMethodsBlock
                  mode="regular"
                  rows={payRows}
                  onRows={setPayRows}
                  invalid={invalidField === "payment"}
                />

                {showGivenBlock && singleRegular && (
                  <div className="space-y-3 rounded-lg bg-[#F4F5F9] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm text-[#737D91]">
                        Mijoz berdi
                        {singleRegularMethod?.kind === "currency" && ` (${singleRegular.currency})`}
                      </Label>
                      <Input
                        ref={givenInputRef}
                        value={singleRegular.amount}
                        onChange={(event) =>
                          setPayRows((current) =>
                            current.map((row) =>
                              row.id === singleRegular.id
                                ? { ...row, amount: formatNumberInput(event.target.value) }
                                : row,
                            ),
                          )
                        }
                        inputMode="decimal"
                        placeholder={formatInputNumber(exactGiven)}
                        className={cn(
                          "h-11 w-44 border-[#AEB9D4] bg-[#FDFDFD] text-right text-lg font-bold tabular-nums text-[#222C3B]",
                          invalidField === "payment" && "border-[#C43B3B]",
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPayRows((current) =>
                            current.map((row) =>
                              row.id === singleRegular.id ? { ...row, amount: "" } : row,
                            ),
                          )
                        }
                        className={cn(
                          "rounded-md border bg-[#FDFDFD] px-1 py-1.5 text-xs font-semibold",
                          givenEmpty
                            ? "border-[#0836B0] text-[#0836B0]"
                            : "border-[#AEB9D4] text-[#222C3B] hover:border-[#0836B0] hover:text-[#0836B0]",
                        )}
                      >
                        Aniq — {formatInputNumber(exactGiven)}
                      </button>
                      {quickCashAmounts(exactGiven).map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() =>
                            setPayRows((current) =>
                              current.map((row) =>
                                row.id === singleRegular.id
                                  ? { ...row, amount: formatInputNumber(amount) }
                                  : row,
                              ),
                            )
                          }
                          className="rounded-md border border-[#AEB9D4] bg-[#FDFDFD] px-1 py-1.5 text-xs font-semibold tabular-nums text-[#222C3B] hover:border-[#0836B0] hover:text-[#0836B0]"
                        >
                          {formatInputNumber(amount)}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-[#AEB9D4] pt-3">
                      <span className="text-sm text-[#737D91]">Qaytim</span>
                      <span
                        data-no-translate
                        className={cn(
                          "text-2xl font-bold tabular-nums",
                          nasiyagaYoziladi > 0 ? "text-[#C43B3B]" : "text-[#0836B0]",
                        )}
                      >
                        {nasiyagaYoziladi > 0
                          ? `Yetmayapti: ${formatSom(nasiyagaYoziladi)}`
                          : formatSom(qaytim)}
                      </span>
                    </div>
                  </div>
                )}

                {showMixedChangeLine && (
                  <div className="flex items-center justify-between rounded-lg bg-[#F4F5F9] px-3 py-2.5">
                    <span className="text-sm text-[#737D91]">
                      {nasiyagaYoziladi > 0 ? "Yetmayapti" : "Qaytim"}
                    </span>
                    <span
                      data-no-translate
                      className={cn(
                        "text-lg font-bold tabular-nums",
                        nasiyagaYoziladi > 0 ? "text-[#C43B3B]" : "text-[#0836B0]",
                      )}
                    >
                      {formatSom(nasiyagaYoziladi > 0 ? nasiyagaYoziladi : qaytim)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isNasiya ? (
            <div className="flex flex-shrink-0 items-center justify-between gap-4 border-t border-[#AEB9D4] px-5 py-3">
              <div>
                <div className="text-xs text-[#737D91]">
                  {qaytim > 0 ? "Qaytim" : "Nasiyaga yoziladi"}
                </div>
                <div
                  data-no-translate
                  className="text-[22px] font-bold leading-tight tabular-nums text-[#0836B0]"
                >
                  {formatSom(qaytim > 0 ? qaytim : nasiyagaYoziladi)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="h-11 w-[140px] border-[#AEB9D4] text-[#737D91]"
                  onClick={() => onOpenChange(false)}
                >
                  Bekor
                </Button>
                <Button
                  className="h-11 w-[260px] bg-[#0836B0] text-[15px] font-semibold text-[#FDFDFD] hover:bg-[#0836B0]/90"
                  onClick={handleConfirm}
                >
                  {qaytim > 0 || nasiyagaYoziladi <= 0 ? "Yakunlash · Enter" : confirmLabel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-shrink-0 items-center gap-3 border-t border-[#AEB9D4] px-5 py-3">
              <Button
                variant="outline"
                className="h-11 w-[150px] border-[#AEB9D4] text-[#737D91]"
                onClick={() => onOpenChange(false)}
              >
                Bekor
              </Button>
              <Button
                className="h-11 flex-1 bg-[#0836B0] text-[15px] font-semibold text-[#FDFDFD] hover:bg-[#0836B0]/90"
                onClick={handleConfirm}
              >
                Yakunlash · Enter
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={limitWarnOpen} onOpenChange={setLimitWarnOpen}>
        <AlertDialogContent className="border-[#AEB9D4] bg-[#FDFDFD]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#222C3B]">Limitdan oshadi</AlertDialogTitle>
            <AlertDialogDescription data-no-translate className="text-[#737D91]">
              {picked
                ? `${fullCustomerName(picked)} uchun yangi qarz ${formatSom(yangiQarzi)} bo'ladi — ` +
                  `limitdan ${formatSom(yangiQarzi - limit)} oshadi. Davom etasizmi?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#AEB9D4] text-[#737D91]">Bekor</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#0836B0] text-[#FDFDFD] hover:bg-[#0836B0]/90"
              onClick={() => {
                setLimitWarnOpen(false);
                submitNasiya();
              }}
            >
              Davom etish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddCustomerDialog open={addOpen} onOpenChange={setAddOpen} onSave={handleNewCustomer} />
    </>
  );
}

/** Kiritilgan summadan yuqoridagi eng yaqin yumaloq qiymatlar */
function quickCashAmounts(value: number) {
  const magnitude = Math.max(1, Math.pow(10, Math.floor(Math.log10(Math.max(value, 1))) - 1));
  const rounded = [1, 5, 10, 20, 50].map(
    (step) => Math.ceil(value / (step * magnitude)) * step * magnitude,
  );
  return [...new Set(rounded.filter((item) => item > value))].sort((a, b) => a - b).slice(0, 3);
}

// ─── Yangi nasiyachi qo'shish ────────────────────────────────────────────────

function AddCustomerDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (c: CreditCustomer) => void;
}) {
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [withLimit, setWithLimit] = React.useState(false);
  const [limit, setLimit] = React.useState("");
  const [currency, setCurrency] = React.useState<Currency>("UZS");
  const [objects, setObjects] = React.useState<Array<{ id: string; name: string }>>([]);

  React.useEffect(() => {
    if (!open) {
      setFirst("");
      setLast("");
      setPhone("");
      setWithLimit(false);
      setLimit("");
      setCurrency("UZS");
      setObjects([]);
    }
  }, [open]);

  const canSave = first.trim() && last.trim() && phone.trim();

  const save = () => {
    if (!canSave) return;
    const customer: CreditCustomer = {
      id: `c${Date.now()}`,
      firstName: first.trim(),
      lastName: last.trim(),
      phone: phone.trim(),
      role: "mijoz",
      limit: withLimit ? parsePaymentValue(limit) : 0,
      limitCurrency: withLimit ? currency : "UZS",
      currentDebt: 0,
    };
    const cleanedObjects = objects
      .map((item) => ({ ...item, name: item.name.trim() }))
      .filter((item) => item.name);
    if (cleanedObjects.length > 0) {
      customer.objects = cleanedObjects.map((item, index) => ({
        id: item.id || `OBJ-${Date.now()}-${index}`,
        name: item.name,
        debt: 0,
      }));
    }
    onSave(customer);
    onOpenChange(false);
  };

  const addObject = () => {
    setObjects((current) => [...current, { id: `OBJ-${Date.now()}-${current.length}`, name: "" }]);
  };

  const updateObjectName = (id: string, name: string) => {
    setObjects((current) => current.map((item) => (item.id === id ? { ...item, name } : item)));
  };

  const removeObject = (id: string) => {
    setObjects((current) => current.filter((item) => item.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Yangi nasiyachi qo'shish
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block text-xs">Ism *</Label>
            <Input value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Familya *</Label>
            <Input value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label className="mb-1 block text-xs">Telefon *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={addObject}>
              <Plus className="h-4 w-4" />
              Obyekt qo'shish
            </Button>
            <Button
              type="button"
              size="sm"
              variant={withLimit ? "default" : "outline"}
              onClick={() => setWithLimit((value) => !value)}
            >
              Limit qo'yish
            </Button>
          </div>

          {objects.length > 0 && (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Obyektlar
              </div>
              <div className="space-y-2">
                {objects.map((item, index) => (
                  <div key={item.id} className="flex gap-2">
                    <Input
                      value={item.name}
                      onChange={(e) => updateObjectName(item.id, e.target.value)}
                      placeholder={`Obyekt ${index + 1} nomi`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => removeObject(item.id)}
                      aria-label="Obyektni o'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {withLimit && (
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <Input
                value={limit}
                onChange={(e) => setLimit(formatNumberInput(e.target.value))}
                inputMode="decimal"
              />
              <Select value={currency} onValueChange={(value) => setCurrency(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UZS">UZS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="RUB">RUB</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor
          </Button>
          <Button onClick={save} disabled={!canSave}>
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatInputNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return formatNumberInput(String(Math.round(value * 100) / 100));
}

function parsePaymentValue(value: string) {
  const parsed = parseNumberInput(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}
