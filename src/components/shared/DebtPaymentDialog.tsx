import * as React from "react";
import { Banknote, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  allocatePayment,
  r4,
  systemSuggestedRate,
  type Allocation,
  type RatePair,
} from "@/lib/debt-payment";
import {
  getOpenCustomerDebts,
  getOpenSupplierDebts,
  settleDebtPayment,
  type OpenDebt,
} from "@/lib/data-actions";
import { formatMoney, MOCK_RATES } from "@/lib/mock-data";
import { useApp } from "@/lib/app-context";
import { formatNumberInput, parseNumberInput } from "@/lib/utils";
import { useTabSkipSelects } from "@/hooks/use-tab-skip-selects";

export type DebtPaymentParty = {
  id: string;
  name: string;
  phone?: string;
  botEnabled?: boolean;
};

export type DebtPaymentDialogResult = {
  allocations: Allocation[];
  moneyLines: { currency: string; amount: number }[];
  leftovers: { currency: string; amount: number; action: "avans" | "qaytim" }[];
  rates: { moneyCurrency: string; debtCurrency: string; rate: number }[];
  selectedDebtIds: string[];
  totalClosed: number;
  /** Faqat partyType === "supplier" uchun. */
  outflowSource?: "kassa" | "boshqa";
  note?: string;
};

type Props = {
  partyType: "supplier" | "customer";
  party: DebtPaymentParty | null;
  /** Berilsa — shu ro'yxat ishlatiladi (masalan hali saqlanmagan prixod qarzi);
   * checkboxli tanlov ko'rsatilmaydi, chunki odatda bitta qarz bo'ladi. */
  debts?: OpenDebt[];
  title?: string;
  /** Sarlavha ostida qo'shimcha kontent (masalan prixoddagi tovarlar ro'yxati). */
  headerExtra?: React.ReactNode;
  /** true — summa kiritmasdan ham saqlash mumkin (butun summa qarzga yoziladi). Standart: false. */
  allowZeroPayment?: boolean;
  onClose: () => void;
  onDone: () => void;
  /** Berilsa, standart `settleDebtPayment()` o'rniga shu chaqiriladi — mock-data'ga
   * yozishni tashqi tomon o'zi bajaradi (masalan tovar prixodi oqimi). */
  onSettle?: (result: DebtPaymentDialogResult) => { ok: true } | { ok: false; error: string };
};

type MoneyLineState = { id: string; currency: string; amount: string };

function pairKey(pair: RatePair) {
  return `${pair.moneyCurrency}__${pair.debtCurrency}`;
}

function nextId() {
  return Math.random().toString(36).slice(2, 9);
}

/** Kurs inputi uchun — kattaroq kurslarda 2, kichiklarida 6 xonagacha. */
function formatRateForInput(rate: number) {
  if (!Number.isFinite(rate)) return "";
  const factor = rate >= 1 ? 100 : 1_000_000;
  return formatNumberInput(String(Math.round(rate * factor) / factor));
}

