import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DebtReceiptsDialog } from "@/components/shared/DebtReceiptDialog";
import { CustomerSearch } from "@/components/shared/CustomerSearch";
import { CalendarClock, HandCoins, Lock, Printer, ReceiptText, Users } from "lucide-react";
import {
  MOCK_CREDIT_CUSTOMERS,
  formatSom,
  type CreditCustomer,
  type CustomerDebtReceipt,
} from "@/lib/mock-data";
import { fullCustomerName, recordDebtPayment } from "@/lib/data-actions";
import { formatNumberInput, parseNumberInput } from "@/lib/utils";
import { toast } from "sonner";

const TABS = [
  { id: "yopish", label: "Qarz so'ndirish" },
  { id: "qarzdor", label: "Qarzdorlar" },
] as const;

const CARD_TYPES = ["HUMO", "UZCARD", "VISA"] as const;
const COMMON_CURRENCIES = ["USD", "RUB", "EUR"] as const;

type Tab = (typeof TABS)[number]["id"];
type PayMethod = "naqd" | "karta" | "valyuta";

export function QarzdorlikniYopish({ mode = "both" }: { mode?: "both" | "payment" | "debtors" }) {
  const [tab, setTab] = React.useState<Tab>(mode === "debtors" ? "qarzdor" : "yopish");

  if (mode === "payment") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <Yopish />
      </div>
    );
  }

  if (mode === "debtors") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <Qarzdorlar />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b bg-card p-3">
        {TABS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={tab === item.id ? "default" : "outline"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {tab === "yopish" ? <Yopish /> : <Qarzdorlar />}
      </div>
    </div>
  );
}

