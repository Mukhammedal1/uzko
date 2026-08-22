import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PeriodFilter, type PeriodFilterValue } from "@/components/shared/PeriodFilter";
import {
  Banknote,
  Plus,
  Minus,
  CreditCard,
  DollarSign,
  Tag,
  Send,
  Trash2,
  ChevronDown,
  Search,
  UserRound,
  ReceiptText,
} from "lucide-react";
import {
  MOCK_WITHDRAWALS,
  MOCK_SUPPLIER_REPORTS,
  MOCK_EMPLOYEES,
  formatSom,
  type Currency,
  type CashWithdrawal,
  type Employee,
} from "@/lib/mock-data";
import { useApp } from "@/lib/app-context";
import { dispatchReceiptMessage } from "@/lib/data-actions";
import { toast } from "sonner";

const CURRENCIES: Currency[] = ["USD", "EUR", "RUB"];
const CARD_TYPES = ["Humo", "Uzcard", "Visa"] as const;

export function KassadanPulChiqarish() {
  const { settings, updateSettings, t } = useApp();
  const categories = React.useMemo(
    () => (settings.expenseCategories ?? []).map((c) => c.name),
    [settings.expenseCategories],
  );
  const [category, setCategory] = React.useState<string>(categories[0] ?? "Boshqa");
  const [newCat, setNewCat] = React.useState("");
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [cash, setCash] = React.useState("");
  const [cards, setCards] = React.useState<{ type: string; amount: string }[]>([
    { type: "Humo", amount: "" },
  ]);
  const [currs, setCurrs] = React.useState<{ code: Currency; amount: string }[]>([
    { code: "USD", amount: "" },
  ]);
  const [note, setNote] = React.useState("");
  const [agentId, setAgentId] = React.useState("");
  const [employeeQuery, setEmployeeQuery] = React.useState("");
  const [employeeId, setEmployeeId] = React.useState("");
  const [employeeHistoryOpen, setEmployeeHistoryOpen] = React.useState(false);
  const optionScrollRef = React.useRef<HTMLDivElement | null>(null);

  const isAgentCategory = category.toLowerCase().includes("agent");
  const isEmployeeCategory = isEmployeeExpenseCategory(category);
  const selectedEmployee = React.useMemo(
    () => MOCK_EMPLOYEES.find((employee) => employee.id === employeeId) ?? null,
    [employeeId],
  );
  const employeeSuggestions = React.useMemo(() => {
    const query = employeeQuery.trim().toLowerCase();
    const rows = query
      ? MOCK_EMPLOYEES.filter((employee) =>
          `${employee.id} ${employee.name} ${employee.role} ${employee.phone ?? ""}`
            .toLowerCase()
            .includes(query),
        )
      : MOCK_EMPLOYEES;
    return rows.slice(0, 6);
  }, [employeeQuery]);
  const agents = React.useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; phone?: string; botEnabled: boolean; remainingDebt: number }
    >();
    MOCK_SUPPLIER_REPORTS.forEach((row) => {
      if (!row.agentId) return;
      const old = map.get(row.agentId);
      map.set(row.agentId, {
        id: row.agentId,
        name: row.agentName || "Nomsiz agent",
        phone: row.agentPhone,
        botEnabled: (old?.botEnabled ?? false) || Boolean(row.botEnabled),
        remainingDebt: (old?.remainingDebt ?? 0) + (row.remainingDebt || 0),
      });
    });
    return Array.from(map.values());
  }, []);
  const selectedAgent = React.useMemo(
    () => agents.find((agent) => agent.id === agentId) ?? null,
    [agentId, agents],
  );

  React.useEffect(() => {
    if (!categories.includes(category) && categories.length > 0) setCategory(categories[0]);
  }, [categories, category]);

  React.useEffect(() => {
    if (!isEmployeeCategory) {
      setEmployeeId("");
      setEmployeeQuery("");
      setEmployeeHistoryOpen(false);
    }
  }, [isEmployeeCategory]);

  React.useEffect(() => {
    const el = optionScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [cards.length, currs.length]);

  const sum = (rows: { amount: string }[]) =>
    rows.reduce((s, row) => s + (parseFloat(row.amount) || 0), 0);
  const total = (parseFloat(cash) || 0) + sum(cards) + sum(currs);

  const addCategory = () => {
    const v = newCat.trim();
    if (!v) return;
    if (!categories.map((c) => c.toLowerCase()).includes(v.toLowerCase())) {
      updateSettings({
        expenseCategories: [
          ...settings.expenseCategories,
          { id: `ec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: v },
        ],
      });
      setCategory(v);
      toast.success(t("saved"));
    }
    setNewCat("");
  };

  const deleteCategory = (value: string) => {
    const next = settings.expenseCategories.filter((c) => c.name !== value);
    updateSettings({ expenseCategories: next });
    if (category === value) setCategory(next[0]?.name ?? "");
    toast.success(t("saved"));
  };

  const submit = () => {
    if (total <= 0) {
      toast.error("Summa kiriting");
      return;
    }
    if (isAgentCategory && !agentId.trim()) {
      toast.error("Agent tanlash shart");
      return;
    }
    if (isEmployeeCategory && !selectedEmployee) {
      toast.error("Xodim tanlash shart");
      return;
    }
    const w: CashWithdrawal = {
      id: `WD-${Date.now()}`,
      date: new Date().toISOString(),
      cashier: "Joriy foydalanuvchi",
      category,
      cash: parseFloat(cash) || 0,
      cardAmount: sum(cards),
      currencies: currs.map((c) => ({ code: c.code, amount: parseFloat(c.amount) || 0 })),
      note,
      agentId: isAgentCategory ? agentId.trim() : undefined,
      employeeId: isEmployeeCategory ? selectedEmployee?.id : undefined,
      employeeName: isEmployeeCategory ? selectedEmployee?.name : undefined,
    };
    MOCK_WITHDRAWALS.push(w);
    if (isAgentCategory && selectedAgent?.botEnabled) {
      dispatchReceiptMessage({
        recipientCategory: "agent",
        recipientId: selectedAgent.id,
        recipientName: selectedAgent.name,
        phone: selectedAgent.phone,
        receiptId: w.id,
        title: "Agentga to'lov",
        total,
        note: `Agent kodi: ${selectedAgent.id}${note.trim() ? ` · ${note.trim()}` : ""}`,
      });
    }
    toast.success("Pul chiqarildi", { description: `${category}: ${formatSom(total)}` });
    setCash("");
    setCards([{ type: "Humo", amount: "" }]);
    setCurrs([{ code: "USD", amount: "" }]);
    setNote("");
    setAgentId("");
    setEmployeeId("");
    setEmployeeQuery("");
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-3">
      <div ref={optionScrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <div className="grid min-h-full w-full grid-cols-2 gap-3">
          {/* Sol: Kategoriya + Summa */}
          <div className="grid min-h-0 content-start gap-3">
            {/* Kategoriya tanlash */}
            <div className="rounded-lg border bg-card p-3">
              <div className="mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Kategoriya</Label>
              </div>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full justify-between px-3 font-normal"
                  >
                    <span className="truncate">{category || "Kategoriya tanlang"}</span>
                    <ChevronDown className="h-4 w-4 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1">
                  <div className="max-h-64 overflow-y-auto pr-1">
                    {categories.map((c) => (
                      <div
                        key={c}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left text-sm font-medium"
                          onClick={() => {
                            setCategory(c);
                            if (!c.toLowerCase().includes("agent")) setAgentId("");
                            if (!isEmployeeExpenseCategory(c)) {
                              setEmployeeId("");
                              setEmployeeQuery("");
                            }
                            setCategoryOpen(false);
                          }}
                        >
                          {c}
                        </button>
                        <button
                          type="button"
                          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-input bg-background text-destructive hover:text-destructive disabled:opacity-40"
                          disabled={categories.length <= 1}
                          title="Kategoriya o'chirish"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteCategory(c);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {isAgentCategory && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <Label className="mb-1.5 block text-xs font-semibold">Agent tanlang *</Label>
                  <Select value={agentId} onValueChange={setAgentId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Agentni ro'yxatdan tanlang" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex flex-col py-0.5">
                            <span className="font-semibold">
                              {agent.id} — {agent.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {agent.phone || "Raqam yo'q"} · Qolgan qarz:{" "}
                              {formatSom(agent.remainingDebt)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {agents.length === 0 ? (
                    <div className="mt-2 text-[11px] text-destructive">
                      Hali agent qo'shilmagan. Agentlar Tovar qo'shishdagi “Qayerdan keldi”
                      bo'limidan yaratiladi.
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Agent ID qo'lda yozilmaydi — bazadagi agentlar ro'yxatidan tanlanadi.
                    </div>
                  )}
                </div>
              )}
              {isEmployeeCategory && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-primary" />
                    <Label className="text-xs font-semibold">
                      Xodim ID yoki ism orqali qidirish *
                    </Label>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={employeeQuery}
                      onChange={(event) => {
                        setEmployeeQuery(event.target.value);
                        setEmployeeId("");
                      }}
                      placeholder="Masalan: X-001 yoki Akmal"
                      className="h-9 bg-background pl-9"
                    />
                    {employeeQuery && !selectedEmployee && (
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-lg">
                        {employeeSuggestions.map((employee) => (
                          <button
                            key={employee.id}
                            type="button"
                            onClick={() => {
                              setEmployeeId(employee.id);
                              setEmployeeQuery(`${employee.id} — ${employee.name}`);
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                          >
                            <span className="font-semibold">
                              {employee.id} — {employee.name}
                            </span>
                            <span className="text-xs text-muted-foreground">{employee.role}</span>
                          </button>
                        ))}
                        {employeeSuggestions.length === 0 && (
                          <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                            Xodim topilmadi
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedEmployee && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2">
                      <InfoPill label="ID" value={selectedEmployee.id} />
                      <InfoPill label="Ism" value={selectedEmployee.name} wide />
                      <InfoPill label="Lavozim" value={selectedEmployee.role} />
                      <InfoPill label="Oylik" value={formatSom(selectedEmployee.monthlySalary)} />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="ml-auto h-9 w-9 shrink-0 text-primary"
                        title="Xodim chiqimlari tarixi"
                        onClick={() => setEmployeeHistoryOpen(true)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {/* Yangi kategoriya */}
              <div className="mt-3 flex gap-2 border-t pt-3">
                <Input
                  placeholder="Yangi kategoriya qo'shish..."
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  className="flex-1"
                />
                <Button variant="outline" onClick={addCategory} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Qo'shish
                </Button>
              </div>
            </div>

            {/* Naqd + Kartalar */}
            <div className="space-y-2 rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">To'lov summasi</Label>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Naqd pul (so'm)
                </Label>
                <Input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder="0"
                  className="text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">Kartalar (so'm)</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1"
                    onClick={() =>
                      setCards((current) => [...current, { type: "Humo", amount: "" }])
                    }
                  >
                    <Plus className="h-3.5 w-3.5" /> Qo'shish
                  </Button>
                </div>
                <div className="space-y-2">
                  {cards.map((card, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <Select
                        value={card.type}
                        onValueChange={(value) =>
                          setCards(
                            cards.map((item, idx) =>
                              idx === index ? { ...item, type: value } : item,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="w-28">
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
                      <Input
                        type="number"
                        value={card.amount}
                        onChange={(event) =>
                          setCards(
                            cards.map((item, idx) =>
                              idx === index ? { ...item, amount: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="0"
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setCards(cards.filter((_, idx) => idx !== index))}
                        disabled={cards.length <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Valyuta */}
            <div className="space-y-2 rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">Valyuta</Label>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1"
                  onClick={() => setCurrs((current) => [...current, { code: "USD", amount: "" }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Qo'shish
                </Button>
              </div>
              <div className="space-y-2">
                {currs.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={c.code}
                      onValueChange={(v) =>
                        setCurrs(
                          currs.map((x, idx) => (idx === i ? { ...x, code: v as Currency } : x)),
                        )
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((cc) => (
                          <SelectItem key={cc} value={cc}>
                            {cc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Summa"
                      value={c.amount}
                      onChange={(e) =>
                        setCurrs(
                          currs.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x)),
                        )
                      }
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setCurrs(currs.filter((_, idx) => idx !== i))}
                      disabled={currs.length <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* O'ng: Izoh + Tasdiqlash */}
          <div className="grid min-h-0 content-start gap-3">
            {/* Jami KPI */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Chiqarilayotgan jami
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-primary">
                {formatSom(total)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Kategoriya: <span className="font-medium text-foreground">{category}</span>
              </div>
            </div>

            {/* Izoh */}
            <div className="rounded-lg border bg-card p-3">
              <Label className="mb-2 block text-sm font-semibold">Izoh</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Ixtiyoriy izoh..."
              />
            </div>

            <div className="rounded-lg border bg-card p-3">
              <Button onClick={submit} className="w-full gap-2 px-3">
                <Send className="h-4 w-4" />
                Tasdiqlash
              </Button>
            </div>
          </div>
        </div>
      </div>
      <EmployeeHistoryDialog
        open={employeeHistoryOpen}
        onOpenChange={setEmployeeHistoryOpen}
        employee={selectedEmployee}
      />
    </div>
  );
}

function InfoPill({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div
      className={`rounded-md border bg-muted/20 px-2.5 py-1.5 ${wide ? "min-w-[170px] flex-1" : ""}`}
    >
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function EmployeeHistoryDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}) {
  const [period, setPeriod] = React.useState<PeriodFilterValue>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setPeriod("all");
      setFrom("");
      setTo("");
    }
  }, [open]);

  const rows = React.useMemo(() => {
    if (!employee) return [];
    return MOCK_WITHDRAWALS.filter((row) => row.employeeId === employee.id)
      .filter((row) => inDateRange(row.date, period, from, to))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [employee, period, from, to]);

  const total = rows.reduce((sum, row) => sum + withdrawalTotal(row), 0);

  return (
    <Dialog open={open && !!employee} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            {employee ? `${employee.name} — chiqimlar tarixi` : "Xodim tarixi"}
          </DialogTitle>
        </DialogHeader>

        {employee && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
              <InfoPill label="ID" value={employee.id} />
              <InfoPill label="Lavozim" value={employee.role} />
              <InfoPill label="Telefon" value={employee.phone || "-"} />
              <InfoPill label="Jami chiqim" value={formatSom(total)} wide />
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
              <PeriodFilter
                value={period}
                onValueChange={setPeriod}
                from={from}
                to={to}
                onFromChange={setFrom}
                onToChange={setTo}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPeriod("all");
                  setFrom("");
                  setTo("");
                }}
              >
                Tozalash
              </Button>
            </div>

            <div className="max-h-[48dvh] overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/70 backdrop-blur">
                  <tr className="text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 text-left">Chek</th>
                    <th className="px-3 py-2 text-left">Kategoriya</th>
                    <th className="px-3 py-2 text-right">Summa</th>
                    <th className="px-3 py-2 text-left">Izoh</th>
                    <th className="px-3 py-2 text-left">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {row.category}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatSom(withdrawalTotal(row))}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{row.note || "-"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(row.date).toLocaleString("uz-UZ")}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                        Bu davr bo'yicha chiqim yo'q
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function isEmployeeExpenseCategory(category: string) {
  const value = category.toLowerCase();
  return value.includes("oylik") || value.includes("avans") || value.includes("premya");
}

function withdrawalTotal(row: CashWithdrawal) {
  return (
    row.cash + row.cardAmount + row.currencies.reduce((sum, currency) => sum + currency.amount, 0)
  );
}

const historyNow = new Date("2026-05-07T12:00:00");

function inDateRange(date: string, period: PeriodFilterValue, from: string, to: string) {
  const value = new Date(date);
  let start: Date | null = null;
  let end: Date | null = null;

  if (period === "today") {
    start = new Date(historyNow);
    start.setHours(0, 0, 0, 0);
    end = new Date(historyNow);
    end.setHours(23, 59, 59, 999);
  }
  if (period === "week") {
    start = startOfWeek(historyNow);
    end = new Date(historyNow);
    end.setHours(23, 59, 59, 999);
  }
  if (period === "month") {
    start = new Date(historyNow.getFullYear(), historyNow.getMonth(), 1);
    end = new Date(historyNow);
    end.setHours(23, 59, 59, 999);
  }
  if (period === "year") {
    start = new Date(historyNow.getFullYear(), 0, 1);
    end = new Date(historyNow);
    end.setHours(23, 59, 59, 999);
  }
  if (period === "custom") {
    if (from) start = new Date(`${from}T00:00:00`);
    if (to) end = new Date(`${to}T23:59:59`);
  }

  if (start && value < start) return false;
  if (end && value > end) return false;
  return true;
}

function startOfWeek(date: Date) {
  const value = new Date(date);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  value.setHours(0, 0, 0, 0);
  return value;
}
