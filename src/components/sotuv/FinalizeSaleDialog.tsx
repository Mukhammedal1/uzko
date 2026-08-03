import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { cn, formatNumberInput, parseNumberInput } from "@/lib/utils";
import {
  ShieldCheck,
  User,
  HandCoins,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  CalendarDays,
  CreditCard,
  Wallet,
  Landmark,
  Split,
  Plus,
  Trash2,
} from "lucide-react";
import {
  formatSom,
  MOCK_RATES,
  type CreditCustomer,
  type CustomerType,
  type Currency,
} from "@/lib/mock-data";
import { CustomerSearch } from "@/components/shared/CustomerSearch";
import { addCreditCustomer, addCreditSale, fullCustomerName } from "@/lib/data-actions";
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

const PAYMENT_METHODS = [
  { value: "naqd", label: "Naqd pul", icon: Wallet },
  { value: "karta", label: "Karta", icon: CreditCard },
  { value: "valyuta", label: "Valyuta", icon: Landmark },
  { value: "aralash", label: "Aralash", icon: Split },
] as const;

const CURRENCY_OPTIONS = ["USD", "RUB", "EUR"] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

type PaymentState = {
  method: PaymentMethod;
  cash: string;
  card: string;
  currencyAmount: string;
  currencyCode: string;
};

const INITIAL_PAYMENT: PaymentState = {
  method: "naqd",
  cash: "",
  card: "",
  currencyAmount: "",
  currencyCode: "USD",
};
const SALE_PAYMENT_TOLERANCE = 1000;