export function DebtPaymentDialog({
  partyType,
  party,
  debts: debtsOverride,
  title,
  headerExtra,
  allowZeroPayment = false,
  onClose,
  onDone,
  onSettle,
}: Props) {
  const { settings } = useApp();
  const currencies = settings.currencies.length > 0 ? settings.currencies : ["UZS", "USD"];

  const [moneyLines, setMoneyLines] = React.useState<MoneyLineState[]>([
    { id: nextId(), currency: "UZS", amount: "" },
  ]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [rateOverrides, setRateOverrides] = React.useState<Record<string, string>>({});
  const [leftoverActions, setLeftoverActions] = React.useState<Record<string, "avans" | "qaytim">>(
    {},
  );
  const [outflowSource, setOutflowSource] = React.useState<"kassa" | "boshqa">("kassa");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const containerRef = useTabSkipSelects<HTMLDivElement>();

  React.useEffect(() => {
    if (!party) return;
    setMoneyLines([{ id: nextId(), currency: "UZS", amount: "" }]);
    setSelectedIds(new Set());
    setRateOverrides({});
    setLeftoverActions({});
    setOutflowSource("kassa");
    setNote("");
    setError(null);
    // Faqat `party.id` ga qarab — chaqiruvchi tomonda `party` obyekti har safar
    // qayta yaratilsa ham (yangi reference), bu effekt foydalanuvchi kiritayotgan
    // qiymatlarni noto'g'ri vaqtda tozalab yubormasligi uchun.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party?.id]);

  if (!party) return null;

  const allDebts: OpenDebt[] =
    debtsOverride ??
    (partyType === "supplier" ? getOpenSupplierDebts(party.id) : getOpenCustomerDebts(party.id));
  const showSelection = !debtsOverride && allDebts.length > 1;

  const selectedDebts =
    selectedIds.size > 0 ? allDebts.filter((d) => selectedIds.has(d.id)) : allDebts;
  const unselectedRemaining = allDebts.filter(
    (d) => selectedIds.size > 0 && !selectedIds.has(d.id),
  );

  const activeMoneyLines = moneyLines
    .map((l) => ({ ...l, amountNum: Math.max(0, parseNumberInput(l.amount)) }))
    .filter((l) => l.amountNum > 0);

  const rateOf = (pair: RatePair): number | undefined => {
    const override = rateOverrides[pairKey(pair)];
    if (override) {
      const n = parseNumberInput(override);
      if (n > 0) return n;
    }
    return systemSuggestedRate(MOCK_RATES, pair);
  };

  const allocation = allocatePayment({
    debts: selectedDebts.map((d) => ({ id: d.id, currency: d.currency, amount: d.amount })),
    moneyLines: activeMoneyLines.map((l) => ({
      id: l.id,
      currency: l.currency,
      amount: l.amountNum,
    })),
    rateOf,
  });

  const usedCurrencies = new Set(moneyLines.map((l) => l.currency));
  const availableCurrencies = currencies.filter((c) => !usedCurrencies.has(c));

  const addMoneyLine = () => {
    const currency = availableCurrencies[0];
    if (!currency) return;
    setMoneyLines((lines) => [...lines, { id: nextId(), currency, amount: "" }]);
  };
  const removeMoneyLine = (id: string) => {
    setMoneyLines((lines) => (lines.length > 1 ? lines.filter((l) => l.id !== id) : lines));
  };
  const updateMoneyLine = (id: string, patch: Partial<MoneyLineState>) => {
    setMoneyLines((lines) => lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const toggleDebt = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closedByDebt = new Map<string, number>();
  const breakdownByDebt = new Map<string, { currency: string; amount: number }[]>();
  for (const a of allocation.allocations) {
    closedByDebt.set(a.debtId, (closedByDebt.get(a.debtId) ?? 0) + a.closed);
    const moneyLine = activeMoneyLines.find((l) => l.id === a.moneyLineId);
    if (!moneyLine) continue;
    const list = breakdownByDebt.get(a.debtId) ?? [];
    list.push({ currency: moneyLine.currency, amount: a.spent });
    breakdownByDebt.set(a.debtId, list);
  }

  const leftoverLines = activeMoneyLines
    .map((l) => ({ currency: l.currency, amount: r4(allocation.moneyLeftover[l.id] ?? 0) }))
    .filter((l) => l.amount > 0);

  const canSave =
    !allocation.bad &&
    (activeMoneyLines.length > 0 || allowZeroPayment) &&
    allDebts.length > 0 &&
    leftoverLines.every((l) => Boolean(leftoverActions[l.currency]));

  const dialogTitle = title ?? "Qarzni to'lash";
  const modeLabel =
    selectedIds.size > 0 ? "1-rejim: tanlangan qarzlar" : "2-rejim: avtomatik taqsimlash";

  const handleSave = () => {
    if (activeMoneyLines.length === 0 && !allowZeroPayment) {
      setError("Summa kiriting");
      return;
    }
    if (allDebts.length === 0) {
      setError("Ochiq qarz topilmadi");
      return;
    }
    if (allocation.bad) {
      setError("Kursni kiriting");
      return;
    }
    for (const l of leftoverLines) {
      if (!leftoverActions[l.currency]) {
        setError(`Ortiqcha ${l.currency} uchun qaror tanlang`);
        return;
      }
    }

    const rates = allocation.requiredPairs.map((pair) => ({
      moneyCurrency: pair.moneyCurrency,
      debtCurrency: pair.debtCurrency,
      rate: rateOf(pair) ?? 0,
    }));
    const leftovers = leftoverLines.map((l) => ({
      currency: l.currency,
      amount: l.amount,
      action: leftoverActions[l.currency] ?? "avans",
    }));
    const totalClosed = Array.from(closedByDebt.values()).reduce((a, b) => a + b, 0);

    if (onSettle) {
      const result = onSettle({
        allocations: allocation.allocations,
        moneyLines: activeMoneyLines.map((l) => ({ currency: l.currency, amount: l.amountNum })),
        leftovers,
        rates,
        selectedDebtIds: Array.from(selectedIds),
        totalClosed,
        outflowSource: partyType === "supplier" ? outflowSource : undefined,
        note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
      onClose();
      return;
    }

    const result = settleDebtPayment({
      partyType,
      partyId: party.id,
      partyName: party.name,
      partyPhone: party.phone,
      botEnabled: party.botEnabled,
      cashier: settings.username,
      selectedDebtIds: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
      moneyLines: activeMoneyLines.map((l) => ({ currency: l.currency, amount: l.amountNum })),
      rates,
      leftovers,
      outflowSource: partyType === "supplier" ? outflowSource : undefined,
      note,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("To'lov saqlandi. Kurslar to'lov bilan birga muzlatildi.");
    onDone();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        ref={containerRef}
        className="flex max-h-[90dvh] max-w-2xl flex-col gap-4 overflow-y-auto"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            {dialogTitle} — {party.name}
          </DialogTitle>
          <div className="text-xs text-muted-foreground">{modeLabel}</div>
        </DialogHeader>

        {headerExtra}

        <section className="space-y-2">
          <Label className="text-xs font-medium">Berilgan pul</Label>
          {moneyLines.map((line) => (
            <div key={line.id} className="flex items-center gap-2">
              <Select
                value={line.currency}
                onValueChange={(v) => updateMoneyLine(line.id, { currency: v })}
              >
                <SelectTrigger data-tab-skip tabIndex={-1} className="h-9 w-24 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[line.currency, ...availableCurrencies.filter((c) => c !== line.currency)].map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Input
                value={line.amount}
                onChange={(e) =>
                  updateMoneyLine(line.id, { amount: formatNumberInput(e.target.value) })
                }
                inputMode="decimal"
                placeholder="0"
                className="h-9 text-right text-sm"
                autoFocus={moneyLines[0].id === line.id}
              />
              {moneyLines.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-destructive hover:bg-destructive/10"
                  onClick={() => removeMoneyLine(line.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {availableCurrencies.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={addMoneyLine}
            >
              <Plus className="h-3.5 w-3.5" />
              Valyuta qo'shish
            </Button>
          )}
        </section>

        {allDebts.length === 0 && <p className="text-sm text-muted-foreground">Ochiq qarz yo'q.</p>}

        {showSelection && (
          <section className="space-y-1">
            <Label className="text-xs font-medium">Qarzlar</Label>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="w-8 p-2" />
                    <th className="p-2 text-right">Qoldiq</th>
                    <th className="p-2 text-right">Yopiladi</th>
                    <th className="p-2 text-right">Qoladi</th>
                  </tr>
                </thead>
                <tbody>
                  {allDebts.map((debt) => {
                    const included = selectedIds.size === 0 || selectedIds.has(debt.id);
                    const closed = closedByDebt.get(debt.id) ?? 0;
                    const breakdown = breakdownByDebt.get(debt.id) ?? [];
                    const remaining = included
                      ? (allocation.debtRemaining[debt.id] ?? debt.amount)
                      : debt.amount;
                    return (
                      <tr key={debt.id} className="border-t">
                        <td className="p-2">
                          <Checkbox
                            checked={selectedIds.has(debt.id)}
                            onCheckedChange={() => toggleDebt(debt.id)}
                          />
                        </td>
                        <td className="p-2 text-right">
                          {formatMoney(debt.amount, debt.currency)}
                        </td>
                        <td className="p-2 text-right">
                          {included && closed > 0 ? (
                            <div>
                              <div>{formatMoney(closed, debt.currency)}</div>
                              {breakdown.map((b, i) => (
                                <div key={i} className="text-muted-foreground">
                                  ← {formatMoney(b.amount, b.currency)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {remaining <= 0 ? (
                            <span className="font-medium text-success">yopildi</span>
                          ) : (
                            formatMoney(remaining, debt.currency)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Qarzni belgilasangiz, pul faqat belgilanganlardan ayriladi. Hech narsa belgilanmasa,
              tizim o'zi taqsimlaydi: avval bir xil valyuta, keyin kurs bo'yicha.
            </p>
            {unselectedRemaining.length > 0 && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setSelectedIds(new Set())}
              >
                Boshqa qarzni ham yopish
              </Button>
            )}
          </section>
        )}

        {allocation.requiredPairs.length > 0 && (
          <section className="space-y-2 rounded-lg border p-3">
            <Label className="text-xs font-medium">Kerakli kurslar (faqat shu to'lov uchun)</Label>
            {allocation.requiredPairs.map((pair) => {
              const key = pairKey(pair);
              const sysRate = systemSuggestedRate(MOCK_RATES, pair);
              const override = rateOverrides[key];
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="whitespace-nowrap">1 {pair.moneyCurrency} =</span>
                  <Input
                    value={override ?? (sysRate ? formatRateForInput(sysRate) : "")}
                    onChange={(e) =>
                      setRateOverrides((r) => ({ ...r, [key]: formatNumberInput(e.target.value) }))
                    }
                    inputMode="decimal"
                    className="h-8 w-32 text-right text-sm"
                  />
                  <span className="whitespace-nowrap">{pair.debtCurrency}</span>
                  <span className="text-xs text-muted-foreground">
                    {override
                      ? `O'zgartirildi. Tizim kursi: ${sysRate ? formatRateForInput(sysRate) : "—"}`
                      : "Tizim kursi"}
                  </span>
                </div>
              );
            })}
          </section>
        )}

        {!allocation.bad && leftoverLines.length > 0 && (
          <section className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            {leftoverLines.map((l) => (
              <div key={l.currency} className="space-y-1">
                <div className="text-sm font-medium">
                  Ortiqcha {formatMoney(l.amount, l.currency)}
                </div>
                <RadioGroup
                  value={leftoverActions[l.currency] ?? "avans"}
                  onValueChange={(v) =>
                    setLeftoverActions((a) => ({ ...a, [l.currency]: v as "avans" | "qaytim" }))
                  }
                  className="flex gap-4"
                >
                  <label className="flex items-center gap-1.5 text-xs">
                    <RadioGroupItem value="avans" />
                    Avans sifatida qoldirish
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <RadioGroupItem value="qaytim" />
                    Qaytim berish
                  </label>
                </RadioGroup>
              </div>
            ))}
          </section>
        )}

        {partyType === "supplier" && (
          <section className="space-y-1">
            <Label className="text-xs font-medium">Pul manbasi</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={outflowSource === "kassa" ? "default" : "outline"}
                onClick={() => setOutflowSource("kassa")}
                className="h-8"
                data-tab-skip
              >
                Kassadan
              </Button>
              <Button
                type="button"
                size="sm"
                variant={outflowSource === "boshqa" ? "default" : "outline"}
                onClick={() => setOutflowSource("boshqa")}
                className="h-8"
                data-tab-skip
              >
                Ixtiyoriy manba
              </Button>
            </div>
          </section>
        )}

        <section>
          <Label className="mb-1 block text-xs font-medium">Izoh</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ixtiyoriy izoh"
            className="h-9 text-sm"
          />
        </section>

        {activeMoneyLines.length > 0 && (
          <section className="space-y-1 rounded-lg bg-muted/20 p-3 text-xs">
            {activeMoneyLines.map((l) => {
              const spentOnDebts = allocation.allocations
                .filter((a) => a.moneyLineId === l.id)
                .reduce((sum, a) => sum + a.spent, 0);
              const leftover = r4(allocation.moneyLeftover[l.id] ?? 0);
              const action = leftoverActions[l.currency];
              return (
                <div key={l.id}>
                  Berilgan {formatMoney(l.amountNum, l.currency)} — qarzga{" "}
                  {formatMoney(spentOnDebts, l.currency)}
                  {leftover > 0 && (
                    <>
                      {" "}
                      · ortiqcha {formatMoney(leftover, l.currency)} →{" "}
                      {action === "qaytim" ? "qaytim" : "avans"}
                    </>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {error && <p className="text-xs font-medium text-destructive">{error}</p>}

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} data-tab-skip>
            Bekor qilish
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="gap-2" data-tab-skip>
            <Banknote className="h-4 w-4" />
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