function Yopish() {
  const [search, setSearch] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<PayMethod>("naqd");
  const [cardType, setCardType] = React.useState<(typeof CARD_TYPES)[number]>("HUMO");
  const [currencyPreset, setCurrencyPreset] = React.useState<string>("USD");
  const [customCurrency, setCustomCurrency] = React.useState("");
  const [note, setNote] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [dueDateOpen, setDueDateOpen] = React.useState(false);
  const [receiptCustomer, setReceiptCustomer] = React.useState<CreditCustomer | null>(null);
  const [, force] = React.useState(0);

  const customer = MOCK_CREDIT_CUSTOMERS.find((item) => item.id === customerId);
  const paymentAmount = Math.max(0, parseNumberInput(amount));
  const remainingDebt = customer ? Math.max(0, customer.currentDebt - paymentAmount) : 0;
  const isPartialPayment = !!customer && paymentAmount > 0 && remainingDebt > 0;
  const currencyCode =
    currencyPreset === "custom" ? customCurrency.trim().toUpperCase() : currencyPreset;

  const selectCustomer = (next: CreditCustomer) => {
    setCustomerId(next.id);
    setSearch(fullCustomerName(next));
    setDueDate("");
    setDueDateOpen(false);
  };

  const submit = () => {
    if (!customer) return toast.error("Mijozni ism, ID yoki telefon orqali tanlang");
    if (paymentAmount <= 0) return toast.error("Summa noto'g'ri");
    if (method === "valyuta" && !currencyCode) return toast.error("Valyuta kodini kiriting");

    const methodLabel =
      method === "naqd"
        ? "Naqd pul"
        : method === "karta"
          ? `Karta (${cardType})`
          : `Valyuta (${currencyCode})`;

    const { payment } = recordDebtPayment({
      customer,
      amount: paymentAmount,
      method,
      cardType: method === "karta" ? cardType : undefined,
      currencyCode: method === "valyuta" ? currencyCode : undefined,
      note: note.trim() || undefined,
      methodLabel,
    });

    if (isPartialPayment && dueDate) {
      customer.dueDate = dueDate;
    }

    toast.success("Qarz so'ndirildi", {
      description: `${payment.customerName}: ${formatSom(paymentAmount)} · qoldiq: ${formatSom(
        customer.currentDebt,
      )}`,
    });
    setAmount("");
    setNote("");
    setDueDate("");
    setDueDateOpen(false);
    force((value) => value + 1);
  };

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_380px] gap-4 overflow-hidden p-4 max-lg:grid-cols-1">
      <div className="flex min-h-0 flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Mijozni tanlang</Label>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <CustomerSearch
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setCustomerId("");
            }}
            selectedId={customerId}
            onSelect={selectCustomer}
            onOpenReceipts={setReceiptCustomer}
            placeholder="Ism, ID yoki telefon..."
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-lg border bg-card p-4">
        {customer ? (
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">Joriy qarzi</span>
            <span className="text-xl font-bold tabular-nums text-primary">
              {formatSom(customer.currentDebt)}
            </span>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Avval mijozni tanlang
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={method === "naqd" ? "default" : "outline"}
            onClick={() => setMethod("naqd")}
          >
            Naqd
          </Button>
          <Button
            variant={method === "karta" ? "default" : "outline"}
            onClick={() => setMethod("karta")}
          >
            Karta
          </Button>
          <Button
            variant={method === "valyuta" ? "default" : "outline"}
            onClick={() => setMethod("valyuta")}
          >
            Valyuta
          </Button>
        </div>

        {method === "karta" && (
          <Select value={cardType} onValueChange={(value) => setCardType(value as typeof cardType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARD_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {method === "valyuta" && (
          <div className="grid grid-cols-[140px_1fr] gap-2">
            <Select value={currencyPreset} onValueChange={setCurrencyPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Boshqa</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={currencyPreset === "custom" ? customCurrency : currencyPreset}
              onChange={(event) => setCustomCurrency(event.target.value)}
              disabled={currencyPreset !== "custom"}
              placeholder="CNY"
              className="uppercase"
            />
          </div>
        )}

        <Input
          value={amount}
          onChange={(event) => setAmount(formatNumberInput(event.target.value))}
          placeholder={`Summa ${method === "valyuta" && currencyCode ? `(${currencyCode})` : "(so'm)"}`}
          inputMode="decimal"
        />

        {isPartialPayment &&
          (dueDateOpen ? (
            <div>
              <Label className="mb-1 block text-xs">Qoldiq qarz uchun yangi muddat</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setDueDateOpen(true)}
            >
              <CalendarClock className="h-4 w-4" />
              Muddat belgilash
            </Button>
          ))}

        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Izoh (ixtiyoriy)"
        />

        <div className="mt-auto space-y-3">
          {customer && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {remainingDebt > 0 ? "Qoldiq qarz" : "Qarz holati"}
              </span>
              <span className="font-semibold tabular-nums text-primary">
                {remainingDebt > 0 ? formatSom(remainingDebt) : "To'liq yopiladi"}
              </span>
            </div>
          )}

          <Button
            onClick={submit}
            disabled={!customer || paymentAmount <= 0}
            className="w-full gap-2"
          >
            <HandCoins className="h-4 w-4" />
            Qarzni so'ndirish
          </Button>
        </div>
      </div>

      <DebtReceiptsDialog customer={receiptCustomer} onClose={() => setReceiptCustomer(null)} />
    </div>
  );
}

function Qarzdorlar() {
  const [picked, setPicked] = React.useState<CreditCustomer | null>(null);
  const [listOpen, setListOpen] = React.useState(false);
  const [receiptDetail, setReceiptDetail] = React.useState<CustomerDebtReceipt | null>(null);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const customers = MOCK_CREDIT_CUSTOMERS;
  const totalDebt = customers.reduce((sum, customer) => sum + customer.currentDebt, 0);
  const cats = customers.reduce(
    (acc, customer) => {
      const ratio = customer.limit ? customer.currentDebt / customer.limit : 0;
      if (ratio < 0.4) acc.green.push(customer);
      else if (ratio < 0.8) acc.yellow.push(customer);
      else acc.red.push(customer);
      return acc;
    },
    { green: [] as CreditCustomer[], yellow: [] as CreditCustomer[], red: [] as CreditCustomer[] },
  );
  const today = new Date("2026-05-07");
  const soon = customers
    .filter((customer) => {
      if (!customer.dueDate) return false;
      const days = (new Date(customer.dueDate).getTime() - today.getTime()) / 86400000;
      return days <= 5;
    })
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const receipts = React.useMemo(() => {
    if (!picked) return [];
    return (picked.receipts ?? []).filter((receipt) => {
      const day = receipt.date.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
  }, [picked, from, to]);
  const printReceipt = (receipt: CustomerDebtReceipt) => {
    toast.success(`Chek print qilindi: ${receipt.id}`);
    window.print();
  };

  return (
    <div className="flex min-h-0 flex-col gap-3 p-3">
      <div className="grid grid-cols-1 gap-3">
        <Kpi
          label="Jami Haqimiz"
          value={formatSom(totalDebt)}
          accent
          onClick={() => setListOpen(true)}
        />
      </div>
      <div className="grid min-h-[260px] grid-cols-3 gap-3 max-lg:grid-cols-1">
        <Bucket
          title="Yashil — kam qarz"
          color="border-success/40 bg-success/5"
          dot="bg-success"
          items={cats.green}
          onPick={setPicked}
        />
        <Bucket
          title="Sariq — o'rtacha"
          color="border-amber-500/40 bg-amber-500/5"
          dot="bg-amber-500"
          items={cats.yellow}
          onPick={setPicked}
        />
        <Bucket
          title="Qizil — limitga yaqin"
          color="border-destructive/40 bg-destructive/5"
          dot="bg-destructive"
          items={cats.red}
          onPick={setPicked}
        />
      </div>
      <div className="flex min-h-[260px] flex-col rounded-md border p-3">
        <div className="mb-2 flex items-center gap-2">
          <Users className="h-4 w-4 text-amber-600" />
          <span className="font-semibold">Muddati yaqin</span>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-700">
            {soon.length}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 bg-muted/80 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 text-left">Ism</th>
                <th className="px-3 py-1.5 text-right">Qarz</th>
                <th className="px-3 py-1.5 text-right">Qoldiq limit</th>
                <th className="px-3 py-1.5 text-left">Telefon</th>
                <th className="px-3 py-1.5 text-left">Muddat</th>
              </tr>
            </thead>
            <tbody>
              {soon.map((customer) => (
                <tr
                  key={customer.id}
                  className="cursor-pointer border-b hover:bg-muted/40"
                  onClick={() => setPicked(customer)}
                >
                  <td className="px-3 py-1.5">{fullCustomerName(customer)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatSom(customer.currentDebt)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatSom(customer.limit - customer.currentDebt)}
                  </td>
                  <td className="px-3 py-1.5 text-xs">{customer.phone}</td>
                  <td className="px-3 py-1.5 text-xs">{customer.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <JamiHaqimizDialog
        open={listOpen}
        customers={customers}
        onClose={() => setListOpen(false)}
        onPick={(customer) => {
          setPicked(customer);
          setListOpen(false);
        }}
      />

      <Dialog
        open={!!picked}
        onOpenChange={(open) => {
          if (!open) {
            setPicked(null);
            setReceiptDetail(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{picked ? fullCustomerName(picked) : ""}</DialogTitle>
          </DialogHeader>
          {picked && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-sm max-md:grid-cols-2">
                <Info label="Rol" value={picked.role} />
                <Info label="Telefon" value={picked.phone ?? "—"} />
                <Info label="Limit" value={formatSom(picked.limit)} />
                <Info label="Joriy qarz" value={formatSom(picked.currentDebt)} />
              </div>
              <Card>
                <CardHeader className="py-3">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ReceiptText className="h-4 w-4" />
                      Qarz cheklari <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </CardTitle>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={from}
                        onChange={(event) => setFrom(event.target.value)}
                        className="w-40"
                      />
                      <Input
                        type="date"
                        value={to}
                        onChange={(event) => setTo(event.target.value)}
                        className="w-40"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cheklar edit/delete qilinmaydi. Faqat ko'rish, davr bo'yicha filter va print
                    qilish mumkin.
                  </div>
                </CardHeader>
                <CardContent className="max-h-80 overflow-auto p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Sana</th>
                        <th className="px-3 py-2 text-left">Chek</th>
                        <th className="px-3 py-2 text-left">Amal</th>
                        <th className="px-3 py-2 text-right">Summa</th>
                        <th className="px-3 py-2 text-left">Izoh</th>
                        <th className="px-3 py-2 text-right">Print</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.map((receipt) => (
                        <tr
                          key={receipt.id}
                          className="cursor-pointer border-b hover:bg-muted/40"
                          onClick={() => setReceiptDetail(receipt)}
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(receipt.date).toLocaleDateString("uz-UZ")}
                          </td>
                          <td className="px-3 py-2 font-mono">{receipt.id}</td>
                          <td className="px-3 py-2">{receipt.title}</td>
                          <td
                            className={`px-3 py-2 text-right font-semibold ${receipt.amount < 0 ? "text-emerald-600" : ""}`}
                          >
                            {formatSom(receipt.amount)}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {receipt.note ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                printReceipt(receipt);
                              }}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {receipts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            Cheklar topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicked(null)}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DebtReceiptInlineDialog
        customer={picked}
        receipt={receiptDetail}
        onClose={() => setReceiptDetail(null)}
      />
    </div>
  );
}

function JamiHaqimizDialog({
  open,
  customers,
  onClose,
  onPick,
}: {
  open: boolean;
  customers: CreditCustomer[];
  onClose: () => void;
  onPick: (customer: CreditCustomer) => void;
}) {
  const debtors = customers.filter((customer) => customer.currentDebt > 0);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[88dvh] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Jami Haqimiz — nasiyachilar</DialogTitle>
        </DialogHeader>
        <div className="max-h-[68dvh] overflow-auto rounded-md border">
          {debtors.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => onPick(customer)}
              className="grid w-full grid-cols-[minmax(0,1fr)_140px_140px] gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50 max-sm:grid-cols-1"
            >
              <div className="min-w-0">
                <div className="font-semibold">{fullCustomerName(customer)}</div>
                <div className="text-xs text-muted-foreground">
                  {customer.phone ?? "Telefon yo'q"} · {customer.id}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Qarzi</div>
                <div className="font-bold tabular-nums text-primary">
                  {formatSom(customer.currentDebt)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Muddat</div>
                <div className="font-medium">{customer.dueDate ?? "—"}</div>
              </div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DebtReceiptInlineDialog({
  customer,
  receipt,
  onClose,
}: {
  customer: CreditCustomer | null;
  receipt: CustomerDebtReceipt | null;
  onClose: () => void;
}) {
  if (!customer || !receipt) return null;
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Chek — {receipt.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Info label="Nasiyachi" value={fullCustomerName(customer)} />
            <Info label="Sana" value={new Date(receipt.date).toLocaleString("uz-UZ")} />
            <Info label="Amal" value={receipt.title} />
            <Info label="Summa" value={formatSom(receipt.amount)} />
            {receipt.paidAmount !== undefined && (
              <Info label="Hozir berilgan" value={formatSom(receipt.paidAmount)} />
            )}
            {receipt.debtAmount !== undefined && (
              <Info label="Nasiyaga qoldi" value={formatSom(receipt.debtAmount)} />
            )}
          </div>
          <div className="overflow-hidden rounded-lg border">
            <div className="border-b bg-muted/60 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Tovarlar
            </div>
            <div className="max-h-64 overflow-auto">
              {(receipt.items.length
                ? receipt.items
                : [{ name: receipt.title, qty: 1, unit: "", amount: Math.abs(receipt.amount) }]
              ).map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.qty} {item.unit}
                    </div>
                  </div>
                  <div className="font-semibold tabular-nums">{formatSom(item.amount)}</div>
                </div>
              ))}
            </div>
          </div>
          {receipt.note && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              {receipt.note}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40"
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-primary" : ""}`}>
        {value}
      </div>
    </button>
  );
}

function Bucket({
  title,
  color,
  dot,
  items,
  onPick,
}: {
  title: string;
  color: string;
  dot: string;
  items: CreditCustomer[];
  onPick: (customer: CreditCustomer) => void;
}) {
  return (
    <div className={`flex h-[260px] min-h-0 flex-col rounded-md border p-3 ${color}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <span className="font-semibold">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
        {items.map((customer) => (
          <button
            key={customer.id}
            onClick={() => onPick(customer)}
            className="w-full rounded-md border bg-card/80 p-2 text-left text-sm hover:bg-card"
          >
            <div className="flex justify-between">
              <b>{fullCustomerName(customer)}</b>
              <span className="font-mono text-xs text-muted-foreground">{customer.id}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span>{customer.phone}</span>
              <b>{formatSom(customer.currentDebt)}</b>
            </div>
          </button>
        ))}
        {items.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground">—</div>
        )}
      </div>
    </div>
  );
}