export function FinalizeSaleDialog({ open, onOpenChange, total, onConfirm }: Props) {
  const [type, setType] = React.useState<CustomerType>("oddiy");
  const [search, setSearch] = React.useState("");
  const [picked, setPicked] = React.useState<CreditCustomer | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [showDueDate, setShowDueDate] = React.useState(false);
  const [dueDate, setDueDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [payment, setPayment] = React.useState<PaymentState>(INITIAL_PAYMENT);
  const [generalDebtTarget, setGeneralDebtTarget] = React.useState("general");

  React.useEffect(() => {
    if (!open) {
      setType("oddiy");
      setSearch("");
      setPicked(null);
      setShowDueDate(false);
      setDueDate("");
      setNote("");
      setPayment(INITIAL_PAYMENT);
      setGeneralDebtTarget("general");
    }
  }, [open]);

  React.useEffect(() => {
    setGeneralDebtTarget("general");
  }, [picked?.id]);

  const currencyRate = MOCK_RATES[payment.currencyCode] ?? 1;
  const isAutoFullRegularPayment = type === "oddiy" && payment.method !== "aralash";
  const breakdown = React.useMemo(() => {
    let cash = parsePaymentValue(payment.cash);
    let card = parsePaymentValue(payment.card);
    let currencyAmount = parsePaymentValue(payment.currencyAmount);
    let currencyInSom = currencyAmount * currencyRate;

    if (isAutoFullRegularPayment) {
      cash = payment.method === "naqd" ? total : 0;
      card = payment.method === "karta" ? total : 0;
      currencyAmount = payment.method === "valyuta" && currencyRate > 0 ? total / currencyRate : 0;
      currencyInSom = payment.method === "valyuta" ? total : 0;
    }

    let paid = 0;

    if (payment.method === "naqd") paid = cash;
    else if (payment.method === "karta") paid = card;
    else if (payment.method === "valyuta") paid = currencyInSom;
    else paid = cash + card + currencyInSom;

    return {
      cash,
      card,
      currencyAmount,
      currencyCode: payment.currencyCode,
      currencyInSom,
      paid: Math.min(total, paid),
    };
  }, [
    isAutoFullRegularPayment,
    payment.card,
    payment.cash,
    payment.currencyAmount,
    payment.currencyCode,
    payment.method,
    total,
    currencyRate,
  ]);

  const paidNow = breakdown.paid;
  const remainingToClose = Math.max(0, total - paidNow);
  const isWithinTolerance = remainingToClose <= SALE_PAYMENT_TOLERANCE;
  const effectivePaidNow = isWithinTolerance ? total : paidNow;
  const debtAmount = Math.max(0, total - effectivePaidNow);
  const newDebt = picked ? picked.currentDebt + debtAmount : 0;
  const overLimit = picked ? newDebt > picked.limit : false;
  const hasObjects = Boolean(picked?.objects?.length);
  const selectedObject =
    generalDebtTarget === "general"
      ? null
      : ((picked?.objects ?? []).find((item) => item.id === generalDebtTarget) ?? null);

  const canConfirm =
    type === "oddiy"
      ? isAutoFullRegularPayment || (paidNow > 0 && remainingToClose <= SALE_PAYMENT_TOLERANCE)
      : !!picked && !overLimit && paidNow <= total;

  const updatePayment = (patch: Partial<PaymentState>) => {
    setPayment((current) => ({ ...current, ...patch }));
  };

  const remainingForField = () =>
    Math.max(0, total - currentEnteredSom(payment.method, payment, currencyRate));

  const applyRemaining = (field: "cash" | "card" | "currencyAmount") => {
    const remainingValue = remainingForField();
    if (field === "currencyAmount") {
      const converted = currencyRate > 0 ? remainingValue / currencyRate : 0;
      updatePayment({ currencyAmount: formatInputNumber(converted) });
      return;
    }
    updatePayment({ [field]: formatInputNumber(remainingValue) });
  };

  const handleConfirm = () => {
    if (!canConfirm) return;

    const paymentBreakdown = {
      cash: payment.method === "karta" || payment.method === "valyuta" ? 0 : breakdown.cash,
      card: payment.method === "naqd" || payment.method === "valyuta" ? 0 : breakdown.card,
      currencyAmount:
        payment.method === "naqd" || payment.method === "karta" ? 0 : breakdown.currencyAmount,
      currencyCode:
        payment.method === "naqd" || payment.method === "karta" ? undefined : payment.currencyCode,
      currencyInSom:
        payment.method === "naqd" || payment.method === "karta" ? 0 : breakdown.currencyInSom,
    };

    if (type === "nasiya" && picked) {
      addCreditSale(picked, total, {
        note,
        dueDate: showDueDate && dueDate ? dueDate : undefined,
        paidAmount: effectivePaidNow,
        objectId: selectedObject?.id,
        objectName: selectedObject?.name,
        paymentLabel: paymentSummaryLabel(payment.method, paymentBreakdown),
      });
      toast.success(`Nasiyaga yozildi: ${fullCustomerName(picked)}`);
      onConfirm({
        customerType: type,
        customerId: picked.id,
        customerName: fullCustomerName(picked),
        customerPhone: picked.phone,
        paidAmount: effectivePaidNow,
        debtAmount,
        paymentBreakdown,
      });
      onOpenChange(false);
      return;
    }

    onConfirm({
      customerType: "oddiy",
      paidAmount: total,
      debtAmount: 0,
      paymentBreakdown,
    });
    onOpenChange(false);
  };

  const handleNewCustomer = (customer: CreditCustomer) => {
    addCreditCustomer(customer);
    setPicked(customer);
    setSearch(fullCustomerName(customer));
    toast.success("Yangi nasiyachi qo'shildi");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[92dvh] max-w-6xl flex-col overflow-hidden p-0">
          <DialogHeader className="flex-shrink-0 border-b px-4 py-3">
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Savdoni yakunlash
            </DialogTitle>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] gap-4 overflow-hidden p-4 max-lg:grid-cols-1">
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
              <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                <div className="rounded-md bg-muted/50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">To'lash uchun</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">{formatSom(total)}</div>
                </div>

                <div className="space-y-2">
                  <Label>Xaridor turi</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setType(opt.value)}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-md border p-2.5 text-sm font-medium transition-colors",
                          type === opt.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "hover:bg-muted",
                        )}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {type === "nasiya" && (
                <div className="space-y-2 rounded-md border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm">Mijoz ism / familya</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setAddOpen(true)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Yangi nasiyachi
                    </Button>
                  </div>

                  <CustomerSearch
                    value={search}
                    onValueChange={(value) => {
                      setSearch(value);
                      setPicked(null);
                    }}
                    selectedId={picked?.id}
                    onSelect={(customer) => {
                      setPicked(customer);
                      setSearch(fullCustomerName(customer));
                    }}
                    placeholder="Masalan: Olim Yusupov"
                    limit={5}
                    compact
                    showInitialResults={false}
                  />

                  {picked && (
                    <div
                      className={cn(
                        "space-y-2.5 rounded-md border p-3 text-sm",
                        overLimit
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-success/30 bg-success/5",
                      )}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        {overLimit ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        )}
                        {picked.firstName} {picked.lastName}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({picked.role})
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Joriy qarz</span>
                          <span data-no-translate>
                            {formatSom(picked.currentDebt)} / {formatSom(picked.limit)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              overLimit ? "bg-destructive" : "bg-primary",
                            )}
                            style={{
                              width: `${Math.min(100, picked.limit > 0 ? (picked.currentDebt / picked.limit) * 100 : 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-md bg-card px-3 py-2">
                        <span className="text-xs text-muted-foreground">Yangi umumiy qarz</span>
                        <span
                          data-no-translate
                          className={cn(
                            "text-lg font-bold tabular-nums",
                            overLimit ? "text-destructive" : "text-primary",
                          )}
                        >
                          {formatSom(newDebt)}
                        </span>
                      </div>

                      {paidNow > 0 && (
                        <div className="text-xs text-muted-foreground" data-no-translate>
                          Bu safar to'landi: <b className="text-foreground">{formatSom(paidNow)}</b>
                        </div>
                      )}

                      {overLimit && (
                        <p className="text-xs font-medium text-destructive">
                          Limitdan oshib ketadi, mahsulot bera olmaysiz
                        </p>
                      )}
                    </div>
                  )}

                  {picked && hasObjects && (
                    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                      <Label className="text-sm">Qarz qayerga yoziladi</Label>
                      <Select value={generalDebtTarget} onValueChange={setGeneralDebtTarget}>
                        <SelectTrigger>
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
                </div>
              )}

              {type === "nasiya" && picked && (
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-sm">Muddat</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant={showDueDate ? "default" : "outline"}
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => setShowDueDate((value) => !value)}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      Muddat belgilash
                    </Button>
                  </div>
                  {showDueDate && (
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  )}
                </div>
              )}

              {type === "nasiya" && picked && (
                <div className="space-y-2">
                  <Label>Izoh</Label>
                  <Input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ixtiyoriy izoh..."
                  />
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
              <PaymentSection
                total={total}
                payment={payment}
                onChange={updatePayment}
                paidNow={effectivePaidNow}
                remaining={debtAmount}
                toleranceHint={isWithinTolerance && remainingToClose > 0 ? remainingToClose : 0}
                onApplyRemaining={applyRemaining}
                showMethodChooser
                autoFullRegularPayment={isAutoFullRegularPayment}
              />

              <div className="mt-auto flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  Bekor
                </Button>
                <Button className="flex-1" onClick={handleConfirm} disabled={!canConfirm}>
                  Yakunlash
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddCustomerDialog open={addOpen} onOpenChange={setAddOpen} onSave={handleNewCustomer} />
    </>
  );
}

function PaymentSection({
  total,
  payment,
  onChange,
  paidNow,
  remaining,
  toleranceHint,
  onApplyRemaining,
  showMethodChooser,
  autoFullRegularPayment,
}: {
  total: number;
  payment: PaymentState;
  onChange: (patch: Partial<PaymentState>) => void;
  paidNow: number;
  remaining: number;
  toleranceHint: number;
  onApplyRemaining: (field: "cash" | "card" | "currencyAmount") => void;
  showMethodChooser: boolean;
  autoFullRegularPayment: boolean;
}) {
  const currencyRate = MOCK_RATES[payment.currencyCode] ?? 1;
  const autoCurrencyAmount = currencyRate > 0 ? total / currencyRate : 0;
  const currencyPreview = autoFullRegularPayment
    ? total
    : parsePaymentValue(payment.currencyAmount) * currencyRate;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm">Pul kassaga qanday kiradi</Label>
        <div className="text-xs font-semibold text-muted-foreground">
          Kiritilgan: {formatSom(paidNow)} / {formatSom(total)}
        </div>
      </div>

      {showMethodChooser && (
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange({ method: item.value })}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md border p-2.5 text-sm font-medium transition-colors",
                  payment.method === item.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {!autoFullRegularPayment && (payment.method === "naqd" || payment.method === "aralash") && (
        <MoneyField
          label="Naqd pul"
          value={payment.cash}
          onChange={(value) => onChange({ cash: value })}
          onApplyRemaining={() => onApplyRemaining("cash")}
        />
      )}

      {!autoFullRegularPayment && (payment.method === "karta" || payment.method === "aralash") && (
        <MoneyField
          label="Karta"
          value={payment.card}
          onChange={(value) => onChange({ card: value })}
          onApplyRemaining={() => onApplyRemaining("card")}
        />
      )}

      {(payment.method === "valyuta" || payment.method === "aralash") && (
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs">Valyuta</Label>
            <Select
              value={payment.currencyCode}
              onValueChange={(value) => onChange({ currencyCode: value })}
            >
              <SelectTrigger>
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
          </div>
          {autoFullRegularPayment ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="text-xs text-muted-foreground">Avtomatik valyuta miqdori</div>
              <div className="mt-1 font-bold tabular-nums">
                {formatInputNumber(autoCurrencyAmount)} {payment.currencyCode}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Kassaga kiradi: {formatSom(currencyPreview)}
              </div>
            </div>
          ) : (
            <MoneyField
              label={`Valyuta summasi (${payment.currencyCode})`}
              value={payment.currencyAmount}
              onChange={(value) => onChange({ currencyAmount: value })}
              onApplyRemaining={() => onApplyRemaining("currencyAmount")}
              helper={`Avto konversiya: ${formatSom(currencyPreview)}`}
            />
          )}
        </div>
      )}

      <div className="grid gap-2 rounded-md bg-muted/40 p-3 text-sm md:grid-cols-2">
        <InfoCell label="Kassaga kiradi" value={formatSom(paidNow)} />
        <InfoCell label="Nasiyaga qoladi" value={formatSom(remaining)} />
      </div>
      {toleranceHint > 0 && (
        <div className="text-xs text-muted-foreground">
          {formatSom(toleranceHint)} farq avtomatik yopiladi.
        </div>
      )}
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  onApplyRemaining,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onApplyRemaining: () => void;
  helper?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        <button
          type="button"
          onClick={onApplyRemaining}
          className="text-xs font-medium text-primary hover:underline"
        >
          Qolganini qo'sh
        </button>
      </div>
      <Input
        value={value}
        onChange={(event) => onChange(formatNumberInput(event.target.value))}
        inputMode="decimal"
      />
      {helper && <div className="mt-1 text-xs text-muted-foreground">{helper}</div>}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

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

function currentEnteredSom(method: PaymentMethod, payment: PaymentState, currencyRate: number) {
  const cash = parsePaymentValue(payment.cash);
  const card = parsePaymentValue(payment.card);
  const currency = parsePaymentValue(payment.currencyAmount) * currencyRate;
  if (method === "naqd") return cash;
  if (method === "karta") return card;
  if (method === "valyuta") return currency;
  return cash + card + currency;
}

function formatInputNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return formatNumberInput(String(Math.round(value * 100) / 100));
}

function parsePaymentValue(value: string) {
  const parsed = parseNumberInput(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function paymentSummaryLabel(
  method: PaymentMethod,
  breakdown: {
    cash: number;
    card: number;
    currencyAmount: number;
    currencyCode?: string;
    currencyInSom: number;
  },
) {
  if (method === "naqd") return "Naqd berildi";
  if (method === "karta") return "Karta berildi";
  if (method === "valyuta") return `Valyuta berildi (${breakdown.currencyCode ?? "USD"})`;
  const parts = [];
  if (breakdown.cash > 0) parts.push(`naqd ${formatSom(breakdown.cash)}`);
  if (breakdown.card > 0) parts.push(`karta ${formatSom(breakdown.card)}`);
  if (breakdown.currencyInSom > 0) {
    parts.push(
      `${breakdown.currencyCode ?? "USD"} ${breakdown.currencyAmount} = ${formatSom(
        breakdown.currencyInSom,
      )}`,
    );
  }
  return `Aralash (${parts.join(", ")})`;
}
